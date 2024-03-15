'use client'
import { ReactSelect, useField, useFieldPath, useFormFields } from '@payloadcms/ui'
import type { Field, OptionObject } from 'payload/types'
import { useState, type FC } from 'react'
import { useFormQuestions } from '../../../hooks/condition/useFormQuestions'

const handleChange = (
  option: OptionObject,
  setSelectedValue: (val: string | undefined) => void,
) => {
  console.log('HANDLE CHANGE', option)
  setSelectedValue(option?.value)
}

const QuestionCondition: FC<{ pageType: string }> = ({ pageType }) => {
  const { path } = useFieldPath()

  const { fields } = useFormFields(([formFields]) => {
    // TODO filter questions below current page?
    return { fields: formFields as unknown as Field[] }
  })

  const generateQuestionOptions = useFormQuestions({
    pageData: fields,
    path,
    pageName: pageType, // possibly from schemaName?
  })

  const [options, setOptions] = useState<OptionObject[]>(generateQuestionOptions)
  const { setValue: setSelectedValue, value: selectedValue } = useField<string>({ path })

  // useEffect(() => {
  //   setOptions(generateQuestionOptions())
  // }, [generateQuestionOptions, setOptions])

  return (
    <ReactSelect
      isClearable
      onChange={(optionValue) => handleChange(optionValue, setSelectedValue)}
      onMenuOpen={() => {
        console.log('generateQuestionOptions, ', generateQuestionOptions)
        setOptions(generateQuestionOptions)
      }} // ? still required with new data structure?
      options={options}
      placeholder="Select a question"
      value={options?.find(({ value }) => value === selectedValue)}
    />
  )
}

export default QuestionCondition
