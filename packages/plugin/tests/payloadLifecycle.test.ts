import {
  beforeValidateTraverseFields,
  buildConfig,
  ValidationError,
  type PayloadRequest,
} from 'payload'
import { expect, it } from 'vitest'
import { questionnairePlugin } from '../src/index.js'
import { en } from '../src/translations/languages/en.js'

const { beforeChange: fieldBeforeChange } = await import(
  new URL('./fields/hooks/beforeChange/index.js', import.meta.resolve('payload')).href
)

it('reports field validation inline after the sanitized Payload traversal and skips drafts', async () => {
  const config = await buildConfig({
    secret: 'test',
    db: {
      defaultIDType: 'text',
      init: () => {
        throw new Error('Unexpected database initialization')
      },
    },
    plugins: [questionnairePlugin()],
  })
  const collection = config.collections.find(({ slug }) => slug === 'questionnaires')!
  const t = (key: string, options: Record<string, unknown> = {}) => {
    const message =
      en['plugin-questionnaire'][key.split(':')[1] as keyof (typeof en)['plugin-questionnaire']] ??
      key
    return message.replace(/{{(\w+)}}/g, (_, name: string) => String(options[name]))
  }
  const req = {
    context: {},
    t,
    i18n: { t, language: 'en' },
    payload: { config, collections: {} },
  } as unknown as PayloadRequest
  const data: Record<string, any> = {
    title: ' ',
    pages: [
      {
        blockType: 'page',
        questions: [
          {
            name: 'same',
            label: ' ',
            answer: [{ blockType: 'yesNo', yesLabel: ' SAME ', noLabel: 'same' }],
          },
          {
            name: 'same',
            label: 'Choice',
            answer: [{ blockType: 'choice', options: [{ label: ' Red ' }, { label: 'red' }] }],
          },
          { name: 'bad-name', label: 'Text', answer: [{ blockType: 'text', maxLength: 0 }] },
        ],
      },
    ],
  }
  await beforeValidateTraverseFields({
    collection,
    context: {},
    data,
    doc: {},
    fields: collection.fields,
    global: null,
    operation: 'create',
    overrideAccess: true,
    parentIndexPath: '',
    parentPath: '',
    parentSchemaPath: '',
    req,
    siblingData: data,
    siblingDoc: {},
  })
  const fields = {
    collection,
    context: {},
    data,
    doc: {},
    docWithLocales: {},
    global: null,
    operation: 'create',
    overrideAccess: true,
    req,
  }
  try {
    await fieldBeforeChange(fields)
    expect.fail('Expected field errors')
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error
    expect(error.data?.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'title', message: 'Enter a value.' }),
        expect.objectContaining({ path: 'pages.0.questions.0.label', message: 'Enter a value.' }),
        expect.objectContaining({
          path: 'pages.0.questions.1.name',
          message: 'Question names must be unique.',
        }),
        expect.objectContaining({
          path: 'pages.0.questions.0.answer.0.yesLabel',
          message: 'Option labels must be unique within a question.',
        }),
        expect.objectContaining({
          path: 'pages.0.questions.1.answer.0.options.1.label',
          message: 'Option labels must be unique within a question.',
        }),
        expect.objectContaining({
          path: 'pages.0.questions.2.name',
          message: en['plugin-questionnaire'].invalidName,
        }),
        expect.objectContaining({
          path: 'pages.0.questions.2.answer.0.maxLength',
          message: 'Enter a number from 1 to 10000.',
        }),
      ]),
    )
  }
  await expect(fieldBeforeChange({ ...fields, skipValidation: true })).resolves.toBeDefined()
})

it('fills row ids and trims text before collection hooks on create', async () => {
  const config = await buildConfig({
    secret: 'test',
    db: {
      defaultIDType: 'text',
      init: () => {
        throw new Error('Unexpected database initialization')
      },
    },
    plugins: [questionnairePlugin()],
  })
  const collection = config.collections.find(({ slug }) => slug === 'questionnaires')!
  const req = { context: {}, payload: { config, collections: {} } } as unknown as PayloadRequest
  const data: Record<string, any> = {
    title: ' Survey ',
    _status: 'published',
    pages: [
      {
        blockType: 'page',
        blockName: ' Page one ',
        questions: [
          {
            label: ' Ready? ',
            answer: [{ blockType: 'yesNo', yesLabel: ' Yes ', noLabel: ' No ' }],
          },
          {
            label: ' Ready? ',
            answer: [{ blockType: 'choice', options: [{ label: ' Red ' }, { label: ' Blue ' }] }],
          },
        ],
      },
      {
        blockType: 'page',
        questions: [
          { label: ' Comment ', answer: [{ blockType: 'text', placeholder: ' Your comment ' }] },
        ],
        conditionGroups: [
          { conditions: [{ questionId: 'missing', operator: 'equals', answerId: 'gone' }] },
        ],
      },
    ],
  }
  await beforeValidateTraverseFields({
    collection,
    context: {},
    data,
    doc: {},
    fields: collection.fields,
    global: null,
    operation: 'create',
    overrideAccess: true,
    parentIndexPath: '',
    parentPath: '',
    parentSchemaPath: '',
    req,
    siblingData: data,
    siblingDoc: {},
  })
  for (const hook of collection.hooks.beforeValidate) {
    await hook({ data, collection, context: {}, operation: 'create', req })
  }
  const first = data.pages[0]
  const last = data.pages[1]
  for (const row of [
    first,
    ...first.questions,
    first.questions[0].answer[0],
    first.questions[1].answer[0],
    ...first.questions[1].answer[0].options,
    last,
    ...last.questions,
    last.conditionGroups[0],
    last.conditionGroups[0].conditions[0],
  ]) {
    expect(row.id).toEqual(expect.any(String))
    expect(row.id.length).toBeGreaterThan(0)
  }
  expect(data.title).toBe('Survey')
  expect(first.blockName).toBe('Page one')
  expect(first.questions.map((question: any) => question.name)).toEqual(['ready', 'ready_2'])
  expect(first.questions[0].label).toBe('Ready?')
  expect(first.questions[0].answer[0]).toMatchObject({
    yesLabel: 'Yes',
    noLabel: 'No',
    yesId: expect.any(String),
    noId: expect.any(String),
  })
  expect(first.questions[1].answer[0].options[0].label).toBe('Red')
  expect(last.questions[0].answer[0].placeholder).toBe('Your comment')
  try {
    await collection.hooks.beforeChange[0]({
      data,
      collection,
      context: {},
      operation: 'create',
      req,
      originalDoc: undefined as never,
    })
    expect.fail('Expected structural validation')
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).data?.errors).toEqual([
      {
        path: 'pages.1.conditionGroups.0.conditions.0.questionId',
        message: 'The source question does not exist.',
      },
    ])
  }
})
