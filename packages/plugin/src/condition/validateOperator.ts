import { operators, operatorsFor } from '@remy90/payload-conditions-engine'
import { fromPayloadQuestionnaire, type StoredQuestionnaire } from '@remy90/payload-conditions-engine/payload'

type Context = {
  data?: unknown
  path?: (number | string)[]
  siblingData?: { questionId?: unknown }
}
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object'

/** Runs on the server against the current document, including unsaved answer settings. */
export const validateConditionOperator = (value: unknown, { data, path = [], siblingData }: Context): true | string => {
  if (value === undefined || value === null || value === '') return 'Select an operator.'
  if (!operators.some((operator) => operator === value)) return 'Select a valid operator.'
  // Payload omits the path while rebuilding field state. beforeChange supplies it on save.
  if (!path.length) return true
  let pages: unknown = data
  for (const segment of path.slice(0, -6)) pages = record(pages) ? pages[segment] : undefined
  const pageIndex = Number(path[path.length - 6])
  if (!Array.isArray(pages) || !Number.isInteger(pageIndex) || pageIndex < 0) return 'Select an earlier question.'
  const id = siblingData?.questionId
  const questionnaire = fromPayloadQuestionnaire({ pages: pages.slice(0, pageIndex) } as StoredQuestionnaire)
  for (const page of questionnaire.pages) {
    for (const question of page.questions) {
      if (question.id === String(id)) {
        return operatorsFor(question.answer).some((operator) => operator === value)
          ? true : 'This operator is not valid for the selected question.'
      }
    }
  }
  return 'Select an earlier question.'
}
