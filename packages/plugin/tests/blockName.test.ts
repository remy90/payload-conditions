import type { ClientBlock } from 'payload'
import { describe, expect, it } from 'vitest'
import { showBlockName } from '../src/blocks/blockName.js'

const hidden: ClientBlock = {
  slug: 'standardPage',
  fields: [],
  admin: { disableBlockName: true },
}

describe('block name control', () => {
  it('honours an inline block disabling its name', () => {
    expect(showBlockName({ blocks: [hidden] }, 'standardPage')).toBe(false)
  })

  it('shows the name when the block leaves the setting enabled', () => {
    expect(showBlockName({ blocks: [{ ...hidden, admin: {} }] }, 'standardPage')).toBe(true)
  })

  it('resolves referenced blocks through the client config map', () => {
    expect(
      showBlockName({ blocks: [], blockReferences: ['standardPage'] }, 'standardPage', {
        standardPage: hidden,
      }),
    ).toBe(false)
  })

  it('supports inline block references', () => {
    expect(showBlockName({ blocks: [], blockReferences: [hidden] }, 'standardPage')).toBe(false)
  })

  it('keeps the name control for an unknown block type', () => {
    expect(showBlockName({ blocks: [] }, undefined)).toBe(true)
  })
})
