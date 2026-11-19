import { createRequire } from 'node:module'
import {
  beforeChangeTraverseFields,
  beforeValidateTraverseFields,
  buildConfig,
  ValidationError,
  type PayloadRequest,
  type ValidationFieldError,
} from 'payload'
import { expect, it } from 'vitest'
import { QuestionnairePage, questionnaireBeforeChange, questionnairePlugin } from '../src/index.js'
import { en } from '../src/translations/languages/en.js'
import { translate } from '../src/translations/index.js'

// Resolve Payload's existing dependency without adding it to the plugin.
const { t: payloadTranslate } = await import(
  createRequire(import.meta.resolve('payload')).resolve('@payloadcms/translations')
)

type FieldChangeArgs = Pick<
  Parameters<typeof beforeChangeTraverseFields>[0],
  | 'collection'
  | 'context'
  | 'data'
  | 'doc'
  | 'docWithLocales'
  | 'global'
  | 'operation'
  | 'overrideAccess'
  | 'req'
  | 'skipValidation'
>
const fieldBeforeChange = async (args: FieldChangeArgs) => {
  const data = structuredClone(args.data)
  const errors: ValidationFieldError[] = []
  await beforeChangeTraverseFields({
    ...args,
    data,
    errors,
    fields: args.collection!.fields,
    fieldLabelPath: '',
    mergeLocaleActions: [],
    parentIndexPath: '',
    parentPath: '',
    parentSchemaPath: '',
    siblingData: data,
    siblingDoc: args.doc,
    siblingDocWithLocales: args.docWithLocales,
  })
  if (errors.length)
    throw new ValidationError(
      { collection: args.collection!.slug, errors, req: args.req },
      args.req.t,
    )
  return data
}

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
  const fields: FieldChangeArgs = {
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

it.each([false, true])(
  'uses English in a host-composed collection with the plugin disabled: %s',
  async (disabled) => {
    const config = await buildConfig({
      secret: 'test',
      db: {
        defaultIDType: 'text',
        init: () => {
          throw new Error('Unexpected database initialization')
        },
      },
      plugins: disabled ? [questionnairePlugin({ enabled: false })] : [],
      collections: [
        {
          slug: 'host',
          hooks: { beforeChange: [questionnaireBeforeChange()] },
          fields: [{ name: 'pages', type: 'blocks', blocks: [QuestionnairePage] }],
        },
      ],
    })
    const translations = config.i18n.supportedLanguages.en!.translations
    expect(translations).not.toHaveProperty('plugin-questionnaire')
    const t = (key: string, vars?: Record<string, unknown>) =>
      payloadTranslate({ key, vars, translations })
    const req = { t } as unknown as PayloadRequest
    const pluralLabel = QuestionnairePage.labels?.plural
    if (typeof pluralLabel !== 'function') throw new Error('Expected a page label callback')
    expect(pluralLabel({ t } as never)).toBe('Pages')
    const title = QuestionnairePage.fields.find(
      (field) => 'name' in field && field.name === 'blockName',
    )!
    if (title.type !== 'text' || title.hasMany || typeof title.validate !== 'function')
      throw new Error('Expected a title validator')
    expect(await title.validate('x'.repeat(121), { req } as never)).toBe(
      'Use at most 120 characters.',
    )
    expect(translate({ t }, 'questionCount', { count: 1 })).toBe('1 question')
    expect(translate({ t }, 'questionCount', { count: 2 })).toBe('2 questions')
    const custom = (key: string, vars?: Record<string, unknown>) =>
      payloadTranslate({
        key,
        vars,
        translations: {
          ...translations,
          'plugin-questionnaire': {
            ...en['plugin-questionnaire'],
            questionCount_one: '{{count}} custom question',
            questionCount_other: '{{count}} custom questions',
          },
        },
      })
    expect(translate({ t: custom }, 'questionCount', { count: 1 })).toBe('1 custom question')
    expect(translate({ t: custom }, 'questionCount', { count: 5 })).toBe('5 custom questions')
  },
)

it('fills names deterministically in a host-composed collection with a custom blocks field', async () => {
  const config = await buildConfig({
    secret: 'test',
    db: {
      defaultIDType: 'text',
      init: () => {
        throw new Error('Unexpected database initialization')
      },
    },
    collections: [
      {
        slug: 'host',
        hooks: { beforeChange: [questionnaireBeforeChange('survey')] },
        fields: [{ name: 'survey', type: 'blocks', blocks: [QuestionnairePage] }],
      },
    ],
  })
  const collection = config.collections.find(({ slug }) => slug === 'host')!
  const t = (key: string, vars?: Record<string, unknown>) =>
    payloadTranslate({ key, vars, translations: config.i18n.supportedLanguages.en!.translations })
  const req = {
    context: {},
    t,
    i18n: { t, language: 'en' },
    payload: { config, collections: {} },
  } as unknown as PayloadRequest
  const row = (name?: string) => ({ label: ' Ready? ', name, answer: [{ blockType: 'text' }] })
  const data: Record<string, any> = {
    survey: [
      { blockType: 'page', questions: [row(), row('  ')] },
      { blockType: 'page', questions: [row('ready'), row()] },
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
  const result = await collection.hooks.beforeChange[0]({
    collection,
    context: {},
    data,
    operation: 'create',
    req,
    originalDoc: undefined as never,
  })
  expect(
    result.survey.flatMap((page: any) => page.questions.map((question: any) => question.name)),
  ).toEqual(['ready_2', 'ready_3', 'ready', 'ready_4'])
  await expect(
    fieldBeforeChange({
      collection,
      context: {},
      data: result,
      doc: {},
      docWithLocales: {},
      global: null,
      operation: 'create',
      overrideAccess: true,
      req,
    }),
  ).resolves.toBeDefined()
})

it.each([
  ['title-only', { title: 'Renamed' }, 'published', false],
  ['trash', { deletedAt: '2026-11-17T00:00:00.000Z' }, 'published', false],
  ['status-only publish', { _status: 'published' }, 'draft', true],
  ['pages edit', { editPages: true }, 'published', true],
] as const)(
  'handles a %s update after Payload fills missing fields',
  async (_, update, status, fails) => {
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
    const originalDoc = {
      title: 'Survey',
      _status: status,
      pages: [
        {
          id: 'p1',
          blockType: 'page',
          skippable: false,
          match: 'all',
          questions: [
            {
              id: 'q1',
              name: 'ready',
              label: 'Ready?',
              required: true,
              answer: [
                {
                  id: 'a1',
                  blockType: 'yesNo',
                  yesLabel: 'Yes',
                  noLabel: 'No',
                  yesId: 'same',
                  noId: 'same',
                },
              ],
            },
          ],
          conditionGroups: [
            {
              id: 'g1',
              match: 'all',
              conditions: [{ id: 'c1', questionId: 'q1', operator: 'in', answerId: 'gone' }],
            },
          ],
        },
      ],
    }
    const data: Record<string, any> = { ...update }
    if ('editPages' in update) {
      delete data.editPages
      data.pages = structuredClone(originalDoc.pages)
      data.pages[0].questions[0].label = 'Changed question'
    }
    await beforeValidateTraverseFields({
      collection,
      context: {},
      data,
      doc: originalDoc,
      fields: collection.fields,
      global: null,
      operation: 'update',
      overrideAccess: true,
      parentIndexPath: '',
      parentPath: '',
      parentSchemaPath: '',
      req,
      siblingData: data,
      siblingDoc: originalDoc,
    })
    expect(data.pages).toBeDefined()
    expect(data._status).toBe('_status' in update ? update._status : status)
    const result = collection.hooks.beforeChange[0]({
      collection,
      context: {},
      data,
      originalDoc,
      operation: 'update',
      req,
    })
    if (fails) await expect(result).rejects.toBeInstanceOf(ValidationError)
    else {
      const saved = await result
      expect(saved.pages[0].questions[0].answer[0].yesId).toEqual(expect.any(String))
      expect(saved.pages[0].conditionGroups[0].conditions[0].operator).toBe('equals')
    }
  },
)

it.each(
  ['draft', 'published'].flatMap((status) =>
    [
      ['pages'],
      ['pages', 0, 'questions'],
      ['pages', 0, 'questions', 0, 'answer'],
      ['pages', 0, 'questions', 0, 'answer', 0, 'options'],
      ['pages', 0, 'conditionGroups'],
      ['pages', 0, 'conditionGroups', 0, 'conditions'],
    ].map((path) => ({ status, path })),
  ),
)(
  'passes malformed $path to Payload shape validation on $status saves',
  async ({ status, path }) => {
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
    const t = (key: string) => key
    const req = {
      context: {},
      t,
      i18n: { t, language: 'en' },
      payload: { config, collections: {} },
    } as unknown as PayloadRequest
    const data: Record<string, any> = {
      title: 'Survey',
      _status: status,
      pages: [
        {
          blockType: 'page',
          questions: [
            {
              label: 'Colour',
              name: 'colour',
              answer: [{ blockType: 'choice', options: [{ label: 'Red' }, { label: 'Blue' }] }],
            },
          ],
          conditionGroups: [{ conditions: [] }],
        },
        {
          blockType: 'page',
          questions: [{ label: 'Comment', name: 'comment', answer: [{ blockType: 'text' }] }],
          conditionGroups: [
            { conditions: [{ questionId: 'source', operator: 'equals', answerId: 'red' }] },
          ],
        },
      ],
    }
    let parent: any = data
    for (const part of path.slice(0, -1)) parent = parent[part]
    parent[path.at(-1)!] = 'x'
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
    const result = await collection.hooks.beforeChange[0]({
      collection,
      context: {},
      data,
      originalDoc: undefined as never,
      operation: 'create',
      req,
    })
    expect(
      path.reduce<any>((value, part) => value[part], result),
      path.join('.'),
    ).toBe('x')
    try {
      await fieldBeforeChange({
        collection,
        context: {},
        data: result,
        doc: {},
        docWithLocales: {},
        global: null,
        operation: 'create',
        overrideAccess: true,
        req,
        skipValidation: status === 'draft',
      })
      expect.fail(`Expected shape validation for ${path.join('.')}`)
    } catch (error) {
      expect(error, path.join('.')).toBeInstanceOf(ValidationError)
      expect((error as ValidationError).status).toBe(400)
      expect((error as ValidationError).data?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: path.join('.'), message: 'validation:invalidInput' }),
        ]),
      )
    }
  },
)

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
    expect(first.questions.map((question: any) => question.name)).toEqual(['ready', 'ready_2'])
    expect((error as ValidationError).data?.errors).toEqual([
      {
        path: 'pages.1.conditionGroups.0.conditions.0.questionId',
        label: 'Page 2 > Condition group 1 > Condition 1 > Question',
        message: 'The source question does not exist.',
      },
    ])
  }
})
