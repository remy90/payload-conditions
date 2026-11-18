'use client'

import { SelectInput, useField, useFormFields } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { useMemo } from 'react'
import { buildQuestionOptions } from '../options.js'
import { selectedOptionValue } from '../helper.js'

export const QuestionCondition: TextFieldClientComponent = ({ path: fieldPath, field, readOnly }) => {
  const { path, value, setValue, showError } = useField<string | null>({ potentiallyStalePath: fieldPath })
  const fields = useFormFields(([fields]) => fields)
  const dispatch = useFormFields(([, dispatch]) => dispatch)
  const options = useMemo(() => buildQuestionOptions(fields, path), [fields, path])

  return (
    <SelectInput
      name={field.name}
      path={path}
      label={field.label}
      required={field.required}
      readOnly={readOnly}
      showError={showError}
      isClearable
      onChange={(option) => {
        const nextValue = selectedOptionValue(option)
        if (nextValue !== (value ?? null)) {
          dispatch({ type: 'UPDATE', path: path.replace(/questionValue$/, 'answerValue'), value: null })
          setValue(nextValue)
        }
      }}
      options={options}
      placeholder="Select a question"
      value={value ?? ''}
    />
  )
}
