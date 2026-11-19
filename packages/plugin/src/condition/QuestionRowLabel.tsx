'use client'

import { useRowLabel, useTranslation } from '@payloadcms/ui'
import { questionRowLabel } from './helper.js'

export const QuestionRowLabel = () => {
  const { data, rowNumber } = useRowLabel<{ label?: string | null }>()
  const { t } = useTranslation()
  const label = questionRowLabel(data?.label, rowNumber, { t })
  return (
    <span
      className="row-label"
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
