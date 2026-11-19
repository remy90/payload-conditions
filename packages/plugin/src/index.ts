import { definePlugin, type CollectionAdminOptions } from 'payload'
import { deepMergeSimple } from 'payload/shared'
import { Questionnaires } from './collections/Questionnaires.js'
import { en } from './translations/languages/en.js'

export type QuestionnairePluginOptions = {
  enabled?: boolean
  preview?: CollectionAdminOptions['preview']
  livePreview?: CollectionAdminOptions['livePreview']
}

const defineQuestionnairePlugin = definePlugin<QuestionnairePluginOptions>({
  slug: 'questionnaire',
  plugin: ({ config, enabled = true, preview, livePreview }) => {
    if (!enabled) return config
    const languages = config.i18n?.supportedLanguages
      ? Object.keys(config.i18n.supportedLanguages)
      : ['en']
    const translations = Object.fromEntries(languages.map((language) => [language, en]))
    return {
      ...config,
      collections: [
        ...(config.collections ?? []),
        preview === undefined && livePreview === undefined
          ? Questionnaires
          : {
              ...Questionnaires,
              admin: {
                ...Questionnaires.admin,
                ...(preview !== undefined ? { preview } : {}),
                ...(livePreview !== undefined ? { livePreview } : {}),
              },
            },
      ],
      i18n: {
        ...config.i18n,
        translations: deepMergeSimple(translations, config.i18n?.translations ?? {}),
      },
    }
  },
})

export const questionnairePlugin = (options: QuestionnairePluginOptions = {}) =>
  defineQuestionnairePlugin(options)

export { Questionnaires }
export { QuestionnairePage } from './blocks/questionnairePage.js'
export { questionnaireBeforeChange } from './hooks/questionnaireBeforeChange.js'
export type * from '@remy90/payload-conditions-engine/payload'
