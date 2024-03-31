import { OptionObject } from 'payload/types'

export const handleChange = (
  option: OptionObject,
  setSelectedValue: (val: string | undefined) => void,
) => setSelectedValue(option?.value)
