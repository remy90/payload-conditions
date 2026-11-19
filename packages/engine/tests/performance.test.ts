import { expect, it } from 'vitest'
import { checkQuestionnaire, resolveVisibility } from '../src/index.js'
import { yesNoQuestion, condition, page, questionnaire } from './fixtures.js'

it('resolves and checks 200 pages × 10 questions × 5 conditions in under 50 ms', () => {
  const cold: number[] = []
  const warm: number[] = []
  const clearing: number[] = []
  const checking: number[] = []
  for (let run = 0; run < 5; run++) {
    const pages = Array.from({ length: 200 }, (_, p) =>
      page(
        `p${p}`,
        Array.from({ length: 10 }, (_, q) => {
          const id = `p${p}q${q}`
          return {
            ...yesNoQuestion(id),
            answer: {
              type: 'yesNo' as const,
              yes: { id: `${id}yes`, label: 'Yes' },
              no: { id: `${id}no`, label: 'No' },
            },
          }
        }),
        p === 0
          ? []
          : Array.from({ length: 50 }, (_, c) => {
              const id = `p${p - 1}q${c % 10}`
              return condition(id, `${id}yes`)
            }),
      ),
    )
    pages[0].conditionGroups = []
    const q = questionnaire(...pages)
    const answers = new Map<string, readonly string[]>(
      pages.flatMap((p) =>
        p.questions.map((question) => [question.id, [`${question.id}yes`]] as const),
      ),
    )
    let start = performance.now()
    const initial = resolveVisibility(q, answers)
    cold.push(performance.now() - start)
    expect(initial.visiblePageIds.size).toBe(200)
    expect(initial.answers).toBe(answers)
    start = performance.now()
    resolveVisibility(q, answers)
    warm.push(performance.now() - start)
    const changed = new Map(answers)
    changed.set('p0q0', ['no'])
    start = performance.now()
    const hidden = resolveVisibility(q, changed)
    clearing.push(performance.now() - start)
    expect([...hidden.visiblePageIds]).toEqual(['p0'])
    expect(hidden.answers.size).toBe(10)
    start = performance.now()
    const issues = checkQuestionnaire(q)
    checking.push(performance.now() - start)
    expect(issues).toEqual([])
  }
  // Fresh questionnaire identities include index construction in each cold run.
  // Best of five avoids unrelated scheduler pauses on shared CI machines.
  expect(Math.min(...cold)).toBeLessThan(25)
  expect(Math.min(...warm)).toBeLessThan(25)
  expect(Math.min(...clearing)).toBeLessThan(25)
  expect(Math.min(...checking)).toBeLessThan(50)
  console.info('visibility timing (ms)', {
    cold: Math.min(...cold),
    warm: Math.min(...warm),
    clearing: Math.min(...clearing),
    checking: Math.min(...checking),
  })
})
