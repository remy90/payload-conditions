import type { Block } from 'payload/types'

// TODO: Add input text type (password, email, number, tel, url)
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
