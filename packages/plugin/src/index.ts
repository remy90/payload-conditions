import type { CollectionAdminOptions, Plugin } from 'payload'
import { Questionnaire } from './collections/Questionnaire.js'
import { StandardPage as StandardPageBlock } from './blocks/formPage.js'

export interface PluginTypes {
  /**
   * Enable or disable the plugin.
   * @default true
   */
  enabled?: boolean
  /** Configure the questionnaire collection's Preview button. */
  preview?: CollectionAdminOptions['preview']
  /** Configure the questionnaire collection's Live Preview panel. */
  livePreview?: CollectionAdminOptions['livePreview']
}

export const payloadConditions =
  ({ enabled = true, preview, livePreview }: PluginTypes = {}): Plugin =>
  (config) => ({
    ...config,
    ...(enabled
      ? {
          collections: [
            ...(config.collections ?? []),
            preview === undefined && livePreview === undefined
              ? Questionnaire
              : {
                  ...Questionnaire,
                  admin: {
                    ...Questionnaire.admin,
                    ...(preview !== undefined ? { preview } : {}),
                    ...(livePreview !== undefined ? { livePreview } : {}),
                  },
                },
          ],
        }
      : {}),
  })

export { Questionnaire }
export { normalizeBooleanIdsHook } from './blocks/Answers/normalizeBooleanIds.js'
export const StandardPage = StandardPageBlock
export type StandardPage = import('./types.js').StandardPage
export type { BooleanOptions, MultipleChoice, InputText } from './types.js'
export type * from '@remy90/payload-conditions-engine/payload'
