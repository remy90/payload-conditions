import type { Field } from 'payload'

export const question: Field = {
  name: 'question',
  label: 'Question',
  type: 'text',
  required: true,
  admin: {
    description: 'This can be a question or input prompt',
  },
}
