import type { FormState } from 'payload'
import { describe, expect, it } from 'vitest'
import { normalizeQuestionnaire } from '../src/condition/normalizeQuestionnaire.js'
import { normalizeOperator } from '../src/condition/normalizeOperator.js'
import { operatorState } from '../src/condition/options.js'

const choices = (multiple: boolean) => ({
  blockType: 'choice',
  hasMany: multiple,
})
const bool = { blockType: 'yesNo', yesId: 'yes', noId: 'no' }
const document = (answer: object, operator: string) => ({
  before: { conditionGroups: [{ conditions: [{ questionId: 'q', answerId: 'yes', operator }] }] },
  pages: [{ id: 'page', blockType: 'page', questions: [{ id: 'q', answer: [answer] }] }],
})

describe('equivalent condition operators', () => {
  it.each([
    ['equals', ['in', 'not_in'], 'in'],
    ['not_equals', ['in', 'not_in'], 'not_in'],
    ['in', ['equals', 'not_equals'], 'equals'],
    ['not_in', ['equals', 'not_equals'], 'not_equals'],
    ['equals', ['equals', 'not_equals'], 'equals'],
    ['unknown', ['equals', 'not_equals'], 'unknown'],
    ['equals', [], 'equals'],
  ] as const)('maps %s to an allowed equivalent', (value, allowed, expected) => {
    expect(normalizeOperator(value, allowed)).toBe(expected)
  })

  it.each([
    [choices(true), 'equals', 'in'],
    [choices(true), 'not_equals', 'not_in'],
    [choices(false), 'in', 'equals'],
    [bool, 'not_in', 'not_equals'],
  ])(
    'normalizes the current answer settings in the boolean-id walk',
    (answer, operator, expected) => {
      const data = document(answer as object, String(operator))
      const snapshot = structuredClone(data)
      const result = normalizeQuestionnaire(
        data,
        () => {
          throw new Error('Unexpected id generation')
        },
        { blocksField: 'pages' },
      ) as typeof data
      expect(result.before.conditionGroups[0].conditions[0].operator).toBe(expected)
      expect(data).toEqual(snapshot)
      expect(result.pages).toBe(data.pages)
      expect(normalizeQuestionnaire(result, () => 'unused', { blocksField: 'pages' })).toBe(result)
    },
  )

  it('leaves unrelated arrays named conditions unchanged', () => {
    const source = document(choices(true), 'equals')
    const data = { ...source, unrelated: { conditions: [{ questionId: 'q', operator: 'equals' }] } }
    const result = normalizeQuestionnaire(data, () => 'unused') as typeof data
    expect(result.unrelated).toBe(data.unrelated)
    expect(result.before.conditionGroups[0].conditions[0].operator).toBe('in')
  })

  it('uses the first question when malformed data repeats an id', () => {
    const data = document(choices(false), 'equals')
    data.pages[0].questions.push({ id: 'q', answer: [choices(true)] })
    expect(normalizeQuestionnaire(data, () => 'unused')).toBe(data)
  })

  it('combines operator mapping and boolean id rewrites in one save', () => {
    const data = document({ ...bool, yesId: 'yes', noId: 'yes' }, 'not_in')
    const result = normalizeQuestionnaire(data, () => 'fresh') as typeof data
    expect(result.before.conditionGroups[0].conditions[0]).toEqual({
      questionId: 'q',
      answerId: 'yes',
      operator: 'not_equals',
    })
    expect((result.pages[0].questions[0].answer[0] as typeof bool).noId).toBe('fresh')
  })

  it('derives the displayed value and pending dispatch for the selected question', () => {
    const path = 'pages.1.conditionGroups.0.conditions.0.operator'
    const fields: FormState = {
      pages: {
        rows: [
          { id: 'p1', blockType: 'page' },
          { id: 'p2', blockType: 'page' },
        ],
      },
      'pages.0.questions': { rows: [{ id: 'q' }] },
      'pages.0.questions.0.answer': {
        rows: [{ id: 'answer', blockType: 'choice' }],
      },
      'pages.0.questions.0.answer.0.hasMany': { value: true },
      'pages.1.conditionGroups.0.conditions.0.questionId': { value: 'q' },
      [path]: { value: 'not_equals' },
    }
    expect(operatorState(fields, path, 'not_equals')).toEqual({ value: 'not_in', update: 'not_in' })
    expect(operatorState(fields, path, 'in')).toEqual({
      value: 'in',
      update: undefined,
    })
    expect(fields[path].value).toBe('not_equals')
  })
})
