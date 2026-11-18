'use client'

import { useRowLabel } from '@payloadcms/ui'
import { questionRowLabel } from './helper.js'

export const QuestionAnswerRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ question?: string | null }>()
  return questionRowLabel(data?.question, rowNumber)
}
