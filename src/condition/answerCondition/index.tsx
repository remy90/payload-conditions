'use client'

import { SelectInput, useField, useFormFields } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { useMemo } from 'react'
import { buildAnswerOptions } from '../options.js'
import { selectedOptionValue } from '../helper.js'

export const AnswerCondition: TextFieldClientComponent = ({ path: fieldPath, field, readOnly }) => {
  const { path, value, setValue, showError } = useField<string | null>({ potentiallyStalePath: fieldPath })
  const fields = useFormFields(([fields]) => fields)
  const options = useMemo(() => buildAnswerOptions(fields, path), [fields, path])

  return (
    <SelectInput
      name={field.name}
      path={path}
      label={field.label}
      required={field.required}
      readOnly={readOnly}
      showError={showError}
      isClearable
      onChange={(option) => setValue(selectedOptionValue(option))}
      options={options}
      placeholder="Select an answer"
      value={value ?? ''}
    />
  )
}
