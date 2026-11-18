import { describe, expect, it } from 'vitest'
import { normalizeBooleanIds, normalizePageBooleanIds } from '../src/blocks/Answers/normalizeBooleanIds.js'
import { StandardPage } from '../src/blocks/formPage.js'

const boolean = (trueId?: unknown, falseId?: unknown) => ({
  blockType: 'booleanOptions',
  booleanOptions: { trueOption: 'Yes', falseOption: 'No', trueId, falseId },
})
const page = (...answers: ReturnType<typeof boolean>[]) => ({
  blockType: 'standardPage',
  questionAnswerPair: answers.map((answer) => ({ answer: [answer] })),
})
const ids = () => {
  let next = 0
  return () => `generated-${++next}`
}

describe('StandardPage boolean id hook', () => {
  it('uses version data without merging the current document during restore', () => {
    const originalDoc = { pages: [{ id: 'page', blockType: 'standardPage', questionAnswerPair: [{
      id: 'question', answer: [{ ...boolean('current-yes', 'current-no'), id: 'answer' }],
    }] }] }
    const value = [{ id: 'question', answer: [{ id: 'answer', blockType: 'booleanOptions' }] }]
    const data = { pages: [{ id: 'page', blockType: 'standardPage', questionAnswerPair: value }] }
    const result = normalizePageBooleanIds({ data, originalDoc, value,
      path: ['pages', 0, 'questionAnswerPair'], req: { context: { isRestoringVersion: true } } })
    expect(JSON.stringify(result)).not.toContain('current-yes')
    expect(JSON.stringify(result)).not.toContain('current-no')
    expect(result).toEqual([{ id: 'question', answer: [{ id: 'answer', blockType: 'booleanOptions',
      booleanOptions: { trueId: expect.any(String), falseId: expect.any(String) },
    }] }])
  })

  it.each([false, true])('keeps document order when page hooks run in reverse order (already normalized: %s)', (normalizedFirst) => {
    const first = page(boolean('yes', 'no'))
    const second = page(boolean('yes', 'no'))
    const data = { pages: [first, second] }
    const firstArgs = { data, originalDoc: undefined, path: ['pages', 0, 'questionAnswerPair'], value: first.questionAnswerPair }
    if (normalizedFirst) {
      Object.assign(first, { questionAnswerPair: normalizePageBooleanIds(firstArgs) })
    }
    const secondResult = normalizePageBooleanIds({ data, originalDoc: undefined,
      path: ['pages', 1, 'questionAnswerPair'], value: second.questionAnswerPair })
    Object.assign(second, { questionAnswerPair: secondResult })
    expect(normalizePageBooleanIds(firstArgs)).toEqual(page(boolean('yes', 'no')).questionAnswerPair)
    expect(JSON.stringify(secondResult)).not.toContain('"yes"')
    expect(JSON.stringify(secondResult)).not.toContain('"no"')
    expect(normalizePageBooleanIds({ data, originalDoc: undefined,
      path: ['pages', 1, 'questionAnswerPair'], value: second.questionAnswerPair })).toEqual(secondResult)
  })

  it('uses stored rows by id when an earlier reordered page omits its questions', () => {
    const originalDoc = { sections: [{ id: 'section', pages: [
      { ...page(boolean('other-yes', 'other-no')), id: 'a' },
      { ...page(boolean('yes', 'no')), id: 'b' },
    ] }] }
    const changed = { ...page(boolean('yes', 'no')), id: 'a' }
    const data = { sections: [{ id: 'section', pages: [{ id: 'b' }, changed] }] }
    const result = normalizePageBooleanIds({ data, originalDoc,
      path: ['sections', 0, 'pages', 1, 'questionAnswerPair'], value: changed.questionAnswerPair })
    expect(JSON.stringify(result)).not.toContain('"yes"')
    expect(JSON.stringify(result)).not.toContain('"no"')
    expect(normalizePageBooleanIds({ data, originalDoc,
      path: ['sections', 0, 'pages', 0, 'questionAnswerPair'], value: originalDoc.sections[0].pages[1].questionAnswerPair,
    })).toEqual(page(boolean('yes', 'no')).questionAnswerPair)
    expect(data.sections[0].pages[0]).toEqual({ id: 'b' })
  })

  it('ships with StandardPage and normalizes across separately embedded page fields', () => {
    const field = StandardPage.fields.find((field) => 'name' in field && field.name === 'questionAnswerPair')
    expect(field && 'hooks' in field && field.hooks?.beforeValidate).toContain(normalizePageBooleanIds)
    const first = page(boolean('yes', 'no'))
    const second = page(boolean('yes', 'no'))
    const data = { content: { first: [first], second: [second] } }
    const result = normalizePageBooleanIds({ data, originalDoc: undefined,
      path: ['content', 'second', '0', 'questionAnswerPair'], value: second.questionAnswerPair })
    expect(result).toEqual([{ answer: [{ blockType: 'booleanOptions', booleanOptions: {
      trueOption: 'Yes', falseOption: 'No', trueId: expect.any(String), falseId: expect.any(String),
    } }] }])
    expect(JSON.stringify(result)).not.toContain('"yes"')
    expect(JSON.stringify(result)).not.toContain('"no"')
    expect(data.content.second[0]).toEqual(second)
  })
})

describe('boolean answer ids', () => {
  it('fills missing or invalid ids without touching other answer types', () => {
    const document = Object.freeze({
      pages: Object.freeze([page(boolean(null, ''), boolean(7, '   '))]),
      other: { blockType: 'multipleChoice', trueId: 'untouched', falseId: null },
    })
    const expected = {
      pages: [page(boolean('generated-1', 'generated-2'), boolean('generated-3', 'generated-4'))],
      other: document.other,
    }
    const result = normalizeBooleanIds(document, ids())
    expect(result).toEqual(expected)
    expect(normalizeBooleanIds(result, ids())).toEqual(expected)
    expect(document.pages[0]).toEqual(page(boolean(null, ''), boolean(7, '   ')))
  })

  it('treats true and false ids as one namespace and fills a missing group', () => {
    expect(normalizeBooleanIds([boolean('shared', 'shared'), { blockType: 'booleanOptions' }], ids())).toEqual([
      boolean('shared', 'generated-1'),
      { blockType: 'booleanOptions', booleanOptions: { trueId: 'generated-2', falseId: 'generated-3' } },
    ])
  })

  it('does not generate an id that belongs to a later answer', () => {
    expect(normalizeBooleanIds({ pages: [page(boolean(undefined, 'generated-1'))] }, ids())).toEqual({
      pages: [page(boolean('generated-2', 'generated-1'))],
    })
  })

  it('keeps the first occurrence and replaces duplicates across questions and pages', () => {
    const document = { pages: [page(boolean('yes', 'no')), page(boolean('yes', 'no'), boolean('no', undefined))] }
    expect(normalizeBooleanIds(document, ids())).toEqual({
      pages: [page(boolean('yes', 'no')), page(boolean('generated-1', 'generated-2'), boolean('generated-3', 'generated-4'))],
    })
    expect(document.pages[1]).toEqual(page(boolean('yes', 'no'), boolean('no', undefined)))
  })
})
