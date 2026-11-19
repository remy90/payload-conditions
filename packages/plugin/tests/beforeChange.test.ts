import { describe, expect, it } from 'vitest'
import { ValidationError, type CollectionBeforeChangeHook } from 'payload'
import { questionnaireBeforeChange } from '../src/hooks/questionnaireBeforeChange.js'
import { issueErrors } from '../src/hooks/issueErrors.js'

const question = (id: string, answer: object = { blockType: 'yesNo', yesId: `${id}-yes`, noId: `${id}-no`, yesLabel: 'Yes', noLabel: 'No' }) => ({
  id, name: id, label: id, required: true, answer: [answer],
})
const document = () => ({ title: 'Survey', pages: [
  { id: 'p1', blockType: 'page', questions: [question('q1')] },
  { id: 'p2', blockType: 'page', questions: [question('q2')], conditionGroups: [{ id: 'g', conditions: [
    { id: 'c', questionId: 'missing', operator: 'equals', answerId: 'gone' },
  ] }] },
] })
const run = (data: Record<string, unknown>, versions: unknown = { drafts: true }, originalDoc?: object, blocksField = 'pages') =>
  questionnaireBeforeChange(blocksField)({ data, originalDoc, collection: { slug: 'custom', versions }, req: { context: {} } } as unknown as Parameters<CollectionBeforeChangeHook>[0])

it('maps condition issues without looking up the missing source question', () => {
  const data = document()
  expect(issueErrors(data, [{ code: 'unknownAnswer', message: 'engine text', pageId: 'p2', groupId: 'g', conditionId: 'c', questionId: 'missing' }])).toEqual([
    { path: 'pages.1.conditionGroups.0.conditions.0.answerId', message: 'Select a current answer option for the selected question.' },
  ])
})

it('keeps every duplicate id path and reports second and subsequent occurrences', () => {
  const data = { pages: [{ id: 'same', blockType: 'page', questions: [question('same'), question('same')] }] }
  expect(issueErrors(data, [
    { code: 'duplicateId', message: '', pageId: 'same', questionId: 'same' },
    { code: 'duplicateId', message: '', pageId: 'same', questionId: 'same', optionId: 'same-yes' },
    { code: 'duplicateId', message: '', pageId: 'same', questionId: 'same', optionId: 'same-no' },
    { code: 'duplicateId', message: '', pageId: 'same', questionId: 'same' },
  ]).map((error) => error.path)).toEqual([
    'pages.0.questions.0.id', 'pages.0.questions.1.answer.0.yesId', 'pages.0.questions.1.answer.0.noId', 'pages.0.questions.1.id',
  ])
})

it('maps label and title locations and drops field-validator issues and incomplete conditions', () => {
  const data = document()
  data.pages[1].conditionGroups![0].conditions[0].answerId = ''
  expect(issueErrors(data, [
    { code: 'blankText', message: '' },
    { code: 'duplicateOptionLabel', message: '', pageId: 'p1', questionId: 'q1', optionId: 'q1-yes' },
    { code: 'unknownQuestion', message: '', pageId: 'p2', groupId: 'g', conditionId: 'c' },
  ])).toEqual([])
})

describe('publish gating and inline ValidationError', () => {
  it('saves drafts and blocks publishing with field errors', async () => {
    const data = document()
    expect(await run({ ...data, _status: 'draft' })).toEqual({ ...data, _status: 'draft' })
    try {
      await run({ ...data, _status: 'published' })
      expect.fail('Expected validation')
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      expect((error as ValidationError).status).toBe(400)
      expect((error as ValidationError).data).toMatchObject({ collection: 'custom', errors: [
        { path: 'pages.1.conditionGroups.0.conditions.0.questionId', message: 'The source question does not exist.' },
      ] })
    }
  })

  it.each([false, undefined, {}, { drafts: false }, { drafts: { validate: true } }])('validates without drafts or with drafts.validate: %j', async (versions) => {
    const settings = versions === undefined ? null : versions
    await expect(run(document(), settings)).rejects.toBeInstanceOf(ValidationError)
  })

  it('uses original status on partial updates and supports a custom blocks field', async () => {
    const data = document()
    await expect(run({ survey: data.pages }, { drafts: true }, { title: 'Survey', _status: 'published' }, 'survey')).rejects.toBeInstanceOf(ValidationError)
    expect(await run({ title: 'Changed', _status: 'draft' }, { drafts: true }, data)).toEqual({ title: 'Changed', _status: 'draft' })
  })

  it('normalizes ids, then maps operators before structural validation', async () => {
    const data = document()
    data.pages[1].conditionGroups![0].conditions[0] = { id: 'c', questionId: 'q1', operator: 'in', answerId: 'q1-yes' }
    const result = await run({ ...data, _status: 'published' })
    expect(result.pages[1].conditionGroups[0].conditions[0].operator).toBe('equals')
  })
})
