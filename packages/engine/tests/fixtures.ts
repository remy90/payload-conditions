import type { Condition, Page, Question, Questionnaire } from '../src/index.js'

export const yesNoQuestion = (id: string): Question => ({
  id,
  name: id,
  label: id,
  required: true,
  answer: {
    type: 'yesNo',
    yes: { id: 'yes', label: 'Yes' },
    no: { id: 'no', label: 'No' },
  },
})
export const condition = (questionId: string, answerId = 'yes'): Condition => ({
  questionId,
  operator: 'equals',
  answerId,
})
export const page = (
  id: string,
  questions: Question[] = [],
  conditions: Condition[] = [],
): Page => ({
  id,
  questions,
  skippable: false,
  match: 'all',
  conditionGroups: [{ match: 'all', conditions }],
})
export const questionnaire = (...pages: Page[]): Questionnaire => ({
  id: 'survey',
  title: 'Survey',
  pages,
})
