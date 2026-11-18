import { operators, operatorsFor } from '@remy90/payload-conditions-engine'
import { conditionQuestion, type ConditionValidationContext } from './validationContext.js'

/** Runs on the server against the current document, including unsaved answer settings. */
export const validateConditionOperator = (value: unknown, context: ConditionValidationContext): true | string => {
  if (value === undefined || value === null || value === '') return 'Select an operator.'
  if (!operators.some((operator) => operator === value)) return 'Select a valid operator.'
  // Payload omits the path while rebuilding field state. beforeChange supplies it on save.
  if (!context.path?.length) return true
  const question = conditionQuestion(context)
  if (!question) return 'Select an earlier question.'
  return operatorsFor(question.answer).some((operator) => operator === value)
    ? true : 'This operator is not valid for the selected question.'
}
