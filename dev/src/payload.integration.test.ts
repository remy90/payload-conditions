// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { getPayload, ValidationError, type Payload } from 'payload'
import { trip } from './seed-data'

let payload: Payload
let directory: string
let beforeChangeData: Record<string, any> | undefined
const originalEnvironment = {
  DEMO_LOCALHOST: process.env.DEMO_LOCALHOST,
  DEMO_DATABASE_URL: process.env.DEMO_DATABASE_URL,
}

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'questionnaire-demo-'))
  process.env.DEMO_LOCALHOST = '1'
  process.env.DEMO_DATABASE_URL = `file:${path.join(directory, 'test.db')}`
  const { default: pendingConfig } = await import('./payload.config')
  const config = await pendingConfig
  const collection = config.collections.find((collection) => collection.slug === 'questionnaires')!
  collection.hooks.beforeChange.unshift(({ data }) => {
    beforeChangeData = structuredClone(data)
    return data
  })
  payload = await getPayload({ config })
}, 30000)

afterAll(async () => {
  try {
    await payload?.destroy()
    if (directory) await rm(directory, { recursive: true, force: true })
  } finally {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})

test('publish-on-create has row ids before the collection hook and blocks a contradiction at its operator', async () => {
  const data = structuredClone(trip)
  data.pages = data.pages.slice(0, 2)
  for (const page of data.pages) {
    delete page.id
    for (const question of page.questions) {
      if (question.name === 'ages') delete question.id
      for (const answer of question.answer) {
        delete answer.id
        if (answer.blockType === 'choice') {
          for (const option of answer.options) delete option.id
        }
      }
    }
    for (const group of page.conditionGroups ?? []) {
      delete group.id
      for (const condition of group.conditions) delete condition.id
    }
  }
  data.pages[1].conditionGroups![0].conditions.push({
    questionId: 'children',
    operator: 'equals',
    answerId: 'children-no',
  })
  await expect(
    payload.create({
      collection: 'questionnaires',
      data: { ...data, _status: 'published' },
    }),
  ).rejects.toSatisfy((error: unknown) => {
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).data.errors).toContainEqual(
      expect.objectContaining({
        path: 'pages.1.conditionGroups.0.conditions.1.operator',
        message: 'These conditions cannot all match.',
      }),
    )
    return true
  })
  const pages = beforeChangeData!.pages
  expect(pages[0].id).toEqual(expect.any(String))
  expect(pages[1].questions[0].id).toEqual(expect.any(String))
  expect(pages[0].questions[0].answer[0].id).toEqual(expect.any(String))
  expect(pages[0].questions[1].answer[0].options[0].id).toEqual(expect.any(String))
  expect(pages[1].conditionGroups[0].id).toEqual(expect.any(String))
  expect(pages[1].conditionGroups[0].conditions[0].id).toEqual(expect.any(String))
})

test('a title-only update keeps a published questionnaire published', async () => {
  const saved = await payload.create({
    collection: 'questionnaires', data: { ...structuredClone(trip), _status: 'published' },
  })
  const updated = await payload.update({
    collection: 'questionnaires', id: saved.id, data: { title: 'Updated trip' },
  })
  expect(updated.title).toBe('Updated trip')
  expect(updated._status).toBe('published')
  expect(updated.pages).toEqual(saved.pages)
})

test('SQLite stores one block_name column on each page block table', () => {
  const database = new DatabaseSync(path.join(directory, 'test.db'), { readOnly: true })
  try {
    for (const table of ['questionnaires_page', '__questionnaires_v_page_v']) {
      const columns = database.prepare(`PRAGMA table_info('${table}')`).all()
      expect(columns.filter((column) => column.name === 'block_name')).toHaveLength(1)
    }
  } finally {
    database.close()
  }
})
