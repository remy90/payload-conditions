import type { Block, TextField } from 'payload'
import { label } from '../../translations/index.js'
import { textField, validateYesNoLabel } from '../../fields/validation.js'

const idField = (name: string): TextField => ({
  name,
  type: 'text',
  label: false,
  required: true,
  defaultValue: () => crypto.randomUUID(),
  admin: { hidden: true },
  hooks: { beforeValidate: [({ value }) => value || crypto.randomUUID()] },
})

export const yesNoAnswerBlock: Block = {
  slug: 'yesNo',
  dbName: ({ tableName }) => `${tableName}_yn`,
  labels: { singular: label('yesNo'), plural: label('yesNo') },
  interfaceName: 'YesNoAnswer',
  admin: { disableBlockName: true },
  fields: [
    {
      type: 'row',
      fields: [
        { ...textField('yesLabel', 'yesLabel', 200, true), defaultValue: 'Yes', validate: validateYesNoLabel('yesLabel') },
        { ...textField('noLabel', 'noLabel', 200, true), defaultValue: 'No', validate: validateYesNoLabel('noLabel') },
      ],
    },
    idField('yesId'),
    idField('noId'),
  ],
}
