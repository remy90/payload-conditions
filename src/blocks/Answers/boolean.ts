import { randomUUID } from 'crypto'
import type { Block, Field, FieldHook } from 'payload/types'

const booleanIdBeforeValidate: FieldHook<any, any, any>[] = [({value}) => {
  value = value ?? randomUUID()
  return value
}]

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
  required: true,
  hooks: {
    beforeValidate: booleanIdBeforeValidate,
  }
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
  hooks: {
    beforeValidate: booleanIdBeforeValidate,
  },
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
