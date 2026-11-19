import type { Block } from 'payload'
import { label } from '../../translations/index.js'
import { textField, validateMaxLength } from '../../fields/validation.js'

export const textAnswerBlock: Block = {
  slug: 'text',
  dbName: ({ tableName }) => `${tableName}_text`,
  labels: { singular: label('text'), plural: label('text') },
  interfaceName: 'TextAnswer',
  admin: { disableBlockName: true },
  fields: [
    {
      ...textField('placeholder', 'placeholder', 200),
      admin: { description: label('placeholderDescription') },
    },
    {
      name: 'maxLength',
      label: label('maxLength'),
      type: 'number',
      min: 1,
      max: 10000,
      defaultValue: 2000,
      required: true,
      validate: validateMaxLength,
    },
  ],
}
