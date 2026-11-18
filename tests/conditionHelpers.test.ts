import { describe, expect, it } from 'vitest'
import { questionChangeActions, questionRowLabel } from '../src/condition/helper.js'

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
    ['123456789012345678901', '12345678901234567890...'],
  ])('truncates questions longer than twenty characters: %s', (question, label) => {
    expect(questionRowLabel(question, 0)).toBe(label)
  })
})

const path = 'content.pages.2.conditionalLogicGroup.0.questionValue'

describe('changing a condition question', () => {
  it.each(['another-question', null])('clears the old answer when selecting %s', (next) => {
    expect(questionChangeActions(path, 'old-question', next)).toEqual([
      { type: 'UPDATE', path: 'content.pages.2.conditionalLogicGroup.0.answerValue', value: null },
    ])
  })

  it.each([['same', 'same'], [null, null], [undefined, null]])('keeps the answer when the question is unchanged: %s', (current, next) => {
    expect(questionChangeActions(path, current, next ?? null)).toEqual([])
  })
})
