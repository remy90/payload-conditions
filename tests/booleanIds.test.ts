import { describe, expect, it } from 'vitest'
import type { CollectionBeforeChangeHook } from 'payload'
import { normalizeBooleanIds } from '../src/blocks/Answers/normalizeBooleanIds.js'
import { normalizeBooleanIdsHook, Questionnaire, StandardPage } from '../src/index.js'

const boolean = (trueId?: unknown, falseId?: unknown) => ({
  blockType: 'booleanOptions',
  booleanOptions: { trueOption: 'Yes', falseOption: 'No', trueId, falseId },
})
const page = (...answers: ReturnType<typeof boolean>[]) => ({
  blockType: 'standardPage',
  questionAnswerPair: answers.map((answer) => ({ answer: [answer] })),
})
const question = (id: string, trueId = 'yes', falseId = 'no') => ({ id, answer: [boolean(trueId, falseId)] })
const questionPage = (id: string, ...rows: ReturnType<typeof question>[]) => ({
  id, blockType: 'standardPage', questionAnswerPair: rows,
})
const condition = (questionValue: string, answerValue: string) => ({ questionValue, operatorType: '1', answerValue })
const freeze = (value: unknown): void => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
}
const ids = () => {
  let next = 0
  return () => `generated-${++next}`
}

const runHook = (
  data: Record<string, unknown>,
  originalDoc?: Record<string, unknown>,
  blocksField = 'pages',
  restoring = false,
  hook: CollectionBeforeChangeHook = normalizeBooleanIdsHook(blocksField),
) => hook({
  data, originalDoc, operation: 'update', collection: Questionnaire, context: {},
  req: { context: { isRestoringVersion: restoring } },
} as unknown as Parameters<CollectionBeforeChangeHook>[0])

describe('collection boolean id hook', () => {
  it('ships once on Questionnaire and leaves StandardPage opt-in', async () => {
    const hooks = Questionnaire.hooks?.beforeChange ?? []
    expect(hooks).toHaveLength(1)
    const field = StandardPage.fields.find((field) => 'name' in field && field.name === 'questionAnswerPair')
    expect(field && 'hooks' in field ? field.hooks : undefined).toBeUndefined()
    const data = { pages: [page(boolean(null, ''))] }
    const result = await runHook(data, undefined, 'pages', false, hooks[0])
    expect(result).toEqual({ pages: [page(boolean(expect.any(String), expect.any(String)))] })
    expect(await runHook(result)).toEqual(result)
    expect(data).toEqual({ pages: [page(boolean(null, ''))] })
  })

  it.each(['pages', 'surveyPages'])('rewrites conditions outside the %s blocks field', async (blocksField) => {
    const original = questionPage('original-page', question('original'))
    const copy = questionPage('copy-page', question('copy'))
    const originalDoc = { [blocksField]: [original] }
    const data = {
      before: { conditionalLogicGroup: [condition('copy', 'yes'), condition('copy', 'no')] },
      [blocksField]: [copy, original],
      elsewhere: [page(boolean('yes', 'no'))],
      after: { conditionalLogicGroup: [condition('copy', 'yes'), condition('original', 'yes')] },
    }
    const snapshot = structuredClone(data)
    freeze(data)
    freeze(originalDoc)
    const result = await runHook(data, originalDoc, blocksField)
    const replacement = result[blocksField][0].questionAnswerPair[0].answer[0].booleanOptions
    expect(replacement.trueId).not.toBe('yes')
    expect(replacement.falseId).not.toBe('no')
    expect(result).toEqual({
      before: { conditionalLogicGroup: [condition('copy', replacement.trueId), condition('copy', replacement.falseId)] },
      [blocksField]: [questionPage('copy-page', question('copy', replacement.trueId, replacement.falseId)), original],
      elsewhere: data.elsewhere,
      after: { conditionalLogicGroup: [condition('copy', replacement.trueId), condition('original', 'yes')] },
    })
    expect(data).toEqual(snapshot)
    expect(await runHook(result, originalDoc, blocksField)).toEqual(result)
  })

  it('leaves documents without the selected blocks field untouched', async () => {
    const data = { pages: [page(boolean('', ''))] }
    expect(await runHook(data, undefined, 'surveyPages')).toBe(data)
  })

  it.each([false, true])('handles a duplicated page placed first (restoring: %s)', async (restoring) => {
    const original = questionPage('original-page', question('original'))
    const copy = questionPage('copy-page', question('copy'))
    const other = questionPage('other-page', question('other', 'other-yes', 'other-no'))
    const originalDoc = { pages: [other, original] }
    const data = { pages: [copy, original, other] }
    const result = await runHook(data, originalDoc, 'pages', restoring)
    const regenerated = restoring ? question('original', expect.any(String), expect.any(String))
      : question('copy', expect.any(String), expect.any(String))
    expect(result).toEqual({ pages: restoring
      ? [copy, questionPage('original-page', regenerated), other]
      : [questionPage('copy-page', regenerated), original, other],
    })
    const copyIds = result.pages[0].questionAnswerPair[0].answer[0].booleanOptions
    const originalIds = result.pages[1].questionAnswerPair[0].answer[0].booleanOptions
    expect(copyIds.trueId).not.toBe(originalIds.trueId)
    expect(copyIds.falseId).not.toBe(originalIds.falseId)
    expect(data).toEqual({ pages: [copy, original, other] })
  })

  it('uses version data without merging the current document during restore', async () => {
    const originalDoc = { pages: [{ id: 'page', blockType: 'standardPage', questionAnswerPair: [{
      id: 'question', answer: [{ ...boolean('current-yes', 'current-no'), id: 'answer' }],
    }] }] }
    const value = [{ id: 'question', answer: [{ id: 'answer', blockType: 'booleanOptions' }] }]
    const data = { pages: [{ id: 'page', blockType: 'standardPage', questionAnswerPair: value }] }
    const result = await runHook(data, originalDoc, 'pages', true)
    expect(JSON.stringify(result)).not.toContain('current-yes')
    expect(JSON.stringify(result)).not.toContain('current-no')
    expect(result).toEqual({ pages: [{ id: 'page', blockType: 'standardPage', questionAnswerPair: [{
      id: 'question', answer: [{ id: 'answer', blockType: 'booleanOptions',
        booleanOptions: { trueId: expect.any(String), falseId: expect.any(String) },
      }],
    }] }] })
  })
})

