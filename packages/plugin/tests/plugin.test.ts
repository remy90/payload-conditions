import type { CollectionConfig, Config } from 'payload'
import { describe, expect, it } from 'vitest'
import { payloadConditions, Questionnaire } from '../src/index.js'

const baseConfig: Config = {
  secret: 'test',
  db: {
    defaultIDType: 'text',
    init: () => {
      throw new Error('Unexpected database initialization')
    },
  },
}

describe('payloadConditions', () => {
  it('leaves disabled config unchanged', async () => {
    const collections: CollectionConfig[] = [{ slug: 'existing', fields: [] }]
    const config: Config = { ...baseConfig, collections }
    Object.freeze(collections)
    Object.freeze(config)
    const result = await payloadConditions({ enabled: false })(config)
    expect(result).toEqual(config)
    expect(result.collections).toBe(collections)
  })

  it('does not add collections to disabled config without any', async () => {
    const config = Object.freeze({ ...baseConfig })
    expect(await payloadConditions({ enabled: false })(config)).toEqual(baseConfig)
  })

  it('appends the questionnaire by default without mutating the config or its collections', async () => {
    const existing: CollectionConfig = { slug: 'existing', fields: [] }
    const collections = [existing]
    const config = Object.freeze({ ...baseConfig, collections })
    Object.freeze(collections)
    const result = await payloadConditions()(config)
    expect(result).not.toBe(config)
    expect(result.collections).toEqual([existing, Questionnaire])
    expect(result.collections).not.toBe(collections)
    expect(config).toEqual({ ...baseConfig, collections: [existing] })
  })

  it('adds the questionnaire when no collections were configured', async () => {
    const config = Object.freeze({ ...baseConfig })
    expect(await payloadConditions({ enabled: true })(config)).toEqual({
      ...baseConfig,
      collections: [Questionnaire],
    })
    expect(config).toEqual(baseConfig)
  })
})
