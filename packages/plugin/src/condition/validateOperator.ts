import { operators, operatorsFor } from '@remy90/payload-conditions-engine'
import { conditionQuestion, type ConditionValidationContext } from './validationContext.js'
import { translate } from '../translations/index.js'

/** Runs on the server against the current document, including unsaved answer settings. */
export const validateConditionOperator = (
  value: unknown,
  context: ConditionValidationContext,
): true | string => {
  if (value === undefined || value === null || value === '') return translate(context, 'missingOperator')
  if (!operators.some((operator) => operator === value)) return translate(context, 'invalidOperator')
  // Payload omits the path while rebuilding field state. beforeChange supplies it on save.
  if (!context.path?.length) return true
  const question = conditionQuestion(context)
  if (!question) return translate(context, 'earlierQuestion')
  return operatorsFor(question.answer).some((operator) => operator === value)
    ? true
    : translate(context, 'operatorMismatch')
}
