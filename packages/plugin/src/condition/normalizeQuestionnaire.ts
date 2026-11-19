import { operatorsFor } from '@remy90/payload-conditions-engine'
import { fromPayloadQuestionnaire, type StoredQuestionnaire } from '@remy90/payload-conditions-engine/payload'
import { normalizeYesNoIds } from '../blocks/Answers/normalizeYesNoIds.js'
import { normalizeOperator } from './normalizeOperator.js'

/** Repair answer ids before deriving the current operator choices. */
export const normalizeQuestionnaire = (
  document: unknown,
  createId: () => string,
  options: { originalDoc?: unknown; blocksField?: string } = {},
): unknown => {
  const normalized = normalizeYesNoIds(document, createId, options)
  const data = normalized as Record<string, unknown>
  const source = options.blocksField ? data?.[options.blocksField] : data?.pages
  const questions = fromPayloadQuestionnaire({ pages: source } as StoredQuestionnaire).pages
    .flatMap((page) => page.questions)
  const allowed = new Map()
  for (const question of questions)
    if (!allowed.has(question.id)) allowed.set(question.id, operatorsFor(question.answer))
  const visit = (value: any, condition = false): any => {
    if (Array.isArray(value)) {
      const result = value.map((child) => visit(child, condition))
      return result.some((child, i) => child !== value[i]) ? result : value
    }
    if (!value || typeof value !== 'object') return value
    let result = value
    if (condition && allowed.has(value.questionId)) {
      const operator = normalizeOperator(value.operator, allowed.get(value.questionId))
      if (operator !== value.operator) result = { ...value, operator }
    }
    for (const [key, child] of Object.entries(value)) {
      const next = visit(child, key === 'conditions' && Array.isArray(child))
      if (next !== child) {
        if (result === value) result = { ...value }
        result[key] = next
      }
    }
    return result
  }
  return visit(normalized)
}
