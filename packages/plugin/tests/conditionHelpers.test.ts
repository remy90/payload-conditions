import { describe, expect, it } from 'vitest'
import type { FormState } from 'payload'
import { questionChangeFields, questionRowLabel } from '../src/condition/helper.js'

describe('question row labels', () => {
  it.each([undefined, null, '', 7])('labels an unfinished question: %s', (question) => {
    expect(questionRowLabel(question, 2)).toBe('Question 3')
  })

  it('starts at question one when the row number is absent', () => {
    expect(questionRowLabel(undefined)).toBe('Question 1')
  })

  it.each([
    ['Short question', 'Short question'],
    ['12345678901234567890', '12345678901234567890'],
    ['123456789012345678901', '123456789012345678901'],
  ])('preserves the full question: %s', (question, label) => {
    expect(questionRowLabel(question, 0)).toBe(label)
  })
})

const row = 'content.pages.2.conditionGroups.0.conditions.0'
const path = `${row}.questionId`
const state = (operator: string): FormState => ({
  'content.pages': { value: 3 },
  'content.pages.0.questionAnswerPair': { value: 2 },
  'content.pages.0.questionAnswerPair.0.id': { value: 'single' },
  'content.pages.0.questionAnswerPair.0.answer.0.blockType': { value: 'booleanOptions' },
  'content.pages.0.questionAnswerPair.1.id': { value: 'multi' },
  'content.pages.0.questionAnswerPair.1.answer.0.blockType': { value: 'multipleChoice' },
  'content.pages.0.questionAnswerPair.1.answer.0.allowMultipleSelection': { value: true },
  [path]: { value: 'old', valid: true },
  [`${row}.operator`]: { value: operator, valid: true },
  [`${row}.answerId`]: { value: 'answer', valid: true },
})

describe('changing a condition question', () => {
  it('clears the answer and preserves a compatible operator in one modified patch', () => {
    expect(questionChangeFields(state('isNot'), path, 'old', 'single')).toEqual({
      [path]: { value: 'single', valid: true, isModified: true },
      [`${row}.answerId`]: { value: null, valid: true, isModified: true },
    })
  })

  it.each(['multi', null, 'missing'])(
    'clears an incompatible operator when selecting %s',
    (next) => {
      expect(questionChangeFields(state('is'), path, 'old', next)).toEqual({
        [path]: { value: next, valid: true, isModified: true },
        [`${row}.answerId`]: { value: null, valid: true, isModified: true },
        [`${row}.operator`]: { value: null, valid: true, isModified: true },
      })
    },
  )

  it('preserves multi-select operators for another multi-select question', () => {
    expect(
      questionChangeFields(state('excludes'), path, 'old', 'multi')[`${row}.operator`],
    ).toBeUndefined()
  })

  it.each([
    ['same', 'same'],
    [null, null],
    [undefined, null],
  ])('keeps fields when the question is unchanged: %s', (current, next) => {
    expect(questionChangeFields(state('is'), path, current, next ?? null)).toEqual({})
  })
})
