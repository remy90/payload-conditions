import { beforeValidateTraverseFields, buildConfig, ValidationError, type PayloadRequest } from 'payload'
import { expect, it } from 'vitest'
import { questionnairePlugin } from '../src/index.js'

it('fills row ids and trims text before collection hooks on create', async () => {
  const config = await buildConfig({
    secret: 'test',
    db: { defaultIDType: 'text', init: () => { throw new Error('Unexpected database initialization') } },
    plugins: [questionnairePlugin()],
  })
  const collection = config.collections.find(({ slug }) => slug === 'questionnaires')!
  const req = { context: {}, payload: { config, collections: {} } } as unknown as PayloadRequest
  const data: Record<string, any> = {
    title: ' Survey ',
    _status: 'published',
    pages: [
      { blockType: 'page', blockName: ' Page one ', questions: [
        { label: ' Ready? ', answer: [{ blockType: 'yesNo', yesLabel: ' Yes ', noLabel: ' No ' }] },
        { label: ' Ready? ', answer: [{ blockType: 'choice', options: [{ label: ' Red ' }, { label: ' Blue ' }] }] },
      ] },
      { blockType: 'page', questions: [{ label: ' Comment ', answer: [{ blockType: 'text', placeholder: ' Your comment ' }] }], conditionGroups: [
        { conditions: [{ questionId: 'missing', operator: 'equals', answerId: 'gone' }] },
      ] },
    ],
  }
  await beforeValidateTraverseFields({
    collection, context: {}, data, doc: {}, fields: collection.fields, global: null,
    operation: 'create', overrideAccess: true, parentIndexPath: '', parentPath: '', parentSchemaPath: '',
    req, siblingData: data, siblingDoc: {},
  })
  for (const hook of collection.hooks.beforeValidate) {
    await hook({ data, collection, context: {}, operation: 'create', req })
  }
  const first = data.pages[0]
  const last = data.pages[1]
  for (const row of [first, ...first.questions, first.questions[0].answer[0], first.questions[1].answer[0], ...first.questions[1].answer[0].options, last, ...last.questions, last.conditionGroups[0], last.conditionGroups[0].conditions[0]]) {
    expect(row.id).toEqual(expect.any(String))
    expect(row.id.length).toBeGreaterThan(0)
  }
  expect(data.title).toBe('Survey')
  expect(first.blockName).toBe('Page one')
  expect(first.questions.map((question: any) => question.name)).toEqual(['ready', 'ready_2'])
  expect(first.questions[0].label).toBe('Ready?')
  expect(first.questions[0].answer[0]).toMatchObject({ yesLabel: 'Yes', noLabel: 'No', yesId: expect.any(String), noId: expect.any(String) })
  expect(first.questions[1].answer[0].options[0].label).toBe('Red')
  expect(last.questions[0].answer[0].placeholder).toBe('Your comment')
  try {
    await collection.hooks.beforeChange[0]({ data, collection, context: {}, operation: 'create', req, originalDoc: undefined as never })
    expect.fail('Expected structural validation')
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).data?.errors).toEqual([
      { path: 'pages.1.conditionGroups.0.conditions.0.questionId', message: 'The source question does not exist.' },
    ])
  }
})
