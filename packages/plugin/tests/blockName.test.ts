import type { ClientBlock } from 'payload'
import { describe, expect, it } from 'vitest'
import { showBlockName } from '../src/blocks/blockName.js'

const hidden: ClientBlock = {
  slug: 'page',
  fields: [],
  admin: { disableBlockName: true },
}

describe('block name control', () => {
  it('honours an inline block disabling its name', () => {
    expect(showBlockName({ blocks: [hidden] }, 'page')).toBe(false)
  })

  it('shows the name when the block leaves the setting enabled', () => {
    expect(showBlockName({ blocks: [{ ...hidden, admin: {} }] }, 'page')).toBe(true)
  })

  it('resolves referenced blocks through the client config map', () => {
    expect(
      showBlockName({ blocks: [], blockReferences: ['page'] }, 'page', {
        page: hidden,
      }),
    ).toBe(false)
  })

  it('supports inline block references', () => {
    expect(showBlockName({ blocks: [], blockReferences: [hidden] }, 'page')).toBe(false)
  })

  it('keeps the name control for an unknown block type', () => {
    expect(showBlockName({ blocks: [] }, undefined)).toBe(true)
  })
})
