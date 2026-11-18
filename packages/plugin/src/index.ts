import type { Plugin } from 'payload'
import { Questionnaire } from './collections/Questionnaire.js'
import { StandardPage as StandardPageBlock } from './blocks/formPage.js'

export interface PluginTypes {
  /**
   * Enable or disable the plugin.
   * @default true
   */
  enabled?: boolean
}

export const payloadConditions = ({ enabled = true }: PluginTypes = {}): Plugin =>
  (config) => ({
    ...config,
    ...(enabled ? { collections: [...(config.collections ?? []), Questionnaire] } : {}),
  })

export { Questionnaire }
export { normalizeBooleanIdsHook } from './blocks/Answers/normalizeBooleanIds.js'
export const StandardPage = StandardPageBlock
export type StandardPage = import('./types.js').StandardPage
export type { BooleanOptions, MultipleChoice, InputText } from './types.js'
export type * from '@remy90/payload-conditions-engine/payload'
