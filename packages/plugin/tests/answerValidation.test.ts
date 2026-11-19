import { describe, expect, it } from 'vitest'
import { Questionnaires } from '../src/collections/Questionnaires.js'
import { QuestionnairePage } from '../src/blocks/questionnairePage.js'
import { validateConditionAnswer } from '../src/condition/validateAnswer.js'

const context = (questionId = 'choice', pageIndex = '1') => ({
  data: {
    pages: [
      {
        id: 'first',
        blockType: 'page',
        questions: [
          {
            id: 'choice',
            answer: [{ blockType: 'choice', options: [{ id: 'a' }, { id: 'b' }] }],
          },
          {
            id: 'bool',
            answer: [
              { blockType: 'yesNo',  yesId: 'yes', noId: 'no'  },
            ],
          },
        ],
      },
      { id: 'second', blockType: 'page' },
    ],
  },
  path: ['pages', pageIndex, 'conditionGroups', '0', 'conditions', '0', 'answerId'],
  siblingData: { questionId },
})

describe('condition answer validation', () => {
  it.each(['a', 'b'])('accepts the current option %s', (id) => {
    expect(validateConditionAnswer(id, context())).toBe(true)
  })
  it.each(['yes', 'no'])('accepts the current boolean id %s', (id) => {
    expect(validateConditionAnswer(id, context('bool'))).toBe(true)
  })
  it.each([undefined, null, '', 'deleted', 'yes', ['a']])(
    'rejects missing or stale options: %s',
    (id) => {
      expect(validateConditionAnswer(id, context())).toEqual(expect.any(String))
    },
  )
  it('rejects an option removed since the last save', () => {
    const options = context()
    expect(validateConditionAnswer('a', options)).toBe(true)
    const answer = options.data.pages[0].questions![0].answer[0]
    if ('options' in answer) answer.options.shift()
    expect(validateConditionAnswer('a', options)).toEqual(expect.any(String))
  })
  it('lets operator validation report an unavailable question', () => {
    expect(validateConditionAnswer('a', context('missing'))).toBe(true)
    expect(validateConditionAnswer('a', context('choice', '0'))).toBe(true)
  })
  it('supports admin field state without a path', () => {
    expect(validateConditionAnswer('a', {})).toBe(true)
    expect(validateConditionAnswer(null, {})).toEqual(expect.any(String))
  })
  it('attaches validation and keeps draft validation disabled', () => {
    const group = QuestionnairePage.fields.find(
      (field) => 'name' in field && field.name === 'conditionGroups',
    )
    const conditions =
      group?.type === 'array'
        ? group.fields.find((field) => 'name' in field && field.name === 'conditions')
        : undefined
    const answer =
      conditions?.type === 'array'
        ? conditions.fields.find((field) => 'name' in field && field.name === 'answerId')
        : undefined
    expect(answer && 'validate' in answer && answer.validate).toBe(validateConditionAnswer)
    expect(typeof Questionnaires.versions === 'object' && Questionnaires.versions.drafts).toBe(true)
  })
})
