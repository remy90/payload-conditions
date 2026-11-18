import type { FormState } from 'payload'
import { describe, expect, it } from 'vitest'
import { normalizeBooleanIds } from '../src/blocks/Answers/normalizeBooleanIds.js'
import { normalizeOperator } from '../src/condition/normalizeOperator.js'
import { operatorValue } from '../src/condition/options.js'

const choices = (multiple: boolean) => ({ blockType: 'multipleChoice', allowMultipleSelection: multiple })
const bool = { blockType: 'booleanOptions', booleanOptions: { trueId: 'yes', falseId: 'no' } }
const document = (answer: object, operator: string) => ({
  before: { conditionGroups: [{ conditions: [{ questionId: 'q', answerId: 'yes', operator }] }] },
  pages: [{ id: 'page', blockType: 'standardPage', questionAnswerPair: [{ id: 'q', answer: [answer] }] }],
})

describe('equivalent condition operators', () => {
  it.each([
    ['is', ['includes', 'excludes'], 'includes'], ['isNot', ['includes', 'excludes'], 'excludes'],
    ['includes', ['is', 'isNot'], 'is'], ['excludes', ['is', 'isNot'], 'isNot'],
    ['is', ['is', 'isNot'], 'is'], ['unknown', ['is', 'isNot'], 'unknown'], ['is', [], 'is'],
  ] as const)('maps %s to an allowed equivalent', (value, allowed, expected) => {
    expect(normalizeOperator(value, allowed)).toBe(expected)
  })

  it.each([
    [choices(true), 'is', 'includes'], [choices(true), 'isNot', 'excludes'],
    [choices(false), 'includes', 'is'], [bool, 'excludes', 'isNot'],
  ])('normalizes the current answer settings in the boolean-id walk', (answer, operator, expected) => {
    const data = document(answer as object, String(operator))
    const snapshot = structuredClone(data)
    const result = normalizeBooleanIds(data, () => { throw new Error('Unexpected id generation') }, { blocksField: 'pages' }) as typeof data
    expect(result.before.conditionGroups[0].conditions[0].operator).toBe(expected)
    expect(data).toEqual(snapshot)
    expect(result.pages).toBe(data.pages)
    expect(normalizeBooleanIds(result, () => 'unused', { blocksField: 'pages' })).toBe(result)
  })

  it('combines operator mapping and boolean id rewrites in one save', () => {
    const data = document({ ...bool, booleanOptions: { trueId: 'yes', falseId: 'yes' } }, 'excludes')
    const result = normalizeBooleanIds(data, () => 'fresh') as typeof data
    expect(result.before.conditionGroups[0].conditions[0]).toEqual({ questionId: 'q', answerId: 'yes', operator: 'isNot' })
    expect((result.pages[0].questionAnswerPair[0].answer[0] as typeof bool).booleanOptions.falseId).toBe('fresh')
  })

  it('shows and dispatches the equivalent value for the selected question', () => {
    const path = 'pages.1.conditionGroups.0.conditions.0.operator'
    const fields: FormState = {
      pages: { rows: [{ id: 'p1', blockType: 'standardPage' }, { id: 'p2', blockType: 'standardPage' }] },
      'pages.0.questionAnswerPair': { rows: [{ id: 'q' }] },
      'pages.0.questionAnswerPair.0.answer': { rows: [{ id: 'answer', blockType: 'multipleChoice' }] },
      'pages.0.questionAnswerPair.0.answer.0.allowMultipleSelection': { value: true },
      'pages.1.conditionGroups.0.conditions.0.questionId': { value: 'q' },
      [path]: { value: 'isNot' },
    }
    expect(operatorValue(fields, path, 'isNot')).toBe('excludes')
    expect(operatorValue(fields, path, 'includes')).toBe('includes')
    expect(fields[path].value).toBe('isNot')
  })
})
