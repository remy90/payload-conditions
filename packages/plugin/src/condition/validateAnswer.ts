import { conditionQuestion, type ConditionValidationContext } from './validationContext.js'

/** Payload skips field validation for drafts unless drafts.validate is enabled. */
export const validateConditionAnswer = (value: unknown, context: ConditionValidationContext): true | string => {
  if (typeof value !== 'string' || !value) return 'Select an answer.'
  if (!context.path?.length) return true
  const question = conditionQuestion(context)
  // The operator validator reports unavailable questions.
  if (!question) return true
  const { answer } = question
  const valid = answer.type === 'boolean'
    ? value === answer.trueOption.id || value === answer.falseOption.id
    : answer.type === 'multipleChoice' && answer.options.some((option) => option.id === value)
  return valid ? true : 'Select a current answer option for the selected question.'
}
