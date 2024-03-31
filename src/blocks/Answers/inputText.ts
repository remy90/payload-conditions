import type { Block } from 'payload/types'

export const inputTextBlock: Block = {
  slug: 'inputText',
  labels: { singular: 'Input text', plural: 'Input text' },
  fields: [
    {
      name: 'inputText',
      type: 'text',
      required: true,
      label: 'Input text',
    },
  ],
  interfaceName: 'InputText',
}
