import type { Block } from 'payload/types'

export const multipleChoiceBlock: Block = {
  slug: 'multipleChoice',
  labels: { singular: 'Multiple choice', plural: 'Multiple choice' },
  fields: [
    {
      name: 'multipleChoice',
      type: 'array',
      label: 'option',

      labels: { singular: 'option', plural: 'options' },
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
