import { OptionObject } from 'payload'

export const handleChange = (
  option: OptionObject,
  setSelectedValue: (val: string | undefined) => void,
) => setSelectedValue(option?.value)
