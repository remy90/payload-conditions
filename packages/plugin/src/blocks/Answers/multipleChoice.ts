import type { Block } from 'payload'

export const multipleChoiceBlock: Block = {
  slug: 'multipleChoice',
  dbName: ({ tableName }) => `${tableName}_choice`,
  labels: { singular: 'Multiple choice', plural: 'Multiple choice' },
  fields: [
    { name: 'allowMultipleSelection', type: 'checkbox', defaultValue: false },
    {
      name: 'multipleChoice',
      dbName: ({ tableName }) => `${tableName}_opts`,
      type: 'array',
      label: false,
      labels: { singular: 'option', plural: 'options' },
      minRows: 2,
      required: true,
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
