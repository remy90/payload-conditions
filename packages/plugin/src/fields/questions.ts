import type { Field } from 'payload'
import { answer } from './answer.js'
import { label } from '../translations/index.js'
import { textField, validateName } from './validation.js'

export const questions: Field = {
  name: 'questions',
  dbName: ({ tableName }) => `${tableName}_q`,
  label: label('questions'),
  labels: { singular: label('question'), plural: label('questions') },
  type: 'array',
  minRows: 1,
  required: true,
  fields: [
    {
      ...textField('label', 'question', 500, true),
      admin: { description: label('questionDescription') },
    },
    { ...textField('name', 'name', 64, true), validate: validateName },
    {
      name: 'required',
      type: 'checkbox',
      defaultValue: true,
      label: label('required'),
      admin: { description: label('requiredDescription') },
    },
    answer,
  ],
  admin: {
    components: { RowLabel: '@remy90/payload-conditions-plugin/client#QuestionRowLabel' },
  },
}
