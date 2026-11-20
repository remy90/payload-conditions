export const operators = ['equals', 'not_equals', 'in', 'not_in'] as const
export type Operator = (typeof operators)[number]
export const matchModes = ['all', 'any'] as const
export type Match = (typeof matchModes)[number]
export type Option = { id: string; label: string }
export type Answer =
  | { type: 'yesNo'; yes: Option; no: Option }
  | { type: 'choice'; hasMany: boolean; options: Option[] }
  | { type: 'text'; placeholder?: string; maxLength: number }
export type Question = {
  id: string
  name: string
  label: string
  required: boolean
  answer: Answer
}
export type Condition = { id?: string; questionId: string; operator: Operator; answerId: string }
export type ConditionGroup = { id?: string; match: Match; conditions: Condition[] }
export type Page = {
  id: string
  title?: string
  skippable: boolean
  questions: Question[]
  match: Match
  conditionGroups: ConditionGroup[]
}
export type Questionnaire = { id: string; title: string; pages: Page[] }
export type Answers = ReadonlyMap<string, readonly string[]>
export type AnswerIssue = {
  questionId: string
  pageId?: string
  issue:
    | 'required'
    | 'unknownOption'
    | 'tooManySelections'
    | 'tooLong'
    | 'unknownQuestion'
    | 'hiddenQuestion'
}

export const questionnaireIssueCodes = [
  'noPages',
  'emptyPage',
  'emptyGroup',
  'duplicateId',
  'duplicateName',
  'invalidName',
  'blankText',
  'duplicateOptionLabel',
  'unknownQuestion',
  'samePageQuestion',
  'laterQuestion',
  'unsupportedSource',
  'unknownAnswer',
  'operatorMismatch',
  'contradiction',
  'unreachablePage',
] as const
export type QuestionnaireIssueCode = (typeof questionnaireIssueCodes)[number]
export type QuestionnaireIssue = {
  code: QuestionnaireIssueCode
  message: string
  pageId?: string
  questionId?: string
  optionId?: string
  groupId?: string
  conditionId?: string
}

const singleOperators = ['equals', 'not_equals'] as const
const multipleOperators = ['in', 'not_in'] as const
export function operatorsFor(answer: Answer): readonly Operator[] {
  if (answer.type !== 'yesNo' && answer.type !== 'choice') return []
  return answer.type === 'choice' && answer.hasMany ? multipleOperators : singleOperators
}
