import { operatorsFor } from '@remy90/payload-conditions-engine'
import type { FormState } from 'payload'
import { selectedQuestion } from './formIndex.js'

export const selectedOptionValue = (option: unknown): string | null =>
  option && typeof option === 'object' && !Array.isArray(option) &&
    'value' in option && typeof option.value === 'string' ? option.value : null

export const questionRowLabel = (question: unknown, rowNumber?: number): string =>
  typeof question === 'string' && question
    ? question.length > 20 ? question.substring(0, 20) + '...' : question
    : `Question ${(rowNumber ?? 0) + 1}`

export const questionChangeFields = (
  fields: FormState,
  path: string,
  current: string | null | undefined,
  next: string | null,
): FormState => {
  if (next === (current ?? null)) return {}
  const row = path.slice(0, path.lastIndexOf('.'))
  const answerPath = `${row}.answerId`
  const operatorPath = `${row}.operator`
  const patch: FormState = {
    [path]: { ...fields[path], value: next, isModified: true },
    [answerPath]: { ...fields[answerPath], value: null, isModified: true },
  }
  const question = selectedQuestion(fields, path, next)
  const allowed = question ? operatorsFor(question.answer) : []
  if (!allowed.some((operator) => operator === fields[operatorPath]?.value)) {
    patch[operatorPath] = { ...fields[operatorPath], value: null, isModified: true }
  }
  return patch
}
