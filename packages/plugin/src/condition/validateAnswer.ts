import { conditionQuestion, type ConditionValidationContext } from './validationContext.js'
import { translate } from '../translations/index.js'

/** Payload skips field validation for drafts unless drafts.validate is enabled. */
export const validateConditionAnswer = (
  value: unknown,
  context: ConditionValidationContext,
): true | string => {
  if (typeof value !== 'string' || !value) return translate(context, 'missingAnswer')
  if (!context.path?.length) return true
  const question = conditionQuestion(context)
  if (!question) return true
  const { answer } = question
  const valid =
    answer.type === 'yesNo'
      ? value === answer.yes.id || value === answer.no.id
      : answer.type === 'choice' && answer.options.some((option) => option.id === value)
  return valid ? true : translate(context, 'unknownAnswer')
}
