import { randomUUID } from 'crypto'
import type { Block, Field } from 'payload/types'

const truthyField: Field = {
  name: 'trueOption',
  type: 'text',
  label: 'True option',
  defaultValue: 'Yes',
  required: true,
  custom: {
    id: 'custom id',
  },
}
const trueId: Field = {
  name: 'trueId',
  type: 'text',
  admin: { hidden: true },
  defaultValue: randomUUID(),
}

const falsyField: Field = {
  name: 'falseOption',
  type: 'text',
  label: 'False option',
  defaultValue: 'No',
  required: true,
}
const falseId: Field = {
  name: 'falseId',
  type: 'text',
  admin: { hidden: true },
  defaultValue: randomUUID(),
}

export const booleanOptionsBlock: Block = {
  fields: [
    {
      name: 'booleanOptions',
      type: 'group',
      fields: [truthyField, trueId, falsyField, falseId],
      label: false,
    },
  ],
  slug: 'booleanOptions',
  labels: { singular: 'True or false', plural: 'True or false' },
  interfaceName: 'BooleanOptions',
}
