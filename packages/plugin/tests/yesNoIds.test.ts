import { describe, expect, it } from 'vitest'
import type { CollectionBeforeChangeHook } from 'payload'
import { normalizeYesNoIds } from '../src/blocks/Answers/normalizeYesNoIds.js'
import { questionnaireBeforeChange, Questionnaires, QuestionnairePage } from '../src/index.js'

const boolean = (yesId?: unknown, noId?: unknown) => ({
  blockType: 'yesNo',
   yesLabel: 'Yes', noLabel: 'No', yesId, noId ,
})
const page = (...answers: ReturnType<typeof boolean>[]) => ({
  blockType: 'page',
  questions: answers.map((answer) => ({ answer: [answer] })),
})
const question = (id: string, yesId = 'yes', noId = 'no') => ({
  id,
  answer: [boolean(yesId, noId)],
})
const questionPage = (id: string, ...rows: ReturnType<typeof question>[]) => ({
  id,
  blockType: 'page',
  questions: rows,
})
const condition = (questionId: string, answerId: string) => ({
  questionId,
  operator: 'equals',
  answerId,
})
const groups = (...conditions: ReturnType<typeof condition>[]) => [{ match: 'all', conditions }]
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
  hook: CollectionBeforeChangeHook = questionnaireBeforeChange(blocksField),
) =>
  hook({
    data,
    originalDoc,
    operation: 'update',
    collection: Questionnaires,
    context: {},
    req: { context: { isRestoringVersion: restoring } },
  } as unknown as Parameters<CollectionBeforeChangeHook>[0])

describe('collection boolean id hook', () => {
  it('ships once on Questionnaires and leaves QuestionnairePage opt-in', async () => {
    const hooks = Questionnaires.hooks?.beforeChange ?? []
    expect(hooks).toHaveLength(1)
    const field = QuestionnairePage.fields.find(
      (field) => 'name' in field && field.name === 'questions',
    )
    expect(field && 'hooks' in field ? field.hooks : undefined).toBeUndefined()
    const data = { pages: [page(boolean(null, ''))] }
    const result = await runHook(data, undefined, 'pages', false, hooks[0])
    expect(result).toEqual({ pages: [page(boolean(expect.any(String), expect.any(String)))] })
    expect(await runHook(result)).toEqual(result)
    expect(data).toEqual({ pages: [page(boolean(null, ''))] })
  })

  it.each(['pages', 'surveyPages'])(
    'rewrites conditions outside the %s blocks field',
    async (blocksField) => {
      const original = questionPage('original-page', question('original'))
      const copy = questionPage('copy-page', question('copy'))
      const originalDoc = { [blocksField]: [original] }
      const data = {
        before: { conditionGroups: groups(condition('copy', 'yes'), condition('copy', 'no')) },
        [blocksField]: [copy, original],
        elsewhere: [page(boolean('yes', 'no'))],
        after: { conditionGroups: groups(condition('copy', 'yes'), condition('original', 'yes')) },
      }
      const snapshot = structuredClone(data)
      freeze(data)
      freeze(originalDoc)
      const result = await runHook(data, originalDoc, blocksField)
      const replacement = result[blocksField][0].questions[0].answer[0]
      expect(replacement.yesId).not.toBe('yes')
      expect(replacement.noId).not.toBe('no')
      expect(result).toEqual({
        before: {
          conditionGroups: groups(
            condition('copy', replacement.yesId),
            condition('copy', replacement.noId),
          ),
        },
        [blocksField]: [
          questionPage('copy-page', question('copy', replacement.yesId, replacement.noId)),
          original,
        ],
        elsewhere: data.elsewhere,
        after: {
          conditionGroups: groups(
            condition('copy', replacement.yesId),
            condition('original', 'yes'),
          ),
        },
      })
      expect(data).toEqual(snapshot)
      expect(await runHook(result, originalDoc, blocksField)).toEqual(result)
    },
  )

  it('leaves documents without the selected blocks field untouched', async () => {
    const data = { pages: [page(boolean('', ''))] }
    expect(await runHook(data, undefined, 'surveyPages')).toBe(data)
  })

  it.each([false, true])(
    'handles a duplicated page placed first (restoring: %s)',
    async (restoring) => {
      const original = questionPage('original-page', question('original'))
      const copy = questionPage('copy-page', question('copy'))
      const other = questionPage('other-page', question('other', 'other-yes', 'other-no'))
      const originalDoc = { pages: [other, original] }
      const data = { pages: [copy, original, other] }
      const result = await runHook(data, originalDoc, 'pages', restoring)
      const regenerated = restoring
        ? question('original', expect.any(String), expect.any(String))
        : question('copy', expect.any(String), expect.any(String))
      expect(result).toEqual({
        pages: restoring
          ? [copy, questionPage('original-page', regenerated), other]
          : [questionPage('copy-page', regenerated), original, other],
      })
      const copyIds = result.pages[0].questions[0].answer[0]
      const originalIds = result.pages[1].questions[0].answer[0]
      expect(copyIds.yesId).not.toBe(originalIds.yesId)
      expect(copyIds.noId).not.toBe(originalIds.noId)
      expect(data).toEqual({ pages: [copy, original, other] })
    },
  )

  it("rewrites restored conditions using the version's own id ownership", async () => {
    const first = questionPage('first-page', question('first'))
    const second = questionPage('second-page', question('second'))
    const data = {
      pages: [first, second],
      conditionGroups: groups(condition('first', 'yes'), condition('second', 'no')),
    }
    const result = await runHook(data, { pages: [second] }, 'pages', true)
    const replacement = result.pages[1].questions[0].answer[0]
    expect(result.pages[0]).toEqual(first)
    expect(replacement.noId).not.toBe('no')
    expect(result.conditionGroups[0].conditions).toEqual([
      condition('first', 'yes'),
      condition('second', replacement.noId),
    ])
    expect(data.conditionGroups[0].conditions).toEqual([
      condition('first', 'yes'),
      condition('second', 'no'),
    ])
  })

  it('uses version data without merging the current document during restore', async () => {
    const originalDoc = {
      pages: [
        {
          id: 'page',
          blockType: 'page',
          questions: [
            {
              id: 'question',
              answer: [{ ...boolean('current-yes', 'current-no'), id: 'answer' }],
            },
          ],
        },
      ],
    }
    const value = [{ id: 'question', answer: [{ id: 'answer', blockType: 'yesNo' }] }]
    const data = { pages: [{ id: 'page', blockType: 'page', questions: value }] }
    const result = await runHook(data, originalDoc, 'pages', true)
    expect(JSON.stringify(result)).not.toContain('current-yes')
    expect(JSON.stringify(result)).not.toContain('current-no')
    expect(result).toEqual({
      pages: [
        {
          id: 'page',
          blockType: 'page',
          questions: [
            {
              id: 'question',
              answer: [
                {
                  id: 'answer',
                  blockType: 'yesNo',
                   yesId: expect.any(String), noId: expect.any(String) ,
                },
              ],
            },
          ],
        },
      ],
    })
  })
})

