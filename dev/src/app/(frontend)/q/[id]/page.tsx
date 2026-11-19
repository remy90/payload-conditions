import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { QuestionnaireDemo } from '../../../../demo-ui/QuestionnaireDemo'

export const dynamic = 'force-dynamic'

export default async function QuestionnairePage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ logic?: string }>
}) {
  const { id } = await params
  const { logic } = await searchParams
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'questionnaire', draft: false, limit: 1,
    where: { and: [{ id: { equals: id } }, { _status: { equals: 'published' } }] },
  })
  const document = docs[0]
  if (!document) notFound()
  return <QuestionnaireDemo key={`${document.id}:${document.updatedAt}`} document={document} logicOpen={logic !== '0'} />
}
