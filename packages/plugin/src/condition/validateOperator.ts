import { operatorsFor, type Answer } from '@remy90/payload-conditions-engine'
import { fromPayloadQuestionnaire, type StoredQuestionnaire } from '@remy90/payload-conditions-engine/payload'

type Context = {
  data?: unknown
  path?: (number | string)[]
  siblingData?: { questionId?: unknown }
}
const indexes = new WeakMap<object, Map<string, { pageIndex: number; answer: Answer }>>()
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object'

/** Runs on the server against the current document, including unsaved answer settings. */
export const validateConditionOperator = (value: unknown, { data, path = [], siblingData }: Context): true | string => {
  if (value === undefined || value === null || value === '') return 'Select an operator.'
  let pages: unknown = data
  for (const segment of path.slice(0, -6)) pages = record(pages) ? pages[segment] : undefined
  const pageIndex = Number(path[path.length - 6])
  if (!Array.isArray(pages) || !Number.isInteger(pageIndex) || pageIndex < 0) return 'Select an earlier question.'
  let questions = indexes.get(pages)
  if (!questions) {
    questions = new Map()
    const positions = new Map<string, number>()
    pages.forEach((page: unknown, index) => {
      if (record(page) && page.id != null) positions.set(String(page.id), index)
    })
    const questionnaire = fromPayloadQuestionnaire({ pages } as StoredQuestionnaire)
    for (const page of questionnaire.pages) {
      for (const question of page.questions) {
        questions.set(question.id, { pageIndex: positions.get(page.id)!, answer: question.answer })
      }
    }
    indexes.set(pages, questions)
  }
  const id = siblingData?.questionId
  const question = id == null ? undefined : questions.get(String(id))
  if (!question || question.pageIndex >= pageIndex) return 'Select an earlier question.'
  return operatorsFor(question.answer).some((operator) => operator === value)
    ? true : 'This operator is not valid for the selected question.'
}
