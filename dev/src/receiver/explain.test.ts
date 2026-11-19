import { expect, test } from 'vitest'
import { fromPayloadQuestionnaire } from '@remy90/payload-conditions-engine/payload'
import type { Operator } from '@remy90/payload-conditions-engine'
import { trip } from '../seed-data'
import { answerLabels, explainPages } from './explain'

const questionnaire = fromPayloadQuestionnaire(trip)

test.each<[Operator, string, string, string[], string, boolean]>([
  ['equals', 'travel', 'plane', ['plane'], 'How are you travelling? is Plane', true],
  ['not_equals', 'travel', 'car', ['plane'], 'How are you travelling? is not Car', true],
  ['in', 'ages', 'under2', ['under2'], 'Which age groups? includes Under 2', true],
  ['not_in', 'ages', 'under2', ['2to11'], 'Which age groups? excludes Under 2', true],
  ['not_in', 'ages', 'under2', [], 'Which age groups? excludes Under 2', false],
])('explains %s with the engine result', (operator, questionId, answerId, values, text, pass) => {
  const document = {
    ...questionnaire,
    pages: questionnaire.pages.map((page) =>
      page.id === 'anything'
        ? {
            ...page,
            conditionGroups: [
              { match: 'all' as const, conditions: [{ questionId, operator, answerId }] },
            ],
          }
        : page,
    ),
  }
  const explanation = explainPages(document)(new Map([[questionId, values]])).at(-1)
  expect(explanation?.pass).toBe(pass)
  expect(explanation?.groups[0].conditions).toEqual([{ text, pass }])
})

test('summarizes Yes / No, choice and Free text using question labels', () => {
  expect(
    answerLabels(
      questionnaire,
      new Map([
        ['children', ['children-yes']],
        ['travel', ['plane']],
        ['seat', ['Window, please']],
      ]),
    ),
  ).toEqual([
    { id: 'children', question: 'Are you travelling with children?', value: 'Yes' },
    { id: 'travel', question: 'How are you travelling?', value: 'Plane' },
    { id: 'seat', question: 'Seat preference', value: 'Window, please' },
  ])
})
