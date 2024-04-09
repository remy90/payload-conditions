import { Config } from 'payload/config'
import questionAnswerPair from './collections/questionAnswerPair.js'
import { Questionnaire } from './collections/Questionnaire.js'

export type Plugin = (config: Config) => Config | Promise<Config>

export interface PluginTypes {
  /**
   * Enable or disable plugin
   * @default false
   */
  enabled?: boolean
}

const payloadConditions =
  ({ enabled = true }: PluginTypes): Plugin =>
  (config) => {
    if (!enabled) return config

    config.collections = [...(config.collections || []), Questionnaire]

    return config
  }

export { payloadConditions }
