export const operators = ['is', 'isNot', 'includes', 'excludes'] as const
export type Operator = (typeof operators)[number]
export const matchModes = ['all', 'any'] as const
export type Match = (typeof matchModes)[number]
export type Option = { id: string; label: string }
export type Answer =
  | { type: 'boolean'; trueOption: Option; falseOption: Option }
  | { type: 'multipleChoice'; allowMultipleSelection: boolean; options: Option[] }
  | { type: 'inputText'; prompt: string }
export type Question = { id: string; text: string; optional: boolean; answer: Answer }
export type Condition = { questionId: string; operator: Operator; answerId: string }
export type ConditionGroup = { match: Match; conditions: Condition[] }
export type Page = {
  id: string
  skippable: boolean
  questions: Question[]
  match: Match
  conditionGroups: ConditionGroup[]
}
export type Questionnaire = { id: string; title: string; pages: Page[] }
export type Answers = ReadonlyMap<string, readonly string[]>
export type AnswerIssue = {
  questionId: string
  issue: 'required' | 'unknownOption' | 'tooManySelections'
}

const singleOperators = ['is', 'isNot'] as const
const multipleOperators = ['includes', 'excludes'] as const
export function operatorsFor(answer: Answer): readonly Operator[] {
  if (answer.type === 'inputText') return []
  return answer.type === 'multipleChoice' && answer.allowMultipleSelection
    ? multipleOperators
    : singleOperators
}
