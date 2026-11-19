import type { FieldHook, TextField } from 'payload'
import {
  label,
  translate,
  type TranslationContext,
  type TranslationKey,
} from '../translations/index.js'

type Context = TranslationContext & {
  data?: unknown
  path?: (string | number)[]
  siblingData?: Record<string, unknown>
}
const at = (data: unknown, path: (string | number)[]): unknown =>
  path.reduce<unknown>(
    (value, key) =>
      value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined,
    data,
  )

const rowArrays = (data: unknown, key: string): Record<string, unknown>[][] => {
  if (Array.isArray(data)) return data.flatMap((value) => rowArrays(value, key))
  if (!data || typeof data !== 'object') return []
  return Object.entries(data).flatMap(([name, value]) =>
    name === key && Array.isArray(value) ? [value] : rowArrays(value, key),
  )
}

export const validateName = (value: unknown, context: Context): true | string => {
  const valid = textValidator({ required: true, maxLength: 64 })(value, context)
  if (valid !== true) return valid
  const name = String(value).trim()
  if (!/^[a-z][a-z0-9_]*$/.test(name)) return translate(context, 'invalidName')
  if (!context.path) {
    return rowArrays(context.data, 'questions').flat().some(
      (question) =>
        question.id !== context.siblingData?.id &&
        typeof question.name === 'string' &&
        question.name.trim() === name,
    )
      ? translate(context, 'duplicateName')
      : true
  }
  const path = context.path
  const pages = at(context.data, path.slice(0, -4))
  if (Array.isArray(pages)) {
    for (const [p, page] of pages.entries()) {
      for (const [q, question] of (Array.isArray(page?.questions) ? page.questions : []).entries()) {
        if (String(p) === String(path.at(-4)) && String(q) === String(path.at(-2))) continue
        if (typeof question.name === 'string' && question.name.trim() === name)
          return translate(context, 'duplicateName')
      }
    }
  }
  return true
}

export const validateOptionLabel = (value: unknown, context: Context): true | string => {
  const valid = textValidator({ required: true, maxLength: 200 })(value, context)
  if (valid !== true) return valid
  const path = context.path
  const options = path
    ? at(context.data, path.slice(0, -2))
    : rowArrays(context.data, 'options').find((rows) =>
        rows.some((option) => option.id === context.siblingData?.id),
      )
  const label = String(value).trim().toLowerCase()
  return Array.isArray(options) &&
    options.some(
      (option, index) =>
        (path
          ? String(index) !== String(path.at(-2))
          : option.id !== context.siblingData?.id) &&
        typeof option.label === 'string' &&
        option.label.trim().toLowerCase() === label,
    )
    ? translate(context, 'duplicateOptionLabel')
    : true
}

export const validateYesNoLabel =
  (key: 'yesLabel' | 'noLabel') =>
  (value: unknown, context: Context): true | string => {
    const valid = textValidator({ required: true, maxLength: 200 })(value, context)
    if (valid !== true) return valid
    const other = context.siblingData?.[key === 'yesLabel' ? 'noLabel' : 'yesLabel']
    return typeof other === 'string' &&
      other.trim().toLowerCase() === String(value).trim().toLowerCase()
      ? translate(context, 'duplicateOptionLabel')
      : true
  }

export const validateMaxLength = (value: unknown, context: TranslationContext): true | string =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 10000
    ? true
    : translate(context, 'invalidMaxLength')

export const textField = (
  name: string,
  key: TranslationKey,
  maxLength: number,
  required = false,
): TextField => ({
  name,
  type: 'text',
  label: label(key),
  required,
  maxLength,
  hooks: { beforeValidate: [trimText] },
  validate: textValidator({ required, maxLength }),
})

export const trimText: FieldHook = ({ value }) => (typeof value === 'string' ? value.trim() : value)

export const textValidator =
  ({ required = false, maxLength }: { required?: boolean; maxLength: number }) =>
  (value: unknown, context: TranslationContext): true | string => {
    if (value == null || value === '') return required ? translate(context, 'requiredText') : true
    if (typeof value !== 'string') return translate(context, 'invalidText')
    const text = value.trim()
    if (required && !text) return translate(context, 'requiredText')
    return text.length > maxLength ? translate(context, 'tooLong', { max: maxLength }) : true
  }
