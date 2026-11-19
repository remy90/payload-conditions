import type { FormState, OptionObject } from 'payload'
import { operatorsFor } from '@remy90/payload-conditions-engine'
import { normalizeOperator } from './normalizeOperator.js'
import { questionOptions, selectedQuestion } from './formIndex.js'
import { stringValue } from './formState.js'
import { translate, type TranslationContext } from '../translations/index.js'
import type { Operator } from '@remy90/payload-conditions-engine'

export const operatorState = (
  fields: FormState,
  path: string,
  value: string | null | undefined,
) => {
  const question = selectedQuestion(fields, path)
  const mapped = question ? normalizeOperator(value, operatorsFor(question.answer)) : value
  return { value: mapped, update: mapped !== value ? mapped : undefined }
}

export const buildQuestionOptions = (
  fields: FormState,
  path: string,
  context: TranslationContext = {},
): OptionObject[] => {
  const options = questionOptions(fields, path)
  if (!context.t && !context.req?.t) return options
  return options.map((option, index) => {
    const question = selectedQuestion(fields, path, String(option.value))
    return {
      ...option,
      label:
        (question && stringValue(fields, `${question.path}.label`)) ||
        translate(context, 'questionNumber', { number: index + 1 }),
    }
  })
}
export const buildAnswerOptions = (fields: FormState, path: string): OptionObject[] =>
  selectedQuestion(fields, path)?.options ?? []
export const buildOperatorOptions = (
  fields: FormState,
  path: string,
  context: TranslationContext = {},
): OptionObject[] =>
  (selectedQuestion(fields, path)?.operators ?? []).map((option) => ({
    ...option,
    label: translate(context, option.value as Operator),
  }))
