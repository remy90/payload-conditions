import type { Block, Field } from 'payload/types'

const truthyField: Field = {
  name: 'trueOption',
  type: 'text',
  label: 'True option',
  defaultValue: 'Yes',
  required: true,
}

const falsyField: Field = {
  name: 'falseOption',
  type: 'text',
  label: 'False option',
  defaultValue: 'No',
  required: true,
}
// TODO: Add style option: buttons, checkbox, dropdown, toggle
export const booleanChoiceBlock: Block = {
  fields: [
    {
      name: 'booleanOptions',
      type: 'group',
      fields: [truthyField, falsyField],
      label: 'True Option',
    },
  ],
  slug: 'booleanChoice',
  labels: { singular: 'True or false', plural: 'True or false' },
  interfaceName: 'BooleanChoice',
}
