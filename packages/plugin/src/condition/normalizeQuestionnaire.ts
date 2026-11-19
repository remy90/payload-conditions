import { operatorsFor, type Operator } from '@remy90/payload-conditions-engine'
import {
  fromPayloadQuestionnaire,
  type StoredQuestionnaire,
} from '@remy90/payload-conditions-engine/payload'
import { normalizeYesNoIds } from '../blocks/Answers/normalizeYesNoIds.js'
import { normalizeOperator } from './normalizeOperator.js'
import { hasInvalidQuestionnaireArrays } from './storedShape.js'

/** Repair answer ids before deriving the current operator choices. */
export const normalizeQuestionnaire = (
  document: unknown,
  createId: () => string,
  options: { originalDoc?: unknown; blocksField?: string } = {},
): unknown => {
  const normalized = normalizeYesNoIds(document, createId, options)
  const data = normalized as Record<string, unknown>
  if (!data || hasInvalidQuestionnaireArrays(data, options.blocksField)) return normalized
  const source = options.blocksField ? data?.[options.blocksField] : data?.pages
  const questions = fromPayloadQuestionnaire({
    pages: source,
  } as StoredQuestionnaire).pages.flatMap((page) => page.questions)
  const allowed = new Map<string, readonly Operator[]>()
  for (const question of questions)
    if (!allowed.has(question.id)) allowed.set(question.id, operatorsFor(question.answer))
  const visit = (
    value: unknown,
    mode: 'document' | 'group' | 'condition' = 'document',
  ): unknown => {
    if (Array.isArray(value)) {
      const result = value.map((child) => visit(child, mode))
      return result.some((child, i) => child !== value[i]) ? result : value
    }
    if (!value || typeof value !== 'object') return value
    const record = value as Record<string, unknown>
    let result = record
    const operators =
      typeof record.questionId === 'string' ? allowed.get(record.questionId) : undefined
    if (mode === 'condition' && operators) {
      const operator = normalizeOperator(record.operator, operators)
      if (operator !== record.operator) result = { ...record, operator }
    }
    for (const [key, child] of Object.entries(record)) {
      const nextMode =
        key === 'conditionGroups'
          ? 'group'
          : mode === 'group' && key === 'conditions'
            ? 'condition'
            : 'document'
      const next = visit(child, nextMode)
      if (next !== child) {
        if (result === record) result = { ...record }
        result[key] = next
      }
    }
    return result
  }
  return visit(normalized)
}
