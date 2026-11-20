'use client'

import { SelectInput, useField, useFormFields, useTranslation } from '@payloadcms/ui'
import type { SelectFieldClientComponent } from 'payload'
import { useEffect, useMemo } from 'react'
import { buildOperatorOptions, operatorState } from '../options.js'
import { selectedOptionValue } from '../helper.js'
import { translate } from '../../translations/index.js'

export const OperatorCondition: SelectFieldClientComponent = ({
  path: fieldPath,
  field,
  readOnly,
}) => {
  const { path, value, setValue, showError, disabled } = useField<string | null>({
    potentiallyStalePath: fieldPath,
  })
  const { t } = useTranslation()
  const fields = useFormFields(([fields]) => fields)
  const options = useMemo(() => buildOperatorOptions(fields, path, { t }), [fields, path, t])
  const { value: mappedValue, update } = operatorState(fields, path, value)
  useEffect(() => {
    if (update !== undefined && !readOnly && !disabled) setValue(update)
  }, [update, readOnly, disabled, setValue])

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
      placeholder={translate({ t }, 'selectOperator')}
      value={mappedValue ?? ''}
    />
  )
}
