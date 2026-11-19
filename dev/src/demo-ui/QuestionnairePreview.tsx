'use client'

import { useLivePreview } from '@payloadcms/live-preview-react'
import type { StoredQuestionnaire } from '@remy90/payload-conditions-engine/payload'
import { QuestionnaireDemo } from './QuestionnaireDemo'

export function QuestionnairePreview({
  document,
  logicOpen,
}: {
  document: StoredQuestionnaire
  logicOpen: boolean
}) {
  const { data } = useLivePreview({
    initialData: document,
    serverURL: 'http://localhost:3000',
    depth: 0,
  })
  return <QuestionnaireDemo document={data} logicOpen={logicOpen} />
}
