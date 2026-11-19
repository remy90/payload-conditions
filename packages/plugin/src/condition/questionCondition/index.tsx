'use client'

import { SelectInput, useField, useForm, useFormFields, useTranslation } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { useMemo } from 'react'
import { buildQuestionOptions } from '../options.js'
import { questionChangeFields, selectedOptionValue } from '../helper.js'
import { translate } from '../../translations/index.js'

export const QuestionCondition: TextFieldClientComponent = ({
  path: fieldPath,
  field,
  readOnly,
}) => {
  const { path, value, showError, disabled } = useField<string | null>({
    potentiallyStalePath: fieldPath,
  })
  const { t } = useTranslation()
  const fields = useFormFields(([fields]) => fields)
  const { dispatchFields, setModified } = useForm()
  const options = useMemo(() => buildQuestionOptions(fields, path, { t }), [fields, path, t])

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
      onChange={(option) => {
        const nextValue = selectedOptionValue(option)
        const formState = questionChangeFields(fields, path, value, nextValue)
        if (Object.keys(formState).length) {
          dispatchFields({ type: 'UPDATE_MANY', formState })
          setModified(true)
        }
      }}
      options={options}
      placeholder={translate({ t }, 'selectQuestion')}
      value={value ?? ''}
    />
  )
}
