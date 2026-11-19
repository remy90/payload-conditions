import type { LabelFunction } from 'payload'
import { en } from './languages/en.js'

const pluralKeys = {
  questionCount: ['questionCount_one', 'questionCount_other'],
  groupCount: ['groupCount_one', 'groupCount_other'],
} as const

type EnglishKey = keyof (typeof en)['plugin-questionnaire']
export type TranslationKey = EnglishKey | keyof typeof pluralKeys
type Translator = (key: never, options?: Record<string, unknown>) => string
export type TranslationContext = { req?: { t?: Translator }; t?: Translator }

export const translate = (
  context: TranslationContext,
  key: TranslationKey,
  options: Record<string, unknown> = {},
): string => {
  const t = context.t ?? context.req?.t
  const translationKey = `plugin-questionnaire:${key}`
  const englishKey =
    key in pluralKeys
      ? pluralKeys[key as keyof typeof pluralKeys][options.count === 1 ? 0 : 1]
      : (key as EnglishKey)
  // Payload 3.94 throws for a count lookup when the namespace is absent.
  const probeKey = `plugin-questionnaire:${englishKey}`
  const canTranslate = t && (!(key in pluralKeys) || t(probeKey as never) !== probeKey)
  const translated = canTranslate ? t(translationKey as never, options) : undefined
  if (translated !== undefined && translated !== translationKey) return translated
  return en['plugin-questionnaire'][englishKey].replace(/{{(\w+)}}/g, (_, name: string) =>
    String(options[name] ?? ''),
  )
}

export const label =
  (key: TranslationKey): LabelFunction =>
  ({ t }) =>
    translate({ t }, key)
