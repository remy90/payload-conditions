import { describe, expect, it } from 'vitest'
import { applyAnswer, evaluatePage, nextPageId } from '../src/index.js'
import { fromPayloadQuestionnaire, type StoredQuestionnaire } from '../src/payload.js'

describe('Payload document adapter', () => {
  it('adapts Payload answer blocks, normalizes numeric ids and supports the consumer journey', () => {
    const doc: StoredQuestionnaire = {
      id: 0,
      title: 'Survey',
      pages: [
        {
          id: 1,
          blockType: 'standardPage',
          questionAnswerPair: [
            {
              id: 10,
              question: 'Continue?',
              answer: [
                {
                  blockType: 'booleanOptions',
                  booleanOptions: {
                    trueId: 100,
                    trueOption: 'Yes',
                    falseId: 101,
                    falseOption: 'No',
                  },
                },
              ],
            },
            {
              id: 11,
              optional: true,
              answer: [
                {
                  blockType: 'multipleChoice',
                  allowMultipleSelection: true,
                  multipleChoice: [
                    { id: 110, option: 'Red' },
                    { id: 111, option: 'Blue' },
                  ],
                },
              ],
            },
            { id: 12, answer: [{ blockType: 'inputText', inputText: 'Your name' }] },
          ],
        },
        {
          id: 2,
          blockType: 'standardPage',
          skippable: true,
          match: 'any',
          conditionGroups: [
            {
              id: 20,
              match: 'any',
              conditions: [{ id: 200, questionId: 10, operator: 'is', answerId: 100 }],
            },
          ],
        },
      ],
    }
    const before = structuredClone(doc)
    const q = fromPayloadQuestionnaire(doc)
    expect(q).toEqual({
      id: '0',
      title: 'Survey',
      pages: [
        {
          id: '1',
          skippable: false,
          match: 'all',
          conditionGroups: [],
          questions: [
            {
              id: '10',
              text: 'Continue?',
              optional: false,
              answer: {
                type: 'boolean',
                trueOption: { id: '100', label: 'Yes' },
                falseOption: { id: '101', label: 'No' },
              },
            },
            {
              id: '11',
              text: '',
              optional: true,
              answer: {
                type: 'multipleChoice',
                allowMultipleSelection: true,
                options: [
                  { id: '110', label: 'Red' },
                  { id: '111', label: 'Blue' },
                ],
              },
            },
            {
              id: '12',
              text: '',
              optional: false,
              answer: { type: 'inputText', prompt: 'Your name' },
            },
          ],
        },
        {
          id: '2',
          skippable: true,
          questions: [],
          match: 'any',
          conditionGroups: [
            { match: 'any', conditions: [{ questionId: '10', operator: 'is', answerId: '100' }] },
          ],
        },
      ],
    })
    const result = applyAnswer(q, new Map(), '10', ['100'])
    expect(nextPageId(q, result.visiblePageIds, '1')).toBe('2')
    expect(doc).toEqual(before)
  })

  it('accepts generated interfaces containing additional page and answer blocks', () => {
    interface ExtraPage {
      blockType: 'extraPage'
      id: string
      content: string
    }
    interface ExtraAnswer {
      blockType: 'extraAnswer'
      id: string
      content: string
    }
    interface StandardPage {
      blockType: 'standardPage'
      id: string
      questionAnswerPair: { id: string; answer: ExtraAnswer[] }[]
    }
    interface GeneratedDocument {
      id: number
      pages: (ExtraPage | StandardPage)[]
    }
    const generated: GeneratedDocument = {
      id: 1,
      pages: [
        { blockType: 'extraPage', id: 'extra', content: '' },
        {
          blockType: 'standardPage',
          id: 'page',
          questionAnswerPair: [
            { id: 'question', answer: [{ blockType: 'extraAnswer', id: 'answer', content: '' }] },
          ],
        },
      ],
    }
    const stored: StoredQuestionnaire = generated
    expect(fromPayloadQuestionnaire(stored).pages.map((page) => page.id)).toEqual(['page'])
  })

  it('accepts nullable fields, unknown blocks and missing row ids', () => {
    const doc: StoredQuestionnaire = {
      id: null,
      title: null,
      pages: [
        { blockType: 'futurePage', id: 'unknown', future: true },
        { blockType: 'standardPage' },
        {
          blockType: 'standardPage',
          id: 'page',
          match: null,
          questionAnswerPair: [
            { answer: [{ blockType: 'inputText' }] },
            { id: 'unknown', answer: [{ blockType: 'futureAnswer', future: true }] },
            {
              id: 'text',
              question: null,
              optional: null,
              answer: [{ blockType: 'futureAnswer' }, { blockType: 'inputText', inputText: null }],
            },
            {
              id: 'choice',
              answer: [
                {
                  blockType: 'multipleChoice',
                  multipleChoice: [{ option: 'No id' }, { id: 0, option: null }],
                },
              ],
            },
          ],
          conditionGroups: [
            { conditions: [{ id: 'c', questionId: 'text', operator: 'is', answerId: 'value' }] },
            {
              id: 'group',
              conditions: [{ questionId: 'text', operator: 'is', answerId: 'value' }],
            },
          ],
        },
      ],
    }
    const q = fromPayloadQuestionnaire(doc)
    expect(q.id).toBe('')
    expect(q.title).toBe('')
    expect(q.pages).toHaveLength(1)
    expect(q.pages[0].questions).toEqual([
      { id: 'text', text: '', optional: false, answer: { type: 'inputText', prompt: '' } },
      {
        id: 'choice',
        text: '',
        optional: false,
        answer: {
          type: 'multipleChoice',
          allowMultipleSelection: false,
          options: [{ id: '0', label: '' }],
        },
      },
    ])
    // Groups whose rows were all skipped are ignored, leaving the page visible.
    expect(evaluatePage(q, 'page', new Map())).toBe(true)
    expect(fromPayloadQuestionnaire({ pages: null })).toEqual({ id: '', title: '', pages: [] })
  })

  it('skips incomplete boolean answers and uses the first usable answer block', () => {
    const q = fromPayloadQuestionnaire({
      pages: [
        {
          id: 'page',
          blockType: 'standardPage',
          questionAnswerPair: [
            { id: 'noBooleanIds', answer: [{ blockType: 'booleanOptions', booleanOptions: null }] },
            {
              id: 'oneBooleanId',
              answer: [{ blockType: 'booleanOptions', booleanOptions: { trueId: 'yes' } }],
            },
            {
              id: 'fallback',
              answer: [
                { blockType: 'booleanOptions' },
                { blockType: 'inputText', inputText: 'Prompt' },
              ],
            },
            { id: '', answer: [{ blockType: 'inputText' }] },
          ],
        },
      ],
    })
    expect(q.pages[0].questions).toEqual([
      {
        id: 'fallback',
        text: '',
        optional: false,
        answer: { type: 'inputText', prompt: 'Prompt' },
      },
    ])
  })

  it('fails closed on unknown stored operators and combines incomplete rows with any', () => {
    const source = {
      id: 'source',
      blockType: 'standardPage' as const,
      questionAnswerPair: [
        {
          id: 'a',
          answer: [{ blockType: 'multipleChoice' as const, multipleChoice: [{ id: 'yes' }] }],
        },
      ],
    }
    const q = fromPayloadQuestionnaire({
      pages: [
        source,
        {
          id: 'broken',
          blockType: 'standardPage',
          conditionGroups: [
            {
              id: 'g',
              conditions: [{ id: 'c', questionId: 'a', operator: 'future', answerId: 'yes' }],
            },
          ],
        },
        {
          id: 'any',
          blockType: 'standardPage',
          conditionGroups: [
            {
              id: 'g',
              match: 'any',
              conditions: [
                { id: 'incomplete' },
                { id: 'valid', questionId: 'a', operator: 'is', answerId: 'yes' },
              ],
            },
          ],
        },
      ],
    })
    const answers = new Map([['a', ['yes']]])
    expect(evaluatePage(q, 'broken', answers)).toBe(false)
    expect(evaluatePage(q, 'any', answers)).toBe(true)
  })

  it.each(['questionId', 'operator', 'answerId'] as const)(
    'keeps id-bearing rows missing %s false, including negative operators',
    (missing) => {
      const storedCondition = {
        id: 'condition',
        questionId: 'a',
        operator: 'isNot',
        answerId: 'yes',
        [missing]: null,
      }
      const q = fromPayloadQuestionnaire({
        pages: [
          {
            id: 'source',
            blockType: 'standardPage',
            questionAnswerPair: [
              {
                id: 'a',
                answer: [
                  { blockType: 'multipleChoice', multipleChoice: [{ id: 'no', option: 'No' }] },
                ],
              },
            ],
          },
          {
            id: 'target',
            blockType: 'standardPage',
            conditionGroups: [{ id: 'group', conditions: [storedCondition] }],
          },
        ],
      })
      expect(q.pages[1].conditionGroups[0].conditions).toHaveLength(1)
      expect(q.pages[1].conditionGroups[0].match).toBe('all')
      expect(evaluatePage(q, 'target', new Map([['a', ['no']]]))).toBe(false)
    },
  )
})
