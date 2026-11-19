import { matchModes, type Match } from '@remy90/payload-conditions-engine'
import type { Field } from 'payload'

export const matchField = (label: string, optionLabels: Record<Match, string>): Field => ({
  name: 'match',
  enumName: ({ tableName }) => `e_${tableName}_match`,
  type: 'select',
  defaultValue: 'all',
  label,
  options: matchModes.map((value) => ({ label: optionLabels[value], value })),
  required: true,
})
