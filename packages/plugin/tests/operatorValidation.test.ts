import { describe, expect, it } from 'vitest'
import { validateConditionOperator } from '../src/condition/validateOperator.js'

const bool = { id: 'boolean', answer: [{ blockType: 'booleanOptions', booleanOptions: { trueId: 'yes', falseId: 'no' } }] }
const choice = (allowMultipleSelection: boolean) => ({ id: 'choice', answer: [{ blockType: 'multipleChoice', allowMultipleSelection }] })
const validate = (operator: unknown, questionId = 'choice', multiple = false, pageIndex = 1) =>
  validateConditionOperator(operator, {
    data: { content: { survey: [
      { id: 'first', blockType: 'standardPage', questionAnswerPair: [bool, choice(multiple),
        { id: 'text', answer: [{ blockType: 'inputText', inputText: 'Name' }] }] },
      { id: 'second', blockType: 'standardPage' },
    ] } },
    path: ['content', 'survey', pageIndex, 'conditionGroups', 0, 'conditions', 0, 'operator'],
    siblingData: { questionId },
  })

describe('operator field validation', () => {
  it.each(['is', 'isNot'])('accepts %s for single selection and boolean questions', (operator) => {
    expect(validate(operator)).toBe(true)
    expect(validate(operator, 'boolean')).toBe(true)
  })

  it.each(['includes', 'excludes'])('accepts %s after enabling multiple selection', (operator) => {
    expect(validate(operator, 'choice', true)).toBe(true)
    expect(validate(operator)).toEqual(expect.any(String))
  })

  it.each(['is', 'isNot'])('rejects stale %s after enabling multiple selection', (operator) => {
    expect(validate(operator, 'choice', true)).toEqual(expect.any(String))
  })

  it.each([undefined, null, '', '1', 'unknown', ['is']])('rejects missing or invalid operators: %s', (operator) => {
    expect(validate(operator)).toEqual(expect.any(String))
  })

  it.each(['missing', 'text'])('rejects unsupported source %s', (questionId) => {
    expect(validate('is', questionId)).toEqual(expect.any(String))
  })

  it('rejects same-page references', () => {
    expect(validate('is', 'boolean', false, 0)).toEqual(expect.any(String))
  })
})
