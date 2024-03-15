import type { Block } from 'payload/types'

// TODO: add style options: select, buttons, radio*
export const multipleChoiceBlock: Block = {
  slug: 'multipleChoice',
  labels: { singular: 'Multiple choice', plural: 'Multiple choice' },
  fields: [
    {
      name: 'options',
      type: 'array',
      labels: { singular: 'Option', plural: 'Options' },
      minRows: 2,
      fields: [
        {
          name: 'option',
          type: 'text',
          required: true,
          label: 'Option',
        },
      ],
    },
  ],
  interfaceName: 'MultipleChoice',
}
