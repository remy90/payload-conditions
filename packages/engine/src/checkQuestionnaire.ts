import {
  operatorsFor,
  type Condition,
  type Question,
  type Questionnaire,
  type QuestionnaireIssue,
} from './types.js'

type Constraints = {
  equals?: string
  notEquals: Set<string>
  inside: Set<string>
  outside: Set<string>
}

function contradicts(condition: Condition, constraints: Map<string, Constraints>): boolean {
  let state = constraints.get(condition.questionId)
  if (!state) {
    state = { notEquals: new Set(), inside: new Set(), outside: new Set() }
    constraints.set(condition.questionId, state)
  }
  const answer = condition.answerId
  switch (condition.operator) {
    case 'equals': {
      const conflict =
        (state.equals !== undefined && state.equals !== answer) || state.notEquals.has(answer)
      state.equals = answer
      return conflict
    }
    case 'not_equals':
      state.notEquals.add(answer)
      return state.equals === answer
    case 'in':
      state.inside.add(answer)
      return state.outside.has(answer)
    case 'not_in':
      state.outside.add(answer)
      return state.inside.has(answer)
    default:
      return false
  }
}

export function checkQuestionnaire(questionnaire: Questionnaire): QuestionnaireIssue[] {
  const issues: QuestionnaireIssue[] = []
  if (!questionnaire.pages.length) issues.push({ code: 'noPages', message: 'Add a page.' })
  if (!questionnaire.title.trim())
    issues.push({ code: 'blankText', message: 'Enter a questionnaire title.' })
  const names = new Set<string>()
  const ids = new Set<string>()
  const sources = new Map<
    string,
    { question: Question; pagePosition: number; optionIds: Set<string> }
  >()
  function checkId(id: string, location: Omit<QuestionnaireIssue, 'code' | 'message'>) {
    if (ids.has(id))
      issues.push({
        code: 'duplicateId',
        message: 'Ids must be unique across pages, questions and options.',
        ...location,
      })
    ids.add(id)
  }
  for (const [pagePosition, page] of questionnaire.pages.entries()) {
    const location = { pageId: page.id }
    checkId(page.id, location)
    if (!page.questions.length)
      issues.push({ code: 'emptyPage', message: 'Add a question.', ...location })
    if (page.title !== undefined && !page.title.trim()) {
      issues.push({ code: 'blankText', message: 'Enter a page title.', ...location })
    }
    for (const question of page.questions) {
      const location = { pageId: page.id, questionId: question.id }
      checkId(question.id, location)
      const answer = question.answer
      const options =
        answer.type === 'yesNo'
          ? [answer.yes, answer.no]
          : answer.type === 'choice'
            ? answer.options
            : []
      if (!sources.has(question.id))
        sources.set(question.id, {
          question,
          pagePosition,
          optionIds: new Set(options.map((option) => option.id)),
        })
      const labels = new Set<string>()
      for (const option of options) {
        const optionLocation = { ...location, optionId: option.id }
        checkId(option.id, optionLocation)
        const label = option.label.trim().toLowerCase()
        if (!label)
          issues.push({ code: 'blankText', message: 'Enter an option label.', ...optionLocation })
        if (labels.has(label))
          issues.push({
            code: 'duplicateOptionLabel',
            message: 'Option labels must be unique within a question.',
            ...optionLocation,
          })
        labels.add(label)
      }
      if (names.has(question.name))
        issues.push({
          code: 'duplicateName',
          message: 'Question names must be unique.',
          ...location,
        })
      names.add(question.name)
      if (!/^[a-z][a-z0-9_]*$/.test(question.name))
        issues.push({
          code: 'invalidName',
          message:
            'Use a lowercase name starting with a letter, followed by letters, digits or underscores.',
          ...location,
        })
      if (!question.label.trim())
        issues.push({ code: 'blankText', message: 'Enter a question label.', ...location })
    }
    for (const group of page.conditionGroups) {
      if (!group.conditions.length)
        issues.push({
          code: 'emptyGroup',
          message: 'Add a condition.',
          ...location,
          ...(group.id === undefined ? {} : { groupId: group.id }),
        })
    }
  }
  const unreachable = new Set<number>()
  // This conservative forward pass keeps constraints in separate groups independent.
  // It does not combine constraints across groups or infer other impossible answers.
  for (const [pagePosition, page] of questionnaire.pages.entries()) {
    const impossibleGroups: boolean[] = []
    for (const group of page.conditionGroups) {
      if (!group.conditions.length) continue
      const constraints = new Map<string, Constraints>()
      let contradiction = false
      let blockedSources = group.match === 'any'
      for (const condition of group.conditions) {
        const location = {
          pageId: page.id,
          questionId: condition.questionId,
          ...(group.id === undefined ? {} : { groupId: group.id }),
          ...(condition.id === undefined ? {} : { conditionId: condition.id }),
        }
        if (group.match === 'all' && contradicts(condition, constraints)) {
          contradiction = true
          issues.push({
            code: 'contradiction',
            message: 'These conditions cannot all match.',
            ...location,
          })
        }
        const source = sources.get(condition.questionId)
        const blocked = source !== undefined && unreachable.has(source.pagePosition)
        if (group.match === 'all' && blocked) blockedSources = true
        if (group.match === 'any' && !blocked) blockedSources = false
        if (!source) {
          issues.push({
            code: 'unknownQuestion',
            message: 'The source question does not exist.',
            ...location,
          })
          continue
        }
        if (source.pagePosition === pagePosition)
          issues.push({
            code: 'samePageQuestion',
            message: 'Choose a question on an earlier page.',
            ...location,
          })
        if (source.pagePosition > pagePosition)
          issues.push({
            code: 'laterQuestion',
            message: 'Choose a question on an earlier page.',
            ...location,
          })
        if (source.question.answer.type === 'text') {
          issues.push({
            code: 'unsupportedSource',
            message: 'Text questions cannot control page visibility.',
            ...location,
          })
          continue
        }
        if (!source.optionIds.has(condition.answerId))
          issues.push({
            code: 'unknownAnswer',
            message: 'The source option does not exist.',
            ...location,
          })
        if (!operatorsFor(source.question.answer).includes(condition.operator))
          issues.push({
            code: 'operatorMismatch',
            message: 'Choose an operator supported by the source answer.',
            ...location,
          })
      }
      impossibleGroups.push(contradiction || blockedSources)
    }
    if (
      impossibleGroups.length &&
      (page.match === 'all' ? impossibleGroups.some(Boolean) : impossibleGroups.every(Boolean))
    ) {
      unreachable.add(pagePosition)
      issues.push({
        code: 'unreachablePage',
        message: 'This page can never become visible.',
        pageId: page.id,
      })
    }
  }
  return issues
}
