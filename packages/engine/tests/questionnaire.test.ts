import { describe, expect, it } from 'vitest'
import {
  checkQuestionnaire,
  questionnaireIssueCodes,
  type Questionnaire,
  type QuestionnaireIssueCode,
  type Condition,
} from '../src/index.js'
import { condition, page, questionnaire, yesNoQuestion } from './fixtures.js'

function clean(): Questionnaire {
  const a = yesNoQuestion('a')
  const b = {
    ...yesNoQuestion('b'),
    answer: {
      type: 'choice' as const,
      hasMany: false,
      options: [
        { id: 'b_yes', label: 'Yes' },
        { id: 'b_no', label: 'No' },
      ],
    },
  }
  return questionnaire(
    { ...page('A', [a]), conditionGroups: [] },
    { ...page('B', [b], [{ ...condition('a'), id: 'c' }]), title: 'Details' },
  )
}

describe('questionnaire checks', () => {
  it('accepts a clean questionnaire without changing it', () => {
    const q = clean()
    const before = structuredClone(q)
    expect(checkQuestionnaire(q)).toEqual([])
    expect(q).toEqual(before)
  })

  const issueFixtures: Record<QuestionnaireIssueCode, (q: Questionnaire) => void> = {
    noPages: (q) => {
      q.pages = []
    },
    emptyPage: (q) => {
      q.pages[1].questions = []
    },
    emptyGroup: (q) => {
      q.pages[1].conditionGroups[0].conditions = []
    },
    duplicateId: (q) => {
      q.pages[1].id = 'A'
    },
    duplicateName: (q) => {
      q.pages[1].questions[0].name = 'a'
    },
    invalidName: (q) => {
      q.pages[0].questions[0].name = 'Bad name'
    },
    blankText: (q) => {
      q.pages[1].title = '  '
    },
    duplicateOptionLabel: (q) => {
      const answer = q.pages[0].questions[0].answer
      if (answer.type === 'yesNo') answer.no.label = ' YES '
    },
    unknownQuestion: (q) => {
      q.pages[1].conditionGroups[0].conditions[0].questionId = 'missing'
    },
    samePageQuestion: (q) => {
      q.pages[1].conditionGroups[0].conditions[0].questionId = 'b'
    },
    laterQuestion: (q) => {
      q.pages[0].conditionGroups = [{ match: 'all', conditions: [condition('b', 'b_yes')] }]
    },
    unsupportedSource: (q) => {
      q.pages[0].questions[0].answer = { type: 'text', maxLength: 20 }
    },
    unknownAnswer: (q) => {
      q.pages[1].conditionGroups[0].conditions[0].answerId = 'missing'
    },
    operatorMismatch: (q) => {
      q.pages[1].conditionGroups[0].conditions[0].operator = 'in'
    },
    contradiction: (q) => {
      q.pages[1].conditionGroups[0].conditions.push(condition('a', 'no'))
    },
    unreachablePage: (q) => {
      q.pages[1].conditionGroups[0].conditions.push(condition('a', 'no'))
      q.pages.push(
        page(
          'C',
          [{ ...yesNoQuestion('c'), answer: { type: 'text', maxLength: 20 } }],
          [condition('b', 'b_yes')],
        ),
      )
    },
  }

  it.each(questionnaireIssueCodes)('reports %s from its dedicated fixture', (code) => {
    const q = clean()
    issueFixtures[code](q)
    expect(checkQuestionnaire(q)).toContainEqual(
      expect.objectContaining({
        code,
        message: expect.any(String),
        ...(code === 'noPages' ? {} : { pageId: expect.any(String) }),
        ...(code === 'duplicateName' || code === 'invalidName'
          ? { questionId: expect.any(String) }
          : {}),
      }),
    )
  })

  it.each(['page', 'question', 'option', 'cross-kind'] as const)(
    'reports duplicateId for %s ids',
    (kind) => {
      const q = clean()
      if (kind === 'page') q.pages[1].id = 'A'
      if (kind === 'question') q.pages[1].questions[0].id = 'a'
      if (kind === 'cross-kind') q.pages[1].id = 'a'
      if (kind === 'option') {
        const answer = q.pages[0].questions[0].answer
        if (answer.type === 'yesNo') answer.no.id = answer.yes.id
      }
      expect(checkQuestionnaire(q)).toContainEqual(expect.objectContaining({ code: 'duplicateId' }))
    },
  )

  it('reports duplicateOptionLabel after trimming and case folding', () => {
    const q = clean()
    q.pages[0].questions[0].answer = {
      type: 'choice',
      hasMany: false,
      options: [
        { id: 'x', label: 'Red' },
        { id: 'y', label: ' RED ' },
      ],
    }
    expect(checkQuestionnaire(q)).toContainEqual({
      code: 'duplicateOptionLabel',
      message: expect.any(String),
      pageId: 'A',
      questionId: 'a',
      optionId: 'y',
    })
  })

  it('checks Yes/No label duplicates and blank labels on every supported field', () => {
    const q = clean()
    const answer = q.pages[0].questions[0].answer
    if (answer.type === 'yesNo') answer.no.label = ' YES '
    expect(checkQuestionnaire(q)).toContainEqual(
      expect.objectContaining({ code: 'duplicateOptionLabel', optionId: 'no' }),
    )
    q.title = ' '
    q.pages[0].questions[0].label = '\t'
    q.pages[0].questions[0].answer = {
      type: 'choice',
      hasMany: false,
      options: [{ id: 'x', label: ' ' }],
    }
    expect(checkQuestionnaire(q).filter((issue) => issue.code === 'blankText')).toHaveLength(3)
    if (answer.type === 'yesNo') answer.yes.label = ' '
    q.pages[0].questions[0].answer = answer
    expect(checkQuestionnaire(q)).toContainEqual(
      expect.objectContaining({ code: 'blankText', optionId: 'yes' }),
    )
  })

  it.each<[string, (q: Questionnaire) => void]>([
    [
      'unknownQuestion',
      (q) => {
        q.pages[1].conditionGroups[0].conditions[0].questionId = 'missing'
      },
    ],
    [
      'samePageQuestion',
      (q) => {
        q.pages[1].conditionGroups[0].conditions[0].questionId = 'b'
      },
    ],
    [
      'laterQuestion',
      (q) => {
        q.pages[0].conditionGroups = [
          { match: 'all', conditions: [{ id: 'c', ...condition('b') }] },
        ]
      },
    ],
    [
      'unsupportedSource',
      (q) => {
        q.pages[0].questions[0].answer = { type: 'text', maxLength: 20 }
      },
    ],
    [
      'unknownAnswer',
      (q) => {
        q.pages[1].conditionGroups[0].conditions[0].answerId = 'missing'
      },
    ],
    [
      'operatorMismatch',
      (q) => {
        q.pages[1].conditionGroups[0].conditions[0].operator = 'in'
      },
    ],
  ])('reports %s with the condition location', (code, change) => {
    const q = clean()
    change(q)
    q.pages.forEach((page) =>
      page.conditionGroups.forEach((group) => {
        group.id = 'g'
      }),
    )
    expect(checkQuestionnaire(q)).toContainEqual(
      expect.objectContaining({
        code,
        pageId: code === 'laterQuestion' ? 'A' : 'B',
        groupId: 'g',
        conditionId: 'c',
        questionId: expect.any(String),
        message: expect.any(String),
      }),
    )
  })

  it.each<[Condition, Condition]>([
    [condition('a', 'yes'), condition('a', 'no')],
    [condition('a'), { ...condition('a'), operator: 'not_equals' }],
    [
      { ...condition('a'), operator: 'in' },
      { ...condition('a'), operator: 'not_in' },
    ],
  ])('reports contradiction for incompatible conditions %j and %j in either order', (a, b) => {
    for (const conditions of [
      [a, b],
      [b, a],
    ]) {
      const q = clean()
      q.pages[1].conditionGroups = [
        {
          id: 'g',
          match: 'all',
          conditions: conditions.map((condition, i) => ({ ...condition, id: `c${i}` })),
        },
      ]
      expect(checkQuestionnaire(q)).toContainEqual(
        expect.objectContaining({
          code: 'contradiction',
          pageId: 'B',
          groupId: 'g',
          questionId: 'a',
          conditionId: 'c1',
        }),
      )
      q.pages[1].conditionGroups[0].match = 'any'
      expect(checkQuestionnaire(q).some((issue) => issue.code === 'contradiction')).toBe(false)
    }
  })

  it('accepts repeated compatible conditions and multiple positive selections', () => {
    const q = clean()
    q.pages[0].questions[0].answer = {
      type: 'choice',
      hasMany: true,
      options: [
        { id: 'yes', label: 'Yes' },
        { id: 'no', label: 'No' },
      ],
    }
    q.pages[1].conditionGroups[0].conditions = [
      { ...condition('a'), operator: 'in' },
      { ...condition('a'), operator: 'in' },
      { ...condition('a', 'no'), operator: 'in' },
    ]
    expect(checkQuestionnaire(q)).toEqual([])
  })

  it('reports unreachablePage through a forward dependency chain', () => {
    const q = clean()
    q.pages[1].conditionGroups[0].conditions.push(condition('a', 'no'))
    q.pages.push(
      page(
        'C',
        [{ ...yesNoQuestion('c'), answer: { type: 'text', maxLength: 20 } }],
        [condition('b', 'b_yes')],
      ),
    )
    const issues = checkQuestionnaire(q).filter((issue) => issue.code === 'unreachablePage')
    expect(issues).toEqual([
      { code: 'unreachablePage', pageId: 'B', message: expect.any(String) },
      { code: 'unreachablePage', pageId: 'C', message: expect.any(String) },
    ])
  })

  it.each(['all', 'any'] as const)(
    'marks a dependent %s group unreachable only when its source conditions require it',
    (match) => {
      const q = clean()
      q.pages[1].conditionGroups[0].conditions.push(condition('a', 'no'))
      const target = page(
        'C',
        [{ ...yesNoQuestion('c'), answer: { type: 'text', maxLength: 20 } }],
        [condition('b', 'b_yes'), condition('a')],
      )
      target.conditionGroups[0].match = match
      q.pages.push(target)
      expect(
        checkQuestionnaire(q)
          .filter((issue) => issue.code === 'unreachablePage')
          .map((issue) => issue.pageId),
      ).toEqual(match === 'all' ? ['B', 'C'] : ['B'])
      target.conditionGroups[0].conditions = [condition('b', 'b_yes'), condition('b', 'b_no')]
      expect(
        checkQuestionnaire(q)
          .filter((issue) => issue.code === 'unreachablePage')
          .map((issue) => issue.pageId),
      ).toEqual(['B', 'C'])
    },
  )

  it.each(['all', 'any'] as const)(
    'combines unreachable groups on an %s page conservatively',
    (match) => {
      const q = clean()
      q.pages[1].match = match
      q.pages[1].conditionGroups = [
        { match: 'all', conditions: [condition('a'), condition('a', 'no')] },
        { match: 'all', conditions: [condition('a')] },
      ]
      expect(checkQuestionnaire(q).some((issue) => issue.code === 'unreachablePage')).toBe(
        match === 'all',
      )
      q.pages[1].conditionGroups[1].conditions.push(condition('a', 'no'))
      expect(checkQuestionnaire(q).some((issue) => issue.code === 'unreachablePage')).toBe(true)
    },
  )

  it('ignores empty groups for reachability and keeps constraints in separate groups independent', () => {
    const q = clean()
    q.pages[1].match = 'any'
    q.pages[1].conditionGroups = [{ match: 'all', conditions: [] }]
    expect(checkQuestionnaire(q).some((issue) => issue.code === 'unreachablePage')).toBe(false)
    q.pages[1].match = 'all'
    q.pages[1].conditionGroups = [
      { match: 'all', conditions: [condition('a')] },
      { match: 'all', conditions: [condition('a', 'no')] },
    ]
    expect(checkQuestionnaire(q)).toEqual([])
  })

  it('reports noPages', () => {
    expect(checkQuestionnaire(questionnaire())).toEqual([
      { code: 'noPages', message: expect.any(String) },
    ])
    expect(questionnaireIssueCodes).toContain('noPages')
  })
})
