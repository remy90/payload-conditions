import type { Config } from 'payload'
import { describe, expect, it } from 'vitest'
import { questionnairePlugin, Questionnaires } from '../src/index.js'

const baseConfig: Config = {
  secret: 'test',
  db: {
    defaultIDType: 'text',
    init: () => {
      throw new Error('Unexpected database initialization')
    },
  },
}

describe('questionnairePlugin', () => {
  it('uses the definePlugin slug and leaves disabled config unchanged', async () => {
    const plugin = questionnairePlugin({ enabled: false })
    expect(plugin.slug).toBe('questionnaire')
    const config = Object.freeze({ ...baseConfig, collections: Object.freeze([]) as unknown as [] })
    expect(await plugin(config)).toBe(config)
  })

  it('appends the collection without changing the host config', async () => {
    const existing = { slug: 'existing', fields: [] }
    const collections = Object.freeze([existing])
    const config = Object.freeze({ ...baseConfig, collections: collections as unknown as [] })
    const result = await questionnairePlugin()(config)
    expect(result.collections).toEqual([existing, Questionnaires])
    expect(config.collections).toEqual([existing])
    expect(config.i18n).toBeUndefined()
  })

  it.each(['preview', 'livePreview', 'both'])(
    'accepts %s options without mutating defaults',
    async (mode) => {
      const options = {
        ...(mode !== 'livePreview' ? { preview: () => '/preview' } : {}),
        ...(mode !== 'preview' ? { livePreview: { url: '/live' } } : {}),
      }
      const result = await questionnairePlugin(options)(baseConfig)
      expect(result.collections?.[0]?.admin).toEqual({ ...Questionnaires.admin, ...options })
      expect(Questionnaires.admin?.preview).toBeUndefined()
      expect(Questionnaires.admin?.livePreview).toBeUndefined()
    },
  )

  it('merges English defaults with host translation overrides', async () => {
    const result = await questionnairePlugin()({
      ...baseConfig,
      i18n: {
        translations: { en: { 'plugin-questionnaire': { title: 'Survey title' } } },
      },
    })
    expect(result.i18n?.translations?.en).toMatchObject({
      'plugin-questionnaire': { title: 'Survey title', pages: 'Pages' },
    })
  })
})
