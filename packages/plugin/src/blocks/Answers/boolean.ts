import type { Block, Field, FieldHook } from 'payload'

// Fill legacy values before the collection hook resolves duplicate ids.
const booleanIdBeforeValidate: FieldHook[] = [({ value }) => value ?? crypto.randomUUID()]

const truthyField: Field = {
  name: 'trueOption',
  type: 'text',
  label: 'True option',
  defaultValue: 'Yes',
  required: true,
}
const trueId: Field = {
  name: 'trueId',
  type: 'text',
  defaultValue: () => crypto.randomUUID(),
  admin: { hidden: true },
  required: true,
  hooks: {
    beforeValidate: booleanIdBeforeValidate,
  },
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
  required: true,
  defaultValue: () => crypto.randomUUID(),
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
      fields: [{ type: 'row', fields: [truthyField, falsyField] }, trueId, falseId],
      label: false,
    },
  ],
  slug: 'booleanOptions',
  dbName: ({ tableName }) => `${tableName}_bool`,
  labels: { singular: 'True or false', plural: 'True or false' },
  interfaceName: 'BooleanOptions',
}
