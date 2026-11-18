import type { FormState, OptionObject } from 'payload'
import { operatorsFor } from '@remy90/payload-conditions-engine'
import { normalizeOperator } from './normalizeOperator.js'
import { questionOptions, selectedQuestion } from './formIndex.js'

export const operatorState = (fields: FormState, path: string, value: string | null | undefined) => {
  const question = selectedQuestion(fields, path)
  const mapped = question ? normalizeOperator(value, operatorsFor(question.answer)) : value
  return { value: mapped, update: mapped !== value ? mapped : undefined }
}

export const buildQuestionOptions = questionOptions
export const buildAnswerOptions = (fields: FormState, path: string): OptionObject[] =>
  selectedQuestion(fields, path)?.options ?? []
export const buildOperatorOptions = (fields: FormState, path: string): OptionObject[] =>
  selectedQuestion(fields, path)?.operators ?? []
