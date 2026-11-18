import type { FormState } from 'payload'

export const rowCount = (fields: FormState, path: string): number => {
  const field = fields[path]
  if (Array.isArray(field?.rows)) return field.rows.length
  const count = field?.value
  return typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 ? count : 0
}

export const stringValue = (fields: FormState, path: string): string | undefined => {
  const value = fields[path]?.value
  return typeof value === 'string' && value.trim() ? value : undefined
}
