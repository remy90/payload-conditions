'use client'

import { SelectInput, useField, useForm, useFormFields } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { useMemo } from 'react'
import { buildQuestionOptions } from '../options.js'
import { questionChangeFields, selectedOptionValue } from '../helper.js'

export const QuestionCondition: TextFieldClientComponent = ({ path: fieldPath, field, readOnly }) => {
  const { path, value, showError, disabled } = useField<string | null>({ potentiallyStalePath: fieldPath })
  const fields = useFormFields(([fields]) => fields)
  const { dispatchFields, setModified } = useForm()
  const options = useMemo(() => buildQuestionOptions(fields, path), [fields, path])

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
      placeholder="Select a question"
      value={value ?? ''}
    />
  )
}