describe('boolean answer ids', () => {
  it('keeps stored ids on their question row when a copy is dragged above it', () => {
    const originalDoc = { pages: [questionPage('page', question('original'))] }
    const document = { pages: [questionPage('page', question('copy'), question('original'))] }
    expect(normalizeBooleanIds(document, ids(), { originalDoc })).toEqual({
      pages: [questionPage('page', question('copy', 'generated-1', 'generated-2'), question('original'))],
    })
    expect(document.pages[0].questionAnswerPair[0]).toEqual(question('copy'))
  })

  it('purely rewrites matching conditions throughout the document when a copy gets new ids', () => {
    const originalDoc = { pages: [questionPage('original-page', question('original'))] }
    const document = {
      before: { conditionalLogicGroup: [condition('copy', 'yes'), condition('original', 'yes'),
        condition('copy', 'no'), condition('other', 'yes'), condition('copy', 'unrelated'), condition('copy', '')] },
      pages: [questionPage('copy-page', question('copy')), questionPage('original-page', question('original'))],
      after: [{ nested: { conditionalLogicGroup: [condition('copy', 'yes'), condition('original', 'no')] } }],
      unrelated: condition('copy', 'yes'),
    }
    const snapshot = structuredClone(document)
    freeze(document)
    freeze(originalDoc)
    const result = normalizeBooleanIds(document, ids(), { originalDoc })
    expect(result).toEqual({
      before: { conditionalLogicGroup: [condition('copy', 'generated-1'), condition('original', 'yes'),
        condition('copy', 'generated-2'), condition('other', 'yes'), condition('copy', 'unrelated'), condition('copy', '')] },
      pages: [questionPage('copy-page', question('copy', 'generated-1', 'generated-2')),
        questionPage('original-page', question('original'))],
      after: [{ nested: { conditionalLogicGroup: [condition('copy', 'generated-1'), condition('original', 'no')] } }],
      unrelated: condition('copy', 'yes'),
    })
    expect(document).toEqual(snapshot)
    expect(normalizeBooleanIds(result, ids(), { originalDoc })).toEqual(result)
  })

  it('falls back to document order when the stored holder is absent', () => {
    const originalDoc = { pages: [questionPage('page', question('removed'))] }
    const document = { pages: [questionPage('page', question('first'), question('second'))] }
    expect(normalizeBooleanIds(document, ids(), { originalDoc })).toEqual({
      pages: [questionPage('page', question('first'), question('second', 'generated-1', 'generated-2'))],
    })
  })

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
