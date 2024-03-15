import { Block } from 'payload/types'

export const question: Block = {
  slug: 'question',
  fields: [
    {
      name: 'text',
      type: 'text',
      label: 'Question',
      required: true,
    },
    {
      name: 'optional',
      type: 'checkbox',
      defaultValue: false,
      hidden: false,
      label: 'Question is optional',
    },
  ],
  interfaceName: 'Question',
  labels: { plural: 'Questions', singular: 'Question' },
}
