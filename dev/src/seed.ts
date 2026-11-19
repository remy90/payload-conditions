import { getPayload } from 'payload'
import config from './payload.config.js'
import { trip } from './seed-data.js'
import { fromPayloadQuestionnaire } from '@remy90/payload-conditions-engine/payload'
import assert from 'node:assert/strict'

function savedIds(value: unknown, path = ''): [string, unknown][] {
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) => {
    const childPath = `${path}.${key}`
    return ['id', 'trueId', 'falseId', 'questionId', 'answerId'].includes(key)
      ? [[childPath, child] as [string, unknown]]
      : savedIds(child, childPath)
  })
}

const payload = await getPayload({ config })
try {
  const users = await payload.find({
    collection: 'users',
    where: { email: { equals: 'demo@example.com' } },
  })
  if (!users.docs.length)
    await payload.create({
      collection: 'users',
      data: { email: 'demo@example.com', password: 'demo' },
    })
  const existing = await payload.find({
    collection: 'questionnaire',
    where: { title: { equals: trip.title } },
    draft: true,
  })
  const data = { title: trip.title, pages: trip.pages, _status: 'published' as const }
  const saved = existing.docs[0]
    ? await payload.update({ collection: 'questionnaire', id: existing.docs[0].id, data })
    : await payload.create({ collection: 'questionnaire', data })
  const read = await payload.findByID({ collection: 'questionnaire', id: saved.id, draft: false })
  // Check every page, question, option and condition reference through the public adapter.
  const expected = fromPayloadQuestionnaire(trip)
  const actual = fromPayloadQuestionnaire(read)
  assert.deepEqual(actual.pages, expected.pages)
  // The adapter omits group and condition row ids, so verify those on the stored tree too.
  assert.deepEqual(
    Object.fromEntries(savedIds(read.pages)),
    Object.fromEntries(savedIds(trip.pages)),
  )
  assert.equal(read._status, 'published')
  payload.logger.info(`Seeded and verified: http://localhost:3000/q/${saved.id}`)
} finally {
  await payload.destroy()
}
