export * from './types.js'
import type { AnswerIssue, Answers, Condition, Page, Question, Questionnaire } from './types.js'

type Entry = { question: Question; pagePosition: number; optionIds: ReadonlySet<string> }
type Index = { questions: Map<string, Entry>; pagePositions: Map<string, number> }
const indexes = new WeakMap<Questionnaire, Index>()

function indexFor(questionnaire: Questionnaire): Index {
  const cached = indexes.get(questionnaire)
  if (cached) return cached
  const questions = new Map<string, Entry>()
  const pagePositions = new Map<string, number>()
  questionnaire.pages.forEach((page, pagePosition) => {
    pagePositions.set(page.id, pagePosition)
    for (const question of page.questions) {
      const answer = question.answer
      const optionIds = new Set(answer.type === 'boolean'
        ? [answer.trueOption.id, answer.falseOption.id]
        : answer.type === 'multipleChoice' ? answer.options.map(option => option.id) : [])
      questions.set(question.id, { question, pagePosition, optionIds })
    }
  })
  const index = { questions, pagePositions }
  indexes.set(questionnaire, index)
  return index
}

// Membership sets live for one evaluation, so caller-owned arrays are never cached.
function membership() {
  const sets = new Map<readonly string[], Set<string>>()
  return (values: readonly string[], value: string): boolean => {
    if (values.length <= 8) {
      for (const selected of values) if (selected === value) return true
      return false
    }
    let set = sets.get(values)
    if (!set) { set = new Set(values); sets.set(values, set) }
    return set.has(value)
  }
}
type Contains = ReturnType<typeof membership>

function conditionMatches(condition: Condition, pagePosition: number, index: Index, answers: Answers, contains: Contains): boolean {
  const entry = index.questions.get(condition.questionId)
  if (!entry || entry.pagePosition >= pagePosition) return false
  const type = entry.question.answer.type
  if (type !== 'boolean' && type !== 'multipleChoice') return false
  if (!condition.questionId || !condition.answerId) return false
  const values = answers.get(condition.questionId)
  if (!values?.length) return false
  switch (condition.operator) {
    case 'is': case 'includes': return contains(values, condition.answerId)
    case 'isNot': case 'excludes': return !contains(values, condition.answerId)
    default: return false
  }
}

function pageMatches(page: Page, position: number, index: Index, answers: Answers, contains: Contains): boolean {
  let hasGroup = false
  for (const group of page.conditionGroups) {
    if (group.conditions.length === 0) continue
    hasGroup = true
    let matched = group.match === 'all'
    for (const condition of group.conditions) {
      const result = conditionMatches(condition, position, index, answers, contains)
      if (group.match === 'all' && !result) { matched = false; break }
      if (group.match === 'any' && result) { matched = true; break }
    }
    if (page.match === 'all' && !matched) return false
    if (page.match === 'any' && matched) return true
  }
  // ohme threw PrerequisiteConditionNotSupported for an unknown page match mode.
  // With nonempty groups, the engine returns false and fails closed.
  return !hasGroup || page.match === 'all'
}

export function resolveVisibility(questionnaire: Questionnaire, answers: Answers): { visiblePageIds: ReadonlySet<string>; answers: Answers } {
  const index = indexFor(questionnaire)
  const contains = membership()
  const visiblePageIds = new Set<string>()
  let cleared: Map<string, readonly string[]> | undefined
  questionnaire.pages.forEach((page, position) => {
    if (pageMatches(page, position, index, cleared ?? answers, contains)) {
      visiblePageIds.add(page.id)
    } else {
      for (const question of page.questions) {
        if ((cleared ?? answers).has(question.id)) {
          cleared ??= new Map(answers)
          cleared.delete(question.id)
        }
      }
    }
  })
  return { visiblePageIds, answers: cleared ?? answers }
}

export function applyAnswer(questionnaire: Questionnaire, answers: Answers, questionId: string, values: readonly string[]): { visiblePageIds: ReadonlySet<string>; answers: Answers } {
  if (!indexFor(questionnaire).questions.has(questionId)) return resolveVisibility(questionnaire, answers)
  const updated = new Map(answers)
  if (values.length === 0) updated.delete(questionId)
  else updated.set(questionId, [...values])
  return resolveVisibility(questionnaire, updated)
}

export function nextPageId(questionnaire: Questionnaire, visiblePageIds: ReadonlySet<string>, currentPageId?: string): string | undefined {
  const position = currentPageId === undefined ? undefined : indexFor(questionnaire).pagePositions.get(currentPageId)
  for (let i = (position ?? -1) + 1; i < questionnaire.pages.length; i++) {
    const id = questionnaire.pages[i].id
    if (visiblePageIds.has(id)) return id
  }
  return undefined
}

export function previousPageId(questionnaire: Questionnaire, visiblePageIds: ReadonlySet<string>, currentPageId?: string): string | undefined {
  const position = currentPageId === undefined ? undefined : indexFor(questionnaire).pagePositions.get(currentPageId)
  if (position === undefined) return undefined
  for (let i = position - 1; i >= 0; i--) {
    const id = questionnaire.pages[i].id
    if (visiblePageIds.has(id)) return id
  }
  return undefined
}

export function validatePageAnswers(questionnaire: Questionnaire, pageId: string, answers: Answers): AnswerIssue[] {
  const index = indexFor(questionnaire)
  const position = index.pagePositions.get(pageId)
  if (position === undefined) return []
  const page = questionnaire.pages[position]
  const issues: AnswerIssue[] = []
  for (const question of page.questions) {
    const values = answers.get(question.id) ?? []
    if (!page.skippable && !question.optional && !values.some(value => value.trim().length > 0)) {
      issues.push({ questionId: question.id, issue: 'required' })
    }
    if (question.answer.type === 'boolean' || question.answer.type === 'multipleChoice') {
      const entry = index.questions.get(question.id)!
      if (values.some(value => !entry.optionIds.has(value))) issues.push({ questionId: question.id, issue: 'unknownOption' })
      if (values.length > 1 && (question.answer.type === 'boolean' || !question.answer.allowMultipleSelection)) {
        issues.push({ questionId: question.id, issue: 'tooManySelections' })
      }
    }
  }
  return issues
}

export function evaluatePage(questionnaire: Questionnaire, pageId: string, answers: Answers): boolean {
  const index = indexFor(questionnaire)
  const position = index.pagePositions.get(pageId)
  return position !== undefined && pageMatches(questionnaire.pages[position], position, index, answers, membership())
}
