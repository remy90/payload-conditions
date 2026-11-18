import { fromPayloadQuestionnaire, type StoredQuestionnaire } from '@remy90/payload-conditions-engine/payload'
import type { Question } from '@remy90/payload-conditions-engine'

export type ConditionValidationContext = {
  data?: unknown
  path?: (number | string)[]
  siblingData?: { questionId?: unknown }
  req?: { context: Record<string, unknown> }
}
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object'

export const conditionQuestion = ({ data, path = [], siblingData }: ConditionValidationContext): Question | undefined => {
  let pages: unknown = data
  for (const segment of path.slice(0, -6)) pages = record(pages) ? pages[segment] : undefined
  const segment = path[path.length - 6]
  if (!/^\d+$/.test(String(segment))) return undefined
  const pageIndex = Number(segment)
  if (!Array.isArray(pages)) return undefined
  const questionnaire = fromPayloadQuestionnaire({ pages: pages.slice(0, pageIndex) } as StoredQuestionnaire)
  for (const page of questionnaire.pages) {
    for (const question of page.questions) {
      if (question.id === String(siblingData?.questionId)) return question
    }
  }
  return undefined
}
