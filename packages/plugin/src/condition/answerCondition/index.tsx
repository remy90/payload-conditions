'use client'

import { SelectInput, useField, useFormFields, useTranslation } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { useMemo } from 'react'
import { buildAnswerOptions } from '../options.js'
import { selectedOptionValue } from '../helper.js'
import { translate } from '../../translations/index.js'

export const AnswerCondition: TextFieldClientComponent = ({ path: fieldPath, field, readOnly }) => {
  const { path, value, setValue, showError, disabled } = useField<string | null>({
    potentiallyStalePath: fieldPath,
  })
  const { t } = useTranslation()
  const fields = useFormFields(([fields]) => fields)
  const options = useMemo(() => buildAnswerOptions(fields, path), [fields, path])

  return (
    <SelectInput
      name={field.name}
      path={path}
      label={field.label}
      required={field.required}
      readOnly={readOnly || disabled}
      description={field.admin?.description}
      localized={field.localized}
      showError={showError}
      isClearable
      onChange={(option) => setValue(selectedOptionValue(option))}
      options={options}
      placeholder={translate({ t }, 'selectAnswer')}
      value={value ?? ''}
    />
  )
}
