import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { QuestionnairePreview } from '../../../../demo-ui/QuestionnairePreview'
import { QuestionnaireDemo } from '../../../../demo-ui/QuestionnaireDemo'

export const dynamic = 'force-dynamic'

export default async function QuestionnairePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ logic?: string; preview?: string }>
}) {
  const { id } = await params
  const { logic, preview } = await searchParams
  const payload = await getPayload({ config })
  const user = preview === '1' ? (await payload.auth({ headers: await headers() })).user : null
  const isPreview = user?.collection === 'users'
  const { docs } = await payload.find({
    collection: 'questionnaire',
    draft: isPreview,
    depth: 0,
    limit: 1,
    where: {
      and: [
        { id: { equals: id } },
        ...(isPreview ? [] : [{ _status: { equals: 'published' } }]),
      ],
    },
  })
  const document = docs[0]
  if (!document) notFound()
  if (isPreview) {
    return <QuestionnairePreview key={document.id} document={document} logicOpen={logic !== '0'} />
  }
  return (
    <QuestionnaireDemo
      key={`${document.id}:${document.updatedAt}`}
      document={document}
      logicOpen={logic !== '0'}
    />
  )
}
