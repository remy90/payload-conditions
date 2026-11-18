import type { Condition, Page, Question, Questionnaire } from '../src/index.js'

export const booleanQuestion = (id: string): Question => ({
  id, text: id, optional: false,
  answer: { type: 'boolean', trueOption: { id: 'yes', label: 'Yes' }, falseOption: { id: 'no', label: 'No' } },
})
export const condition = (questionId: string, answerId = 'yes'): Condition => ({ questionId, operator: 'is', answerId })
export const page = (id: string, questions: Question[] = [], conditions: Condition[] = []): Page => ({
  id, questions, skippable: false, match: 'all', conditionGroups: [{ match: 'all', conditions }],
})
export const questionnaire = (...pages: Page[]): Questionnaire => ({ id: 'survey', title: 'Survey', pages })
