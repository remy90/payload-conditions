import { describe, expect, it } from 'vitest'
import { nextPageId, previousPageId, resolveVisibility } from '../src/index.js'
import { booleanQuestion, condition, page, questionnaire } from './fixtures.js'

// Ported from ohme page-calculator.test.ts. Response metadata, review/status
// handling and product/accessory journey rules are outside this engine's API.
describe('navigation', () => {
  it('handles an empty questionnaire and a single page', () => {
    const empty = questionnaire()
    expect([...resolveVisibility(empty, new Map()).visiblePageIds]).toEqual([])
    expect(nextPageId(empty, new Set())).toBeUndefined()
    expect(previousPageId(empty, new Set())).toBeUndefined()
    const single = questionnaire(page('one'))
    const { visiblePageIds } = resolveVisibility(single, new Map())
    expect(nextPageId(single, visiblePageIds)).toBe('one')
    // ohme clamps at the current page at an edge; this API returns undefined.
    expect(nextPageId(single, visiblePageIds, 'one')).toBeUndefined()
    expect(previousPageId(single, visiblePageIds, 'one')).toBeUndefined()
  })

  it('moves between two unconditional pages', () => {
    const q = questionnaire(page('one'), page('two'))
    const { visiblePageIds } = resolveVisibility(q, new Map())
    expect(nextPageId(q, visiblePageIds, 'one')).toBe('two')
    expect(previousPageId(q, visiblePageIds, 'two')).toBe('one')
  })

  it('moves to a second page when its prerequisite holds', () => {
    const q = questionnaire(page('one', [booleanQuestion('a')]), page('two', [], [condition('a')]))
    const { visiblePageIds } = resolveVisibility(q, new Map([['a', ['yes']]]))
    expect([...visiblePageIds]).toEqual(['one', 'two'])
    expect(nextPageId(q, visiblePageIds, 'one')).toBe('two')
    expect(previousPageId(q, visiblePageIds, 'two')).toBe('one')
  })

  it('skips pages with unanswered prerequisites and keeps empty pages visible', () => {
    // ohme skips empty standard/multi-question pages. Here an unconditioned
    // page is visible regardless of its question count.
    const q = questionnaire(page('one', [booleanQuestion('a')]), page('hidden', [], [condition('a')]), page('empty'))
    const { visiblePageIds } = resolveVisibility(q, new Map())
    expect([...visiblePageIds]).toEqual(['one', 'empty'])
    expect(nextPageId(q, visiblePageIds, 'one')).toBe('empty')
    expect(previousPageId(q, visiblePageIds, 'empty')).toBe('one')
  })

  it('uses the position of a hidden current page and handles unknown or omitted current ids', () => {
    const q = questionnaire(...['a', 'b', 'c', 'd', 'e'].map(id => page(id)))
    const visible = new Set(['b', 'd', 'foreign'])
    expect(nextPageId(q, visible)).toBe('b')
    expect(nextPageId(q, visible, 'unknown')).toBe('b')
    expect(previousPageId(q, visible)).toBeUndefined()
    expect(previousPageId(q, visible, 'unknown')).toBeUndefined()
    expect(nextPageId(q, visible, 'a')).toBe('b')
    expect(nextPageId(q, visible, 'c')).toBe('d')
    expect(previousPageId(q, visible, 'c')).toBe('b')
    expect(previousPageId(q, visible, 'a')).toBeUndefined()
    expect(previousPageId(q, visible, 'e')).toBe('d')
    expect(nextPageId(q, visible, 'e')).toBeUndefined()
    expect(nextPageId(q, new Set(), 'c')).toBeUndefined()
    expect(previousPageId(q, new Set(), 'c')).toBeUndefined()
  })
})
