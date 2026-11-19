import { matchModes, type Match } from '@remy90/payload-conditions-engine'
import type { Field } from 'payload'
import { label, type TranslationKey } from '../translations/index.js'

export const matchField = (key: TranslationKey, optionLabels: Record<Match, TranslationKey>): Field => ({
  name: 'match',
  enumName: ({ tableName }) => `e_${tableName}_match`,
  type: 'select',
  defaultValue: 'all',
  label: label(key),
  options: matchModes.map((value) => ({ label: label(optionLabels[value]), value })),
  required: true,
})
