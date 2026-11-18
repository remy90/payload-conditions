'use client'

import { SelectInput, useField, useFormFields } from '@payloadcms/ui'
import type { SelectFieldClientComponent } from 'payload'
import { useMemo } from 'react'
import { buildOperatorOptions } from '../options.js'
import { selectedOptionValue } from '../helper.js'

export const OperatorCondition: SelectFieldClientComponent = ({ path: fieldPath, field, readOnly }) => {
  const { path, value, setValue, showError, disabled } = useField<string | null>({ potentiallyStalePath: fieldPath })
  const fields = useFormFields(([fields]) => fields)
  const options = useMemo(() => buildOperatorOptions(fields, path), [fields, path])

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
      placeholder="Select an operator"
      value={value ?? ''}
    />
  )
}
