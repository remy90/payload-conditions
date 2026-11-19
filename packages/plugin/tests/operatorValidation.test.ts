import { describe, expect, it } from 'vitest'
import { validateConditionOperator } from '../src/condition/validateOperator.js'

const bool = {
  id: 'boolean',
  answer: [{ blockType: 'yesNo',  yesId: 'yes', noId: 'no'  }],
}
const choice = (hasMany: boolean) => ({
  id: 'choice',
  answer: [{ blockType: 'choice', hasMany }],
})
const validate = (
  operator: unknown,
  questionId = 'choice',
  multiple = false,
  pageIndex: string | number = '1',
) =>
  validateConditionOperator(operator, {
    data: {
      content: {
        survey: [
          {
            id: 'first',
            blockType: 'page',
            questions: [
              bool,
              choice(multiple),
              { id: 'text', answer: [{ blockType: 'text', placeholder: 'Name' }] },
            ],
          },
          { id: 'second', blockType: 'page' },
        ],
      },
    },
    path: ['content', 'survey', pageIndex, 'conditionGroups', '0', 'conditions', '0', 'operator'],
    siblingData: { questionId },
  })

describe('operator field validation', () => {
  it('supports Payload field-state builds that omit the path', () => {
    expect(validateConditionOperator('equals', { siblingData: { questionId: 'boolean' } })).toBe(true)
    expect(validateConditionOperator(null, {})).toEqual(expect.any(String))
    expect(validateConditionOperator('1', {})).toEqual(expect.any(String))
  })

  it('validates current settings when a hook updates the same data array', () => {
    const question = choice(false)
    const context = {
      data: {
        pages: [
          { id: 'first', blockType: 'page', questions: [question] },
          { id: 'second', blockType: 'page' },
        ],
      },
      path: ['pages', '1', 'conditionGroups', '0', 'conditions', '0', 'operator'],
      siblingData: { questionId: 'choice' },
    }
    expect(validateConditionOperator('equals', context)).toBe(true)
    question.answer[0].hasMany = true
    expect(validateConditionOperator('equals', context)).toEqual(expect.any(String))
    expect(validateConditionOperator('in', context)).toBe(true)
  })

  it.each(['equals', 'not_equals'])('accepts %s for single selection and boolean questions', (operator) => {
    expect(validate(operator)).toBe(true)
    expect(validate(operator, 'boolean')).toBe(true)
  })

  it.each(['in', 'not_in'])('accepts %s after enabling multiple selection', (operator) => {
    expect(validate(operator, 'choice', true)).toBe(true)
    expect(validate(operator)).toEqual(expect.any(String))
  })

  it.each(['equals', 'not_equals'])('rejects stale %s after enabling multiple selection', (operator) => {
    expect(validate(operator, 'choice', true)).toEqual(expect.any(String))
  })

  it.each([undefined, null, '', '1', 'unknown', ['equals']])(
    'rejects missing or invalid operators: %s',
    (operator) => {
      expect(validate(operator)).toEqual(expect.any(String))
    },
  )

  it.each(['missing', 'text'])('rejects unsupported source %s', (questionId) => {
    expect(validate('equals', questionId)).toEqual(expect.any(String))
  })

  it.each(['0', 0])('rejects same-page references with path segment %s', (index) => {
    expect(validate('equals', 'boolean', false, index)).toEqual(expect.any(String))
  })

  it.each(['1', 1])('accepts earlier references with path segment %s', (index) => {
    expect(validate('equals', 'boolean', false, index)).toBe(true)
  })

  it.each(['', '-1', '1.5', 'nope'])('rejects malformed page index %s', (index) => {
    expect(validate('equals', 'boolean', false, index)).toEqual(expect.any(String))
  })
})
