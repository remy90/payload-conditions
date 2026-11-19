import { trip } from './seed-data'

// Drafts for repeating the publish checks in the admin.
export function validationFixtures() {
  const blank = structuredClone(trip)
  blank.title = 'Check whitespace'
  blank.pages[0].questions[0].label = '   '

  const duplicate = structuredClone(trip)
  duplicate.title = 'Check duplicate option'
  const choice = duplicate.pages[0].questions[1].answer[0]
  if (choice.blockType === 'choice') choice.options[1].label = choice.options[0].label

  const empty = structuredClone(trip)
  empty.title = 'Check empty group'
  empty.pages[1].conditionGroups![0].conditions = []

  const contradiction = structuredClone(trip)
  contradiction.title = 'Check contradiction'
  contradiction.pages[1].conditionGroups![0].conditions.push({
    id: 'conflicting-condition',
    questionId: 'children',
    operator: 'equals',
    answerId: 'children-no',
  })

  const unreachable = structuredClone(contradiction)
  unreachable.title = 'Check unreachable'
  unreachable.pages[2].conditionGroups = [
    {
      id: 'blocked-source-group',
      match: 'all',
      conditions: [
        {
          id: 'blocked-source-condition',
          questionId: 'ages',
          operator: 'in',
          answerId: 'under2',
        },
      ],
    },
  ]

  const longTitle = structuredClone(trip)
  longTitle.title = 'Check page title'
  longTitle.pages[0].blockName = 'A'.repeat(121)

  const name = structuredClone(trip)
  name.title = 'Check name'
  name.pages[0].questions[0].label = 'Your favourite destination?'
  name.pages[0].questions[0].name = ''

  return [blank, duplicate, empty, contradiction, unreachable, longTitle, name].map(
    (fixture, index) => {
      // SQLite row ids are unique across documents, including draft copies.
      const prefixIds = (value: unknown) => {
        if (!value || typeof value !== 'object') return
        for (const [key, child] of Object.entries(value)) {
          if (
            ['id', 'yesId', 'noId', 'questionId', 'answerId'].includes(key) &&
            typeof child === 'string'
          ) {
            Object.assign(value, { [key]: `check${index}-${child}` })
          } else prefixIds(child)
        }
      }
      prefixIds(fixture)
      return fixture
    },
  )
}
