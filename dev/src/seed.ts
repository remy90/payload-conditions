import { getPayload } from 'payload'
import config from './payload.config.js'
import { trip } from './seed-data.js'
import { fromPayloadQuestionnaire, type StoredQuestionnaire } from '@remy90/payload-conditions-engine/payload'
import assert from 'node:assert/strict'

const payload = await getPayload({ config })
try {
  const users = await payload.find({ collection: 'users', where: { email: { equals: 'demo@example.com' } } })
  if (!users.docs.length) await payload.create({ collection: 'users', data: { email: 'demo@example.com', password: 'demo' } })
  const existing = await payload.find({ collection: 'questionnaire', where: { title: { equals: trip.title } }, draft: true })
  const data = { title: trip.title, pages: trip.pages, _status: 'published' as const }
  const saved = existing.docs[0]
    ? await payload.update({ collection: 'questionnaire', id: existing.docs[0].id, data })
    : await payload.create({ collection: 'questionnaire', data })
  const read = await payload.findByID({ collection: 'questionnaire', id: saved.id, draft: false })
  // Check every page, question, option and condition reference through the public adapter.
  const expected = fromPayloadQuestionnaire(trip)
  const actual = fromPayloadQuestionnaire(read as StoredQuestionnaire)
  assert.deepEqual(actual.pages, expected.pages)
  assert.equal(read._status, 'published')
  payload.logger.info(`Seeded and verified: http://localhost:3000/q/${saved.id}`)
} finally {
  await payload.destroy()
}
