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
import { booleanQuestion, condition, page, questionnaire } from './fixtures.js'

// Ported from ohme prerequisite-evalulator.test.ts: QuestionOperator.Equals
// becomes is. This API names its selection operators is/isNot and includes/excludes.
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
    const q = questionnaire(page('source', ['a', 'b', 'c'].map(booleanQuestion)), target)
    const answers = new Map(['a', 'b', 'c'].map((id) => [id, [matching ? 'yes' : 'no']]))
    expect(evaluatePage(q, 'target', answers)).toBe(expected)
  })

  it.each<[Operator, string[], boolean]>([
    ['is', ['yes'], true],
    ['is', ['no'], false],
    ['isNot', ['no'], true],
    ['isNot', ['yes'], false],
    ['isNot', [], false],
    ['includes', ['no', 'yes'], true],
    ['includes', ['no'], false],
    ['excludes', ['no'], true],
    ['excludes', ['yes'], false],
    ['excludes', [], false],
  ])('%s with %j is %s', (operator, values, expected) => {
    const q = questionnaire(
      page('source', [booleanQuestion('a')]),
      page('target', [], [{ ...condition('a'), operator }]),
    )
    expect(evaluatePage(q, 'target', new Map([['a', values]]))).toBe(expected)
  })

  it('returns false for unknown, unanswered, same-page and later-page sources', () => {
    // ohme's getAllQuestions allowed prerequisites to reference questions on any page.
    // The engine deliberately allows earlier pages only.
    for (const questionId of ['unknown', 'earlier', 'same', 'later']) {
      const q = questionnaire(
        page('source', [booleanQuestion('earlier')]),
        page('target', [booleanQuestion('same')], [condition(questionId)]),
        page('end', [booleanQuestion('later')]),
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
    const source = page('source', [booleanQuestion('a')])
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
    const source = page('source', [booleanQuestion('a')])
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
    for (const answer of [{ type: 'inputText', prompt: '' }, { type: 'future' }] as Answer[]) {
      const q = questionnaire(
        page('source', [{ ...booleanQuestion('a'), answer }]),
        page('target', [], [condition('a')]),
      )
      expect(evaluatePage(q, 'target', new Map([['a', ['yes']]]))).toBe(false)
    }
    const q = questionnaire(
      page('source', [booleanQuestion('a')]),
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

  it('exposes operators for boolean, single choice, multiple choice and text', () => {
    expect(operators).toEqual(['is', 'isNot', 'includes', 'excludes'])
    expect(matchModes).toEqual(['all', 'any'])
    expect(operatorsFor(booleanQuestion('a').answer)).toEqual(['is', 'isNot'])
    expect(
      operatorsFor({ type: 'multipleChoice', allowMultipleSelection: false, options: [] }),
    ).toEqual(['is', 'isNot'])
    expect(
      operatorsFor({ type: 'multipleChoice', allowMultipleSelection: true, options: [] }),
    ).toEqual(['includes', 'excludes'])
    expect(operatorsFor({ type: 'inputText', prompt: '' })).toEqual([])
  })

  it('evaluates single and multiple choice sources with short and long selections', () => {
    for (const allowMultipleSelection of [false, true]) {
      const source = {
        ...booleanQuestion('a'),
        answer: {
          type: 'multipleChoice' as const,
          allowMultipleSelection,
          options: [{ id: 'yes', label: 'Yes' }],
        },
      }
      const q = questionnaire(
        page('source', [source]),
        page(
          'target',
          [],
          [{ ...condition('a'), operator: allowMultipleSelection ? 'includes' : 'is' }],
        ),
      )
      expect(evaluatePage(q, 'target', new Map([['a', ['yes']]]))).toBe(true)
      expect(evaluatePage(q, 'target', new Map([['a', ['no']]]))).toBe(false)
      const values = Array.from({ length: 30 }, (_, i) => String(i))
      expect(evaluatePage(q, 'target', new Map([['a', [...values, 'yes']]]))).toBe(true)
      expect(evaluatePage(q, 'target', new Map([['a', values]]))).toBe(false)
      const negative = questionnaire(
        q.pages[0],
        page(
          'target',
          [],
          [{ ...condition('a'), operator: allowMultipleSelection ? 'excludes' : 'isNot' }],
        ),
      )
      expect(evaluatePage(negative, 'target', new Map([['a', values]]))).toBe(true)
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
    const q = questionnaire(page('source', ['a', 'b', 'c'].map(booleanQuestion)), target)
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
