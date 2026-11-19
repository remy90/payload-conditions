import { describe, expect, it } from 'vitest'
import { applyAnswer, evaluatePage, nextPageId } from '../src/index.js'
import { fromPayloadQuestionnaire, type StoredQuestionnaire } from '../src/payload.js'

describe('Payload document adapter', () => {
  it('maps the stored schema, ids, titles and defaults without mutating the document', () => {
    const doc: StoredQuestionnaire = {
      id: 0,
      title: 'Survey',
      pages: [
        {
          id: 1, blockType: 'page', blockName: 'Start',
          questions: [
            { id: 10, name: 'continue', label: 'Continue?', answer: [{ blockType: 'yesNo', yesId: 100, noId: 101 }] },
            { id: 11, name: 'colours', label: 'Colours', required: false, answer: [{ blockType: 'choice', hasMany: true, options: [{ id: 110, label: 'Red' }, { id: 111, label: 'Blue' }] }] },
            { id: 12, name: 'details', label: 'Details', answer: [{ blockType: 'text', placeholder: 'Your name', maxLength: 40 }] },
          ],
        },
        {
          id: 2, blockType: 'page', skippable: true, match: 'any',
          conditionGroups: [{ id: 20, match: 'any', conditions: [{ id: 200, questionId: 10, operator: 'equals', answerId: 100 }] }],
        },
      ],
    }
    const before = structuredClone(doc)
    const q = fromPayloadQuestionnaire(doc)
    expect(q).toEqual({
      id: '0', title: 'Survey', pages: [
        {
          id: '1', title: 'Start', skippable: false, match: 'all', conditionGroups: [],
          questions: [
            { id: '10', name: 'continue', label: 'Continue?', required: true, answer: { type: 'yesNo', yes: { id: '100', label: 'Yes' }, no: { id: '101', label: 'No' } } },
            { id: '11', name: 'colours', label: 'Colours', required: false, answer: { type: 'choice', hasMany: true, options: [{ id: '110', label: 'Red' }, { id: '111', label: 'Blue' }] } },
            { id: '12', name: 'details', label: 'Details', required: true, answer: { type: 'text', placeholder: 'Your name', maxLength: 40 } },
          ],
        },
        { id: '2', skippable: true, questions: [], match: 'any', conditionGroups: [{ id: '20', match: 'any', conditions: [{ id: '200', questionId: '10', operator: 'equals', answerId: '100' }] }] },
      ],
    })
    const result = applyAnswer(q, new Map(), '10', ['100'])
    expect(nextPageId(q, result.visiblePageIds, '1')).toBe('2')
    expect(doc).toEqual(before)
  })

  it('accepts generated interfaces containing additional blocks', () => {
    interface ExtraAnswer { blockType: 'extraAnswer'; content: string }
    interface GeneratedPage { blockType: 'page'; id: string; questions: { id: string; answer: ExtraAnswer[] }[] }
    interface ExtraPage { blockType: 'extraPage'; content: string }
    interface GeneratedDocument { id: number; pages: (GeneratedPage | ExtraPage)[] }
    const doc: GeneratedDocument = { id: 1, pages: [
      { blockType: 'extraPage', content: '' },
      { blockType: 'page', id: 'page', questions: [{ id: 'question', answer: [{ blockType: 'extraAnswer', content: '' }] }] },
    ] }
    expect(fromPayloadQuestionnaire(doc).pages.map((page) => page.id)).toEqual(['page'])
  })

  it('handles nullable fields, missing ids and the first usable answer block', () => {
    const q = fromPayloadQuestionnaire({ id: null, title: null, pages: [
      { blockType: 'futurePage', id: 'unknown' }, { blockType: 'page' },
      { blockType: 'page', id: 'page', questions: [
        { answer: [{ blockType: 'text' }] },
        { id: 'unknown', answer: [{ blockType: 'futureAnswer' }] },
        { id: 'missingYes', answer: [{ blockType: 'yesNo', noId: 'no' }] },
        { id: 'missingNo', answer: [{ blockType: 'yesNo', yesId: 'yes' }] },
        { id: 'text', name: null, label: null, required: null, answer: [{ blockType: 'yesNo' }, { blockType: 'text', placeholder: null, maxLength: null }] },
        { id: 'choice', answer: [{ blockType: 'choice', options: [{ label: 'No id' }, { id: 0, label: null }] }] },
      ], conditionGroups: [
        { conditions: [{ id: 'c', questionId: 'text', operator: 'equals', answerId: 'value' }] },
        { id: 'group', conditions: [{ questionId: 'text', operator: 'equals', answerId: 'value' }] },
      ] },
    ] })
    expect(q.id).toBe('')
    expect(q.title).toBe('')
    expect(q.pages).toHaveLength(1)
    expect(q.pages[0].questions).toEqual([
      { id: 'text', name: '', label: '', required: true, answer: { type: 'text', maxLength: 2000 } },
      { id: 'choice', name: '', label: '', required: true, answer: { type: 'choice', hasMany: false, options: [{ id: '0', label: '' }] } },
    ])
    expect(evaluatePage(q, 'page', new Map())).toBe(true)
    expect(fromPayloadQuestionnaire({ pages: null })).toEqual({ id: '', title: '', pages: [] })
  })

  it.each(['questionId', 'operator', 'answerId'] as const)('keeps incomplete %s rows false with their ids', (missing) => {
    const q = fromPayloadQuestionnaire({ pages: [
      { id: 'source', blockType: 'page', questions: [{ id: 'a', answer: [{ blockType: 'choice', options: [{ id: 'no', label: 'No' }] }] }] },
      { id: 'target', blockType: 'page', conditionGroups: [{ id: 'g', conditions: [{ id: 'c', questionId: 'a', operator: 'not_equals', answerId: 'yes', [missing]: null }] }] },
    ] })
    expect(q.pages[1].conditionGroups[0].id).toBe('g')
    expect(q.pages[1].conditionGroups[0].conditions[0].id).toBe('c')
    expect(evaluatePage(q, 'target', new Map([['a', ['no']]]))).toBe(false)
  })

  it('fails closed on unknown operators and combines incomplete rows with any', () => {
    const q = fromPayloadQuestionnaire({ pages: [
      { id: 'source', blockType: 'page', questions: [{ id: 'a', answer: [{ blockType: 'choice', options: [{ id: 'yes' }] }] }] },
      { id: 'broken', blockType: 'page', conditionGroups: [{ id: 'g', conditions: [{ id: 'c', questionId: 'a', operator: 'future', answerId: 'yes' }] }] },
      { id: 'any', blockType: 'page', conditionGroups: [{ id: 'g', match: 'any', conditions: [{ id: 'incomplete' }, { id: 'valid', questionId: 'a', operator: 'equals', answerId: 'yes' }] }] },
    ] })
    expect(evaluatePage(q, 'broken', new Map([['a', ['yes']]]))).toBe(false)
    expect(evaluatePage(q, 'any', new Map([['a', ['yes']]]))).toBe(true)
  })
})
