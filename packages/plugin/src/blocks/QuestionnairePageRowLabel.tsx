'use client'

import type { ComponentProps } from 'react'
import type { BlockRowLabelClientComponent } from 'payload'
import { SectionTitle, useConfig, useFormFields, useRowLabel, useTranslation } from '@payloadcms/ui'
import { rowCount } from '../condition/formState.js'
import { showBlockName } from './blockName.js'
import { translate } from '../translations/index.js'

type BlockRowLabelClientProps = ComponentProps<BlockRowLabelClientComponent>

export const QuestionnairePageRowLabel = ({
  field,
  blockType,
  readOnly = false,
}: BlockRowLabelClientProps) => {
  const { path, rowNumber, data } = useRowLabel<{ blockType?: string }>()
  const { config } = useConfig()
  const { t } = useTranslation()
  // Payload 3.94 supplies blockType only to server labels; client labels also read row data.
  const nameEnabled = showBlockName(field, blockType ?? data?.blockType, config.blocksMap)
  const questions = useFormFields(([fields]) => rowCount(fields, `${path}.questions`))
  const groups = useFormFields(([fields]) => rowCount(fields, `${path}.conditionGroups`))
  const titleError = useFormFields(([fields]) => fields[`${path}.blockName`]?.errorMessage)

  return (
    <>
      <span className="blocks-field__block-number">
        {String((rowNumber ?? 0) + 1).padStart(2, '0')}
      </span>
      {nameEnabled && (
        <>
          <SectionTitle path={`${path}.blockName`} readOnly={readOnly} />
          {titleError && (
            <span role="alert" style={{ color: 'var(--theme-error-500)' }}>
              {titleError}
            </span>
          )}
        </>
      )}
      <span
        style={{
          marginInlineStart: 'auto',
          flexShrink: 0,
          whiteSpace: 'nowrap',
          color: 'var(--theme-elevation-500)',
        }}
      >
        {translate({ t }, 'questionCount', {
          count: questions,
        })}
        {groups > 0 && ` · ${translate({ t }, 'groupCount', { count: groups })}`}
      </span>
    </>
  )
}
