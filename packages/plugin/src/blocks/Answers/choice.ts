import type { Block } from 'payload'
import { label } from '../../translations/index.js'
import { textField, validateOptionLabel } from '../../fields/validation.js'

export const choiceAnswerBlock: Block = {
  slug: 'choice',
  dbName: ({ tableName }) => `${tableName}_choice`,
  labels: { singular: label('choice'), plural: label('choice') },
  interfaceName: 'ChoiceAnswer',
  admin: { disableBlockName: true },
  fields: [
    { name: 'hasMany', type: 'checkbox', label: label('hasMany'), defaultValue: false },
    {
      name: 'options',
      dbName: ({ tableName }) => `${tableName}_opts`,
      type: 'array',
      label: label('options'),
      labels: { singular: label('option'), plural: label('options') },
      minRows: 2,
      required: true,
      fields: [{ ...textField('label', 'option', 200, true), validate: validateOptionLabel }],
    },
  ],
}
