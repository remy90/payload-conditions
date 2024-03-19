'use client'
import { ReactSelect, useField, useFieldPath, useFormFields } from '@payloadcms/ui'
import type { OptionObject } from 'payload/types'
import { useState, type FC } from 'react'
import { useFormQuestions } from '../../../hooks/condition/useFormQuestions'

const handleChange = (option: OptionObject, setSelectedValue: (val: string | undefined) => void) =>
  setSelectedValue(option?.value)

const QuestionCondition: FC<{ pageType: string }> = ({ pageType }) => {
  const { path } = useFieldPath()
  const { fields } = useFormFields(([formFields]) => ({ fields: formFields }))

  const generateQuestionOptions = useFormQuestions()

  const [options, setOptions] = useState<OptionObject[]>(
    generateQuestionOptions({
      pageData: fields,
      path,
      pageName: pageType, // possibly from schemaName?
    }),
  )
  const { setValue: setSelectedValue, value: selectedValue } = useField<string>({ path })

  return (
    <ReactSelect
      isClearable
      onChange={(optionValue) => handleChange(optionValue, setSelectedValue)}
      onMenuOpen={() => {
        setOptions(
          generateQuestionOptions({
            pageData: fields,
            path,
            pageName: pageType,
          }),
        )
      }}
      options={options}
      placeholder="Select a question"
      value={options?.find(({ value }) => value === selectedValue)}
    />
  )
}

export default QuestionCondition
