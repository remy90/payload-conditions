import type { Block } from 'payload'

export const inputTextBlock: Block = {
  slug: 'inputText',
  dbName: ({ tableName }) => `${tableName}_text`,
  labels: { singular: 'Free text', plural: 'Free text' },
  fields: [
    {
      name: 'inputText',
      type: 'text',
      required: true,
      label: 'Placeholder',
      admin: { description: 'Shown in the empty answer box' },
    },
  ],
  interfaceName: 'InputText',
}
