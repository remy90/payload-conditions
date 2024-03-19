'use client'
import { ReactSelect, useField, useFieldPath, useFormFields } from '@payloadcms/ui'
import type { OptionObject } from 'payload/types'
import { useState, type FC } from 'react'
import { useAnswerGeneration } from '../../../hooks/condition/useFormAnswer'

const handleChange = (
  option: OptionObject,
  setSelectedValue: (val: string | undefined) => void,
) => {
  setSelectedValue(option?.value)
}

const AnswerCondition: FC<{ pageType: string }> = ({ pageType }) => {
  const { path } = useFieldPath()
  const { fields } = useFormFields(([formFields]) => ({ fields: formFields }))
  console.log('fields', fields)
  const generateAnswerOptions = useAnswerGeneration({
    pageState: fields,
    path,
  })

  const [options, setOptions] = useState<OptionObject[]>(generateAnswerOptions())

  const { setValue: setSelectedValue, value: selectedValue } = useField<string>({ path })

  return (
    <ReactSelect
      isClearable
      onChange={(optionValue) => handleChange(optionValue, setSelectedValue)}
      onMenuOpen={() => {
        const t = generateAnswerOptions()
        setOptions(t)
      }} // ? still required with new data structure?
      options={options}
      placeholder="Select an answer"
      value={
        options ? options.find(({ value }) => value === selectedValue) : { label: '', value: '' }
      }
    />
  )
}

export default AnswerCondition
