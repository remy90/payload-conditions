import type { Questionnaire, StandardPage } from './payload-types'

type StoredQuestionAnswerPair = NonNullable<StandardPage['questionAnswerPair']>[number]
type StoredConditionGroup = NonNullable<StandardPage['conditionGroups']>[number]

const bool = (id: string, question: string): StoredQuestionAnswerPair => ({
  id,
  question,
  answer: [
    {
      id: `${id}-answer`,
      blockType: 'booleanOptions',
      booleanOptions: {
        trueId: `${id}-yes`,
        trueOption: 'Yes',
        falseId: `${id}-no`,
        falseOption: 'No',
      },
    },
  ],
})
const choice = (
  id: string,
  question: string,
  options: [string, string][],
  multiple = false,
): StoredQuestionAnswerPair => ({
  id,
  question,
  answer: [
    {
      id: `${id}-answer`,
      blockType: 'multipleChoice',
      allowMultipleSelection: multiple,
      multipleChoice: options.map(([id, option]) => ({ id, option })),
    },
  ],
})
const text = (id: string, question: string): StoredQuestionAnswerPair => ({
  id,
  question,
  optional: true,
  answer: [{ id: `${id}-answer`, blockType: 'inputText', inputText: 'Type your answer…' }],
})
const group = (
  id: string,
  conditions: [string, 'is' | 'isNot' | 'includes', string][],
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
  questionAnswerPair: StoredQuestionAnswerPair[],
  conditionGroups: StoredConditionGroup[] = [],
  skippable = false,
): StandardPage => ({
  id,
  blockName,
  blockType: 'standardPage',
  questionAnswerPair,
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
      [
        choice(
          'ages',
          'Which age groups?',
          [
            ['under2', 'Under 2'],
            ['2to11', '2 to 11'],
            ['12to17', '12 to 17'],
          ],
          true,
        ),
      ],
      [group('children-group', [['children', 'is', 'children-yes']])],
    ),
    page(
      'flight',
      'Flight',
      [bool('baggage', 'Do you need extra baggage?'), text('seat', 'Seat preference')],
      [group('flight-group', [['travel', 'is', 'plane']])],
    ),
    page(
      'car-seats',
      'Car seats',
      [bool('seat-help', 'Would you like help arranging a car seat?')],
      [
        group('seats-children', [['children', 'is', 'children-yes']]),
        group(
          'seats-route',
          [
            ['travel', 'is', 'car'],
            ['ages', 'includes', 'under2'],
          ],
          'any',
        ),
      ],
    ),
    page(
      'accessibility',
      'Accessibility',
      [bool('assistance', 'Do you need assistance at the station or airport?')],
      [group('access-group', [['travel', 'isNot', 'car']])],
      true,
    ),
    page('anything', 'Anything else?', [text('notes', 'Anything else we should know?')]),
  ],
}
