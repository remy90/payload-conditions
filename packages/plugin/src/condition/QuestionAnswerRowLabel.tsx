'use client'

import { useRowLabel } from '@payloadcms/ui'
import { questionRowLabel } from './helper.js'

export const QuestionAnswerRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ question?: string | null }>()
  const label = questionRowLabel(data?.question, rowNumber)
  return (
    <span
      className="row-label"
      title={label}
      style={{
        display: 'block',
        minWidth: 0,
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </span>
  )
}
