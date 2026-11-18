import type { FormState, OptionObject } from 'payload'
import { questionOptions, selectedQuestion } from './formIndex.js'

export const buildQuestionOptions = questionOptions
export const buildAnswerOptions = (fields: FormState, path: string): OptionObject[] =>
  selectedQuestion(fields, path)?.options ?? []
export const buildOperatorOptions = (fields: FormState, path: string): OptionObject[] =>
  selectedQuestion(fields, path)?.operators ?? []
