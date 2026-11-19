import { evaluatePage, type Answers, type Questionnaire, type Page } from '@remy90/payload-conditions-engine'

const operatorLabels = { is: 'is', isNot: 'is not', includes: 'includes', excludes: 'excludes' }

// Keep condition semantics in the engine. Each probe retains page order and question ownership.
export function explainPages(questionnaire: Questionnaire) {
  const questions = new Map(questionnaire.pages.flatMap((page) => page.questions.map((question) => [question.id, question] as const)))
  const probe = (page: Page, conditionGroups: Page['conditionGroups']) => ({
    ...questionnaire,
    pages: questionnaire.pages.map((candidate) => candidate.id === page.id ? { ...page, conditionGroups } : candidate),
  })
  const definitions = questionnaire.pages.map((page) => ({
    page,
    groups: page.conditionGroups.map((group) => ({
      match: group.match,
      probe: probe(page, [group]),
      conditions: group.conditions.map((condition) => {
        const question = questions.get(condition.questionId)
        const answer = question?.answer
        const options = answer?.type === 'boolean' ? [answer.trueOption, answer.falseOption]
          : answer?.type === 'multipleChoice' ? answer.options : []
        return {
          text: `${question?.text ?? condition.questionId} ${operatorLabels[condition.operator]} ${options.find((option) => option.id === condition.answerId)?.label ?? condition.answerId}`,
          probe: probe(page, [{ match: 'all', conditions: [condition] }]),
        }
      }),
    })),
  }))
  return (answers: Answers) => definitions.map(({ page, groups }) => ({
    id: page.id, match: page.match, pass: evaluatePage(questionnaire, page.id, answers),
    groups: groups.map((group) => ({
      match: group.match, pass: evaluatePage(group.probe, page.id, answers),
      conditions: group.conditions.map((condition) => ({ text: condition.text, pass: evaluatePage(condition.probe, page.id, answers) })),
    })),
  }))
}

export function answerLabels(questionnaire: Questionnaire, answers: Answers) {
  return questionnaire.pages.flatMap((page) => page.questions.flatMap((question) => {
    const values = answers.get(question.id)
    if (!values?.length) return []
    const answer = question.answer
    const options = answer.type === 'boolean' ? [answer.trueOption, answer.falseOption] : answer.type === 'multipleChoice' ? answer.options : []
    return [{
      id: question.id, question: question.text,
      value: answer.type === 'inputText' ? values.join(', ') : values.map((value) => options.find((option) => option.id === value)?.label ?? value).join(', '),
    }]
  }))
}
