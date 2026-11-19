import { describe, expect, it } from 'vitest'
import {
  evaluatePage,
  operators,
  matchModes,
  operatorsFor,
  type Answer,
  type Match,
  type Operator,
} from '../src/index.js'
import { yesNoQuestion, condition, page, questionnaire } from './fixtures.js'

describe('two-level prerequisites', () => {
  it.each<[Match, Match, boolean, boolean]>([
    ['all', 'all', true, true],
    ['all', 'all', false, false],
    ['all', 'any', true, true],
    ['all', 'any', false, false],
    ['any', 'all', true, true],
    ['any', 'all', false, false],
    ['any', 'any', true, true],
    ['any', 'any', false, false],
  ])('page %s / group %s / matching %s', (pageMatch, groupMatch, matching, expected) => {
    const target = page('target')
    target.match = pageMatch
    target.conditionGroups = [
      { match: groupMatch, conditions: [condition('a'), condition('b')] },
      { match: groupMatch, conditions: [condition('c')] },
    ]
    const q = questionnaire(page('source', ['a', 'b', 'c'].map(yesNoQuestion)), target)
    const answers = new Map(['a', 'b', 'c'].map((id) => [id, [matching ? 'yes' : 'no']]))
    expect(evaluatePage(q, 'target', answers)).toBe(expected)
  })

  it.each<[Operator, string[], boolean]>([
    ['equals', [], false],
    ['equals', ['yes'], true],
    ['equals', ['no'], false],
    ['not_equals', ['no'], true],
    ['not_equals', ['yes'], false],
    ['not_equals', [], false],
    ['in', [], false],
    ['in', ['no', 'yes'], true],
    ['in', ['no'], false],
    ['not_in', ['no'], true],
    ['not_in', ['yes'], false],
    ['not_in', [], false],
  ])('%s with %j is %s', (operator, values, expected) => {
    const q = questionnaire(
      page('source', [{
        ...yesNoQuestion('a'),
        answer: operator === 'in' || operator === 'not_in'
          ? { type: 'choice', hasMany: true, options: [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }] }
          : yesNoQuestion('a').answer,
      }]),
      page('target', [], [{ ...condition('a'), operator }]),
    )
    expect(evaluatePage(q, 'target', new Map([['a', values]]))).toBe(expected)
  })

  it('uses the first question in document order when question ids repeat', () => {
    const q = questionnaire(
      page('source', [yesNoQuestion('a')]),
      page('target', [], [condition('a')]),
      page('end', [yesNoQuestion('a')]),
    )
    expect(evaluatePage(q, 'target', new Map([['a', ['yes']]]))).toBe(true)
  })

  it('returns false for unknown, unanswered, same-page and later-page sources', () => {
    // ohme's getAllQuestions allowed prerequisites to reference questions on any page.
    // The engine deliberately allows earlier pages only.
    for (const questionId of ['unknown', 'earlier', 'same', 'later']) {
      const q = questionnaire(
        page('source', [yesNoQuestion('earlier')]),
        page('target', [yesNoQuestion('same')], [condition(questionId)]),
        page('end', [yesNoQuestion('later')]),
      )
      expect(
        evaluatePage(
          q,
          'target',
          new Map([
            ['same', ['yes']],
            ['later', ['yes']],
          ]),
        ),
      ).toBe(false)
      expect(evaluatePage(q, 'unknown', new Map())).toBe(false)
    }
  })

  it('returns false for an unknown page match mode', () => {
    const source = page('source', [yesNoQuestion('a')])
    const target = page('target', [], [condition('a')])
    const answers = new Map([['a', ['yes']]])
    expect(evaluatePage(questionnaire(source, target), 'target', answers)).toBe(true)
    expect(
      evaluatePage(
        questionnaire(source, { ...target, match: 'future' as Match }),
        'target',
        answers,
      ),
    ).toBe(false)
  })

  it.each(matchModes)('returns false for an unknown group match mode on an %s page', (match) => {
    const source = page('source', [yesNoQuestion('a')])
    const target = { ...page('target', [], [condition('a')]), match }
    const answers = new Map([['a', ['yes']]])
    expect(evaluatePage(questionnaire(source, target), 'target', answers)).toBe(true)
    const invalid = {
      ...target,
      conditionGroups: [{ match: 'future' as Match, conditions: [condition('a')] }],
    }
    expect(evaluatePage(questionnaire(source, invalid), 'target', answers)).toBe(false)
  })

  it('rejects text prerequisites and unknown answer types and operators', () => {
    // ohme treated unsupported answer types (including input text) as true.
    // The engine treats them as false. Unknown operators also fail closed.
    for (const answer of [{ type: 'text', maxLength: 2000 }, { type: 'future' }] as Answer[]) {
      const q = questionnaire(
        page('source', [{ ...yesNoQuestion('a'), answer }]),
        page('target', [], [condition('a')]),
      )
      expect(evaluatePage(q, 'target', new Map([['a', ['yes']]]))).toBe(false)
    }
    const q = questionnaire(
      page('source', [yesNoQuestion('a')]),
      page('target', [], [{ ...condition('a'), operator: 'future' as Operator }]),
    )
    expect(evaluatePage(q, 'target', new Map([['a', ['yes']]]))).toBe(false)
  })

  it('ignores empty groups in either page match mode', () => {
    // ohme any-of-zero groups was false; the engine treats an unconditioned page as visible.
    for (const match of matchModes) {
      const q = questionnaire({
        ...page('target'),
        match,
        conditionGroups: [{ match: 'any', conditions: [] }],
      })
      expect(evaluatePage(q, 'target', new Map())).toBe(true)
    }
  })

  it('exposes operators for yes/no, single choice, many choices and text', () => {
    expect(operators).toEqual(['equals', 'not_equals', 'in', 'not_in'])
    expect(matchModes).toEqual(['all', 'any'])
    expect(operatorsFor(yesNoQuestion('a').answer)).toEqual(['equals', 'not_equals'])
    expect(
      operatorsFor({ type: 'choice', hasMany: false, options: [] }),
    ).toEqual(['equals', 'not_equals'])
    expect(
      operatorsFor({ type: 'choice', hasMany: true, options: [] }),
    ).toEqual(['in', 'not_in'])
    expect(operatorsFor({ type: 'text', maxLength: 2000 })).toEqual([])
  })

  it('evaluates single and multiple choice sources with short and long selections', () => {
    for (const hasMany of [false, true]) {
      const source = {
        ...yesNoQuestion('a'),
        answer: {
          type: 'choice' as const,
          hasMany,
          options: [{ id: 'yes', label: 'Yes' }],
        },
      }
      const q = questionnaire(
        page('source', [source]),
        page(
          'target',
          [],
          [{ ...condition('a'), operator: hasMany ? 'in' : 'equals' }],
        ),
      )
      expect(evaluatePage(q, 'target', new Map([['a', ['yes']]]))).toBe(true)
      expect(evaluatePage(q, 'target', new Map([['a', ['no']]]))).toBe(false)
      const values = Array.from({ length: 30 }, (_, i) => String(i))
      expect(evaluatePage(q, 'target', new Map([['a', [...values, 'yes']]]))).toBe(hasMany)
      expect(evaluatePage(q, 'target', new Map([['a', values]]))).toBe(false)
      const negative = questionnaire(
        q.pages[0],
        page(
          'target',
          [],
          [{ ...condition('a'), operator: hasMany ? 'not_in' : 'not_equals' }],
        ),
      )
      expect(evaluatePage(negative, 'target', new Map([['a', values]]))).toBe(hasMany)
      expect(evaluatePage(negative, 'target', new Map([['a', [...values, 'yes']]]))).toBe(false)
    }
  })

  it('ignores empty groups alongside a failing nonempty group', () => {
    for (const match of matchModes) {
      const q = questionnaire({
        ...page('target'),
        match,
        conditionGroups: [
          { match: 'all', conditions: [] },
          { match: 'all', conditions: [condition('unknown')] },
        ],
      })
      expect(evaluatePage(q, 'target', new Map())).toBe(false)
    }
  })

  it('combines partially matching groups and conditions', () => {
    const target = page('target')
    const q = questionnaire(page('source', ['a', 'b', 'c'].map(yesNoQuestion)), target)
    const answers = new Map([
      ['a', ['yes']],
      ['b', ['no']],
      ['c', ['no']],
    ])
    target.conditionGroups = [
      { match: 'all', conditions: [condition('a'), condition('b')] },
      { match: 'all', conditions: [condition('a')] },
    ]
    expect(evaluatePage(q, 'target', answers)).toBe(false)
    // A new questionnaire identity is required after editing its definition.
    expect(
      evaluatePage({ ...q, pages: [q.pages[0], { ...target, match: 'any' }] }, 'target', answers),
    ).toBe(true)
    expect(
      evaluatePage(
        questionnaire(q.pages[0], {
          ...target,
          conditionGroups: [{ match: 'any', conditions: [condition('a'), condition('b')] }],
        }),
        'target',
        answers,
      ),
    ).toBe(true)
    expect(
      evaluatePage(
        questionnaire(q.pages[0], {
          ...target,
          conditionGroups: [{ match: 'any', conditions: [condition('b'), condition('c')] }],
        }),
        'target',
        answers,
      ),
    ).toBe(false)
    expect(
      evaluatePage(
        questionnaire(q.pages[0], {
          ...target,
          match: 'any',
          conditionGroups: [
            { match: 'any', conditions: [condition('a'), condition('b')] },
            { match: 'all', conditions: [condition('b'), condition('c')] },
          ],
        }),
        'target',
        answers,
      ),
    ).toBe(true)
  })
})
