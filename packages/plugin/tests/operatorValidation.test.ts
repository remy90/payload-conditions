import { describe, expect, it } from 'vitest'
import { validateConditionOperator } from '../src/condition/validateOperator.js'

const bool = { id: 'boolean', answer: [{ blockType: 'booleanOptions', booleanOptions: { trueId: 'yes', falseId: 'no' } }] }
const choice = (allowMultipleSelection: boolean) => ({ id: 'choice', answer: [{ blockType: 'multipleChoice', allowMultipleSelection }] })
const validate = (operator: unknown, questionId = 'choice', multiple = false, pageIndex: string | number = '1') =>
  validateConditionOperator(operator, {
    data: { content: { survey: [
      { id: 'first', blockType: 'standardPage', questionAnswerPair: [bool, choice(multiple),
        { id: 'text', answer: [{ blockType: 'inputText', inputText: 'Name' }] }] },
      { id: 'second', blockType: 'standardPage' },
    ] } },
    path: ['content', 'survey', pageIndex, 'conditionGroups', '0', 'conditions', '0', 'operator'],
    siblingData: { questionId },
  })

describe('operator field validation', () => {
  it('supports Payload field-state builds that omit the path', () => {
    expect(validateConditionOperator('is', { siblingData: { questionId: 'boolean' } })).toBe(true)
    expect(validateConditionOperator(null, {})).toEqual(expect.any(String))
    expect(validateConditionOperator('1', {})).toEqual(expect.any(String))
  })

  it('validates current settings when a hook updates the same data array', () => {
    const question = choice(false)
    const context = {
      data: { pages: [{ id: 'first', blockType: 'standardPage', questionAnswerPair: [question] },
        { id: 'second', blockType: 'standardPage' }] },
      path: ['pages', '1', 'conditionGroups', '0', 'conditions', '0', 'operator'],
      siblingData: { questionId: 'choice' },
    }
    expect(validateConditionOperator('is', context)).toBe(true)
    question.answer[0].allowMultipleSelection = true
    expect(validateConditionOperator('is', context)).toEqual(expect.any(String))
    expect(validateConditionOperator('includes', context)).toBe(true)
  })

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

  it.each(['0', 0])('rejects same-page references with path segment %s', (index) => {
    expect(validate('is', 'boolean', false, index)).toEqual(expect.any(String))
  })

  it.each(['1', 1])('accepts earlier references with path segment %s', (index) => {
    expect(validate('is', 'boolean', false, index)).toBe(true)
  })

  it.each(['', '-1', '1.5', 'nope'])('rejects malformed page index %s', (index) => {
    expect(validate('is', 'boolean', false, index)).toEqual(expect.any(String))
  })
})
