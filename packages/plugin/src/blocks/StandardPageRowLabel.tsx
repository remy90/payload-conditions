'use client'

import type { ComponentProps } from 'react'
import type { BlockRowLabelClientComponent } from 'payload'
import { SectionTitle, useConfig, useFormFields, useRowLabel } from '@payloadcms/ui'
import { rowCount } from '../condition/formState.js'
import { showBlockName } from './blockName.js'

type BlockRowLabelClientProps = ComponentProps<BlockRowLabelClientComponent>

export const StandardPageRowLabel = ({ field, blockType, readOnly = false }: BlockRowLabelClientProps) => {
  const { path, rowNumber, data } = useRowLabel<{ blockType?: string }>()
  const { config } = useConfig()
  // Payload 3.94 supplies blockType only to server labels; client labels also read row data.
  const nameEnabled = showBlockName(field, blockType ?? data?.blockType, config.blocksMap)
  const questions = useFormFields(([fields]) => rowCount(fields, `${path}.questionAnswerPair`))
  const groups = useFormFields(([fields]) => rowCount(fields, `${path}.conditionGroups`))

  return (
    <>
      <span className="blocks-field__block-number">
        {String((rowNumber ?? 0) + 1).padStart(2, '0')}
      </span>
      {nameEnabled && <SectionTitle path={`${path}.blockName`} readOnly={readOnly} />}
      <span
        style={{
          marginInlineStart: 'auto',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          color: 'var(--theme-elevation-500)',
        }}
      >
        {questions} {questions === 1 ? 'question' : 'questions'}
        {groups > 0 && ` · ${groups} condition ${groups === 1 ? 'group' : 'groups'}`}
      </span>
    </>
  )
}
