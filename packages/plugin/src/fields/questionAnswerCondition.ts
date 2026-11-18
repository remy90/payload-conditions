import { matchModes } from '@remy90/payload-conditions-engine'
import type { Field } from 'payload'

export const match: Field = {
  name: 'match',
  type: 'select',
  defaultValue: 'all',
  label: false,
  options: matchModes.map((value) => ({ label: value === 'all' ? 'All' : 'Any', value })),
  required: true,
}
