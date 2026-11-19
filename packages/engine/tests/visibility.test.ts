import { describe, expect, it } from 'vitest'
import { applyAnswer, resolveVisibility } from '../src/index.js'
import { yesNoQuestion, condition, page, questionnaire } from './fixtures.js'

const chain = () =>
  questionnaire(
    page('A', [yesNoQuestion('a')]),
    page('B', [yesNoQuestion('b')], [condition('a')]),
    page('C', [yesNoQuestion('c')], [condition('b')]),
  )

describe('forward visibility', () => {
  it('clears the A → B → C dependency chain in one pass without mutating inputs', () => {
    // ohme calculates visibility against existing answers. The engine clears
    // hidden-page answers before evaluating dependents in its forward pass.
    const q = chain()
    const before = structuredClone(q)
    const values = Object.freeze(['yes'])
    const answers = new Map([
      ['a', Object.freeze(['no'])],
      ['b', values],
      ['c', values],
      ['foreign', values],
    ])
    const result = resolveVisibility(q, answers)
    expect([...result.visiblePageIds]).toEqual(['A'])
    expect([...result.answers]).toEqual([
      ['a', ['no']],
      ['foreign', ['yes']],
    ])
    expect([...answers.keys()]).toEqual(['a', 'b', 'c', 'foreign'])
    expect(values).toEqual(['yes'])
    expect(q).toEqual(before)
  })

  it('keeps negative dependents hidden after clearing their source answer', () => {
    for (const operator of ['not_equals', 'not_in'] as const) {
      const q = questionnaire(
        page('A', [yesNoQuestion('a')]),
        page('B', [yesNoQuestion('b')], [condition('a')]),
        page('C', [], [{ ...condition('b', 'no'), operator }]),
      )
      const answers = new Map([
        ['a', ['no']],
        ['b', ['yes']],
      ])
      expect([...resolveVisibility(q, answers).visiblePageIds]).toEqual(['A'])
    }
  })

  it('preserves the answers reference when no entries need clearing', () => {
    const answers = new Map([
      ['a', ['yes']],
      ['b', ['yes']],
    ])
    expect(resolveVisibility(chain(), answers).answers).toBe(answers)
    const hiddenWithoutAnswers = new Map([['a', ['no']]])
    expect(resolveVisibility(chain(), hiddenWithoutAnswers).answers).toBe(hiddenWithoutAnswers)
    expect(resolveVisibility(questionnaire(), answers).answers).toBe(answers)
  })
})

describe('applying answers', () => {
  it('updates an answer, clears dependents and keeps the input map intact', () => {
    const answers = new Map([
      ['a', ['yes']],
      ['b', ['yes']],
      ['c', ['yes']],
    ])
    const result = applyAnswer(chain(), answers, 'a', ['no'])
    expect([...result.answers]).toEqual([['a', ['no']]])
    expect([...result.visiblePageIds]).toEqual(['A'])
    expect([...answers]).toEqual([
      ['a', ['yes']],
      ['b', ['yes']],
      ['c', ['yes']],
    ])
  })

  it('deletes empty answers and ignores unknown questions while still resolving visibility', () => {
    const answers = new Map([
      ['a', ['no']],
      ['b', ['yes']],
    ])
    expect([...applyAnswer(chain(), answers, 'a', []).answers]).toEqual([])
    expect([...applyAnswer(chain(), answers, 'unknown', ['yes']).answers]).toEqual([['a', ['no']]])
    const empty = new Map()
    expect(applyAnswer(chain(), empty, 'unknown', []).answers).toBe(empty)
  })

  it('clears an answer submitted to a hidden question in the same call', () => {
    const answers = new Map([['a', ['no']]])
    const result = applyAnswer(chain(), answers, 'b', ['yes'])
    expect([...result.answers]).toEqual([['a', ['no']]])
    expect([...result.visiblePageIds]).toEqual(['A'])
  })

  it('copies submitted values so later caller edits do not alter the result', () => {
    const values = ['yes']
    const result = applyAnswer(chain(), new Map(), 'a', values)
    values[0] = 'no'
    expect(result.answers.get('a')).toEqual(['yes'])
    expect([...result.visiblePageIds]).toEqual(['A', 'B'])
  })
})
