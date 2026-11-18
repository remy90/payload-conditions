'use client'

import { useRowLabel } from '@payloadcms/ui'

export const QuestionAnswerRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ question?: string | null }>()
  const question = typeof data?.question === 'string' ? data.question : ''
  return question
    ? question.length > 20 ? question.substring(0, 20) + '...' : question
    : `Question ${(rowNumber ?? 0) + 1}`
}
