import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
export const dynamic = 'force-dynamic'
export default async function Home() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'questionnaires',
    draft: false,
    where: { _status: { equals: 'published' } },
  })
  return (
    <main style={{ fontFamily: 'system-ui', padding: '8vw', fontSize: 24 }}>
      <p>PAYLOAD CONDITIONS / LOCAL DEMO</p>
      <h1>Choose a questionnaire</h1>
      {docs.map((doc) => (
        <p key={doc.id}>
          <Link href={`/q/${doc.id}`}>{String(doc.title)}</Link>
        </p>
      ))}
      {!docs.length && <p>Run pnpm seed to create the demo.</p>}
      <p>
        <Link href="/admin">Open Payload admin ↗</Link>
      </p>
    </main>
  )
}
