'use client'
import type { OptionObject } from 'payload/types'
import { useState, type FC } from 'react'
import { useFormQuestions } from '@/hooks/condition/useFormQuestions'
import { filterKeysByPattern } from '@/utilities'
import { handleChange } from '../helper'
import { useFieldProps } from '@payloadcms/ui/forms/FieldPropsProvider'
import { useFormFields } from '@payloadcms/ui/forms/Form'
import { ReactSelect } from '@payloadcms/ui/elements'
import { useField } from '@payloadcms/ui/forms/useField'

const pattern =
  /^(pages|pages\.\d+\.questionAnswerPair|pages\.\d+\.questionAnswerPair\.\d+\.(question|id))$/

const QuestionCondition: FC<{ pageType: string }> = ({ pageType }) => {
  const { path } = useFieldProps()
  const { fields } = useFormFields(([formFields]) => ({
    fields: filterKeysByPattern({ obj: formFields, pattern }),
  }))

  const generateQuestionOptions = useFormQuestions()

  const [options, setOptions] = useState<OptionObject[]>(
    generateQuestionOptions({
      pageData: fields,
      path,
      pageName: pageType,
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
      className={['render-fields', 'field-type'].join(' ')}
    />
  )
}

export default QuestionCondition
