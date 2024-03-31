'use client'
import type { OptionObject } from 'payload/types'
import { useState, type FC } from 'react'
import { useAnswerGeneration } from '@/hooks/condition/useFormAnswer'
import { filterKeysByPattern } from '@/utilities'
import { handleChange } from '../helper'
import { ReactSelect } from '@payloadcms/ui/elements'
import { useField } from '@payloadcms/ui/forms/useField'
import { useFormFields } from '@payloadcms/ui/forms/Form'
import { useFieldProps } from '@payloadcms/ui/forms/FieldPropsProvider'

const AnswerCondition: FC = () => {
  const { path } = useFieldProps()
  const { fields } = useFormFields(([formFields]) => ({
    fields: filterKeysByPattern({ obj: formFields, pattern }),
  }))

  const generateAnswerOptions = useAnswerGeneration()

  const [options, setOptions] = useState<OptionObject[]>(
    generateAnswerOptions({
      pageState: fields,
      path,
    }),
  )

  const { setValue: setSelectedValue, value: selectedValue } = useField<string>({ path })

  return (
    <ReactSelect
      isClearable
      onChange={(optionValue) => handleChange(optionValue, setSelectedValue)}
      onMenuOpen={() =>
        setOptions(
          generateAnswerOptions({
            pageState: fields,
            path,
          }),
        )
      }
      options={options}
      placeholder="Select an answer"
      className={['render-fields', 'field-type'].join(' ')}
      value={options?.find(({ value }) => value === selectedValue)}
    />
  )
}

export default AnswerCondition

const pattern = new RegExp(
  [
    // First, an exact match on pages (for the page number)
    '^(pages',

    // Match each page index and questionAnswerPair index pages.0.questionAnswerPair.0
    '|pages\\.\\d+\\.questionAnswerPair(?:\\.\\d+)?(?:\\.',

    // Match answer followed optionally by an array index
    '(answer(?:\\.\\d+)?(?:\\.',
    // the expected fields within answer to match against
    '(blockName|blockType|id|booleanOptions(?:\\.(falseId|falseOption|trueId|trueOption))?',
    '|multipleChoice(?:\\.\\d+)?(?:\\.(id|option))?|inputText))?',

    // Other fields to provide an exact match for (used for option value and label)
    '|question|id))?',

    // Used in the conditionalLogicGroup to determine what question was selected and derive possible answer options
    '|pages\\.\\d+\\.conditionalLogicGroup(?:\\.\\d+)?(?:\\.',
    '(answerValue|id|operatorType|questionValue))?)$',
  ].join(''),
)
