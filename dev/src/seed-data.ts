import type { Questionnaire, QuestionnairePage } from './payload-types'
import type { Operator } from '@remy90/payload-conditions-engine'

type StoredQuestion = NonNullable<QuestionnairePage['questions']>[number]
type StoredConditionGroup = NonNullable<QuestionnairePage['conditionGroups']>[number]

const name = (id: string) => id.replaceAll('-', '_')
const bool = (id: string, label: string): StoredQuestion => ({
  id,
  name: name(id),
  label,
  required: true,
  answer: [{
    id: `${id}-answer`,
    blockType: 'yesNo',
    yesId: `${id}-yes`,
    yesLabel: 'Yes',
    noId: `${id}-no`,
    noLabel: 'No',
  }],
})
const choice = (
  id: string,
  label: string,
  options: [string, string][],
  hasMany = false,
): StoredQuestion => ({
  id,
  name: name(id),
  label,
  required: true,
  answer: [{
    id: `${id}-answer`,
    blockType: 'choice',
    hasMany,
    options: options.map(([id, label]) => ({ id, label })),
  }],
})
const text = (id: string, label: string): StoredQuestion => ({
  id,
  name: name(id),
  label,
  required: false,
  answer: [{
    id: `${id}-answer`,
    blockType: 'text',
    placeholder: 'Type your answer…',
    maxLength: 500,
  }],
})
const group = (
  id: string,
  conditions: [string, Operator, string][],
  match: 'all' | 'any' = 'all',
): StoredConditionGroup => ({
  id,
  match,
  conditions: conditions.map(([questionId, operator, answerId], index) => ({
    id: `${id}-${index}`,
    questionId,
    operator,
    answerId,
  })),
})
const page = (
  id: string,
  blockName: string,
  questions: StoredQuestion[],
  conditionGroups: StoredConditionGroup[] = [],
  skippable = false,
): QuestionnairePage => ({
  id,
  blockName,
  blockType: 'page',
  questions,
  conditionGroups,
  match: 'all',
  skippable,
})

export const trip: Pick<Questionnaire, 'title' | 'pages'> = {
  title: 'Plan a trip',
  pages: [
    page('about', 'About you', [
      bool('children', 'Are you travelling with children?'),
      choice('travel', 'How are you travelling?', [
        ['car', 'Car'],
        ['train', 'Train'],
        ['plane', 'Plane'],
      ]),
    ]),
    page(
      'children-page',
      'Children',
      [choice('ages', 'Which age groups?', [
        ['under2', 'Under 2'],
        ['2to11', '2 to 11'],
        ['12to17', '12 to 17'],
      ], true)],
      [group('children-group', [['children', 'equals', 'children-yes']])],
    ),
    page(
      'flight',
      'Flight',
      [bool('baggage', 'Do you need extra baggage?'), text('seat', 'Seat preference')],
      [group('flight-group', [['travel', 'equals', 'plane']])],
    ),
    page(
      'car-seats',
      'Car seats',
      [bool('seat-help', 'Would you like help arranging a car seat?')],
      [
        group('seats-children', [['children', 'equals', 'children-yes']]),
        group('seats-route', [
          ['travel', 'equals', 'car'],
          ['ages', 'in', 'under2'],
        ], 'any'),
      ],
    ),
    page(
      'accessibility',
      'Accessibility',
      [bool('assistance', 'Do you need assistance at the station or airport?')],
      [group('access-group', [['travel', 'not_equals', 'car']])],
      true,
    ),
    page('anything', 'Anything else?', [
      text(
        'notes',
        'Is there anything else we should know about your travel plans, preferred activities, dietary needs or special requests for this trip?',
      ),
    ]),
  ],
}
