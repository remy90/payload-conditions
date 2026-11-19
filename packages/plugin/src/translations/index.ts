import type { LabelFunction } from 'payload'
import { en } from './languages/en.js'

export type TranslationKey = keyof (typeof en)['plugin-questionnaire']
type Translator = (key: never, options?: Record<string, unknown>) => string
export type TranslationContext = { req?: { t?: Translator }; t?: Translator }

export const translate = (
  context: TranslationContext,
  key: TranslationKey,
  options: Record<string, unknown> = {},
): string => {
  const t = context.t ?? context.req?.t
  if (t) return t(`plugin-questionnaire:${key}` as never, options)
  return en['plugin-questionnaire'][key].replace(/{{(\w+)}}/g, (_, name: string) =>
    String(options[name] ?? ''),
  )
}

export const label =
  (key: TranslationKey): LabelFunction =>
  ({ t }) =>
    translate({ t }, key)
