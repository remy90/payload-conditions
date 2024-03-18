import type { Field } from 'payload/types'

export const allOrAnyCondition: Field = {
  name: 'allOrAnyCondition',
  type: 'select',
  defaultValue: 'all',
  label: false,
  options: [
    {
      label: 'Any',
      value: 'any',
    },
    {
      label: 'All',
      value: 'all',
    },
  ],
  required: true,
}