describe('boolean answer ids', () => {
  it('returns the same data reference on a no-op save without copying or reading the original document', () => {
    const data = { pages: [questionPage('page', question('question'))] }
    const originalDoc = {
      get pages(): never {
        throw new Error('Unexpected original document traversal')
      },
    }
    freeze(data)
    expect(
      normalizeYesNoIds(
        data,
        () => {
          throw new Error('Unexpected id generation')
        },
        { originalDoc, blocksField: 'pages' },
      ),
    ).toBe(data)
  })

  it('keeps untouched page references when another page needs replacement', () => {
    const untouched = questionPage('first', question('first'))
    const data = { pages: [untouched, questionPage('copy', question('copy'))] }
    const result = normalizeYesNoIds(data, ids()) as typeof data
    expect(result.pages[0]).toBe(untouched)
    expect(result.pages[1]).not.toBe(data.pages[1])
  })

  it('keeps stored ids on their question row when a copy is dragged above it', () => {
    const originalDoc = { pages: [questionPage('page', question('original'))] }
    const document = { pages: [questionPage('page', question('copy'), question('original'))] }
    expect(normalizeYesNoIds(document, ids(), { originalDoc })).toEqual({
      pages: [
        questionPage('page', question('copy', 'generated-1', 'generated-2'), question('original')),
      ],
    })
    expect(document.pages[0].questions[0]).toEqual(question('copy'))
  })

  it('purely rewrites matching conditions throughout the document when a copy gets new ids', () => {
    const originalDoc = { pages: [questionPage('original-page', question('original'))] }
    const document = {
      before: {
        conditionGroups: groups(
          condition('copy', 'yes'),
          condition('original', 'yes'),
          condition('copy', 'no'),
          condition('other', 'yes'),
          condition('copy', 'unrelated'),
          condition('copy', ''),
        ),
      },
      pages: [
        questionPage('copy-page', question('copy')),
        questionPage('original-page', question('original')),
      ],
      after: [
        {
          nested: {
            conditionGroups: groups(condition('copy', 'yes'), condition('original', 'no')),
          },
        },
      ],
      unrelated: condition('copy', 'yes'),
    }
    const snapshot = structuredClone(document)
    freeze(document)
    freeze(originalDoc)
    const result = normalizeYesNoIds(document, ids(), { originalDoc })
    expect(result).toEqual({
      before: {
        conditionGroups: groups(
          condition('copy', 'generated-1'),
          condition('original', 'yes'),
          condition('copy', 'generated-2'),
          condition('other', 'yes'),
          condition('copy', 'unrelated'),
          condition('copy', ''),
        ),
      },
      pages: [
        questionPage('copy-page', question('copy', 'generated-1', 'generated-2')),
        questionPage('original-page', question('original')),
      ],
      after: [
        {
          nested: {
            conditionGroups: groups(condition('copy', 'generated-1'), condition('original', 'no')),
          },
        },
      ],
      unrelated: condition('copy', 'yes'),
    })
    expect(document).toEqual(snapshot)
    expect(normalizeYesNoIds(result, ids(), { originalDoc })).toEqual(result)
  })

  it('keeps conditions on an id retained by the same question when both choices shared it', () => {
    const original = questionPage('original-page', question('original', 'shared', 'shared'))
    const document = {
      pages: [questionPage('copy-page', question('copy', 'shared', 'shared')), original],
      conditionGroups: groups(condition('original', 'shared'), condition('copy', 'shared')),
    }
    expect(normalizeYesNoIds(document, ids(), { originalDoc: { pages: [original] } })).toEqual({
      pages: [
        questionPage('copy-page', question('copy', 'generated-1', 'generated-2')),
        questionPage('original-page', question('original', 'shared', 'generated-3')),
      ],
      conditionGroups: groups(condition('original', 'shared'), condition('copy', 'generated-1')),
    })
  })

  it('falls back to document order when the stored holder is absent', () => {
    const originalDoc = { pages: [questionPage('page', question('removed'))] }
    const document = { pages: [questionPage('page', question('first'), question('second'))] }
    expect(normalizeYesNoIds(document, ids(), { originalDoc })).toEqual({
      pages: [
        questionPage('page', question('first'), question('second', 'generated-1', 'generated-2')),
      ],
    })
  })

  it('fills missing or invalid ids without touching other answer types', () => {
    const document = Object.freeze({
      pages: Object.freeze([page(boolean(null, ''), boolean(7, '   '))]),
      other: { blockType: 'choice', yesId: 'untouched', noId: null },
    })
    const expected = {
      pages: [page(boolean('generated-1', 'generated-2'), boolean('generated-3', 'generated-4'))],
      other: document.other,
    }
    const result = normalizeYesNoIds(document, ids())
    expect(result).toEqual(expected)
    expect(normalizeYesNoIds(result, ids())).toEqual(expected)
    expect(document.pages[0]).toEqual(page(boolean(null, ''), boolean(7, '   ')))
  })

  it('treats true and false ids as one namespace and fills a missing group', () => {
    expect(
      normalizeYesNoIds([boolean('shared', 'shared'), { blockType: 'yesNo' }], ids()),
    ).toEqual([
      boolean('shared', 'generated-1'),
      {
        blockType: 'yesNo',
         yesId: 'generated-2', noId: 'generated-3' ,
      },
    ])
  })

  it('does not generate an id that belongs to a later answer', () => {
    expect(
      normalizeYesNoIds({ pages: [page(boolean(undefined, 'generated-1'))] }, ids()),
    ).toEqual({
      pages: [page(boolean('generated-2', 'generated-1'))],
    })
  })

  it('keeps the first occurrence and replaces duplicates across questions and pages', () => {
    const document = {
      pages: [page(boolean('yes', 'no')), page(boolean('yes', 'no'), boolean('no', undefined))],
    }
    expect(normalizeYesNoIds(document, ids())).toEqual({
      pages: [
        page(boolean('yes', 'no')),
        page(boolean('generated-1', 'generated-2'), boolean('generated-3', 'generated-4')),
      ],
    })
    expect(document.pages[1]).toEqual(page(boolean('yes', 'no'), boolean('no', undefined)))
  })
})
