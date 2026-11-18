import {
  operators,
  type Answer,
  type Condition,
  type Match,
  type Page,
  type Question,
  type Questionnaire,
} from './types.js'

export type StoredId = string | number
export type StoredOption = { id?: StoredId | null; option?: string | null }
export type StoredBooleanOptions = {
  id?: StoredId | null
  blockName?: string | null
  blockType?: 'booleanOptions' | null
  booleanOptions?: {
    trueOption?: string | null
    trueId?: StoredId | null
    falseOption?: string | null
    falseId?: StoredId | null
  } | null
}
export type StoredMultipleChoice = {
  id?: StoredId | null
  blockName?: string | null
  blockType?: 'multipleChoice' | null
  allowMultipleSelection?: boolean | null
  multipleChoice?: StoredOption[] | null
}
export type StoredInputText = {
  id?: StoredId | null
  blockName?: string | null
  blockType?: 'inputText' | null
  inputText?: string | null
}
// Payload generates interfaces for custom blocks. An any-valued index also
// accepts those interfaces, which have no index signature of their own.
export type StoredUnknownBlock = { blockType: string; [field: string]: any }
export type StoredAnswer =
  StoredBooleanOptions | StoredMultipleChoice | StoredInputText | StoredUnknownBlock
export type StoredQuestionAnswerPair = {
  id?: StoredId | null
  question?: string | null
  optional?: boolean | null
  answer?: StoredAnswer[] | null
}
export type StoredCondition = {
  id?: StoredId | null
  questionId?: StoredId | null
  operator?: string | null
  answerId?: StoredId | null
}
export type StoredConditionGroup = {
  id?: StoredId | null
  match?: Match | null
  conditions?: StoredCondition[] | null
}
export type StoredStandardPage = {
  id?: StoredId | null
  blockName?: string | null
  blockType?: 'standardPage' | null
  skippable?: boolean | null
  questionAnswerPair?: StoredQuestionAnswerPair[] | null
  match?: Match | null
  conditionGroups?: StoredConditionGroup[] | null
}
export type StoredQuestionnaire = {
  id?: StoredId | null
  title?: string | null
  pages?: (StoredStandardPage | StoredUnknownBlock)[] | null
}

function id(value: StoredId | null | undefined): string | undefined {
  return value === undefined || value === null || value === '' ? undefined : String(value)
}
function match(value: Match | null | undefined): Match {
  return value === 'any' ? 'any' : 'all'
}

function convertAnswer(block: StoredAnswer): Answer | undefined {
  // The fallback member overlaps every blockType; each branch reads the known shape.
  switch (block.blockType) {
    case 'booleanOptions': {
      const source = (block as StoredBooleanOptions).booleanOptions
      const trueId = id(source?.trueId)
      const falseId = id(source?.falseId)
      if (trueId === undefined || falseId === undefined) return undefined
      return {
        type: 'boolean',
        trueOption: { id: trueId, label: source?.trueOption ?? '' },
        falseOption: { id: falseId, label: source?.falseOption ?? '' },
      }
    }
    case 'multipleChoice': {
      const source = block as StoredMultipleChoice
      const options = []
      for (const row of source.multipleChoice ?? []) {
        const optionId = id(row.id)
        if (optionId !== undefined) options.push({ id: optionId, label: row.option ?? '' })
      }
      return {
        type: 'multipleChoice',
        allowMultipleSelection: source.allowMultipleSelection ?? false,
        options,
      }
    }
    case 'inputText':
      return { type: 'inputText', prompt: (block as StoredInputText).inputText ?? '' }
    default:
      return undefined
  }
}

function convertQuestion(row: StoredQuestionAnswerPair): Question | undefined {
  const questionId = id(row.id)
  if (questionId === undefined) return undefined
  for (const block of row.answer ?? []) {
    const answer = convertAnswer(block)
    if (answer)
      return { id: questionId, text: row.question ?? '', optional: row.optional ?? false, answer }
  }
  return undefined
}

function convertCondition(row: StoredCondition): Condition | undefined {
  if (id(row.id) === undefined) return undefined
  const questionId = id(row.questionId)
  const answerId = id(row.answerId)
  const operator = operators.find((operator) => operator === row.operator)
  // Keep incomplete id-bearing rows in the group. Empty references always fail,
  // including for negative operators, so a broken row cannot expose a page.
  if (questionId === undefined || answerId === undefined || operator === undefined) {
    return { questionId: '', operator: 'is', answerId: '' }
  }
  return { questionId, operator, answerId }
}

function convertPage(source: StoredStandardPage, pageId: string): Page {
  const questions: Question[] = []
  for (const row of source.questionAnswerPair ?? []) {
    const question = convertQuestion(row)
    if (question) questions.push(question)
  }
  const conditionGroups = []
  for (const group of source.conditionGroups ?? []) {
    if (id(group.id) === undefined) continue
    const conditions: Condition[] = []
    for (const row of group.conditions ?? []) {
      const condition = convertCondition(row)
      if (condition) conditions.push(condition)
    }
    if (conditions.length) conditionGroups.push({ match: match(group.match), conditions })
  }
  return {
    id: pageId,
    skippable: source.skippable ?? false,
    questions,
    match: match(source.match),
    conditionGroups,
  }
}

export function fromPayloadQuestionnaire(doc: StoredQuestionnaire): Questionnaire {
  const pages: Page[] = []
  for (const block of doc.pages ?? []) {
    if (block.blockType !== 'standardPage') continue
    const source = block as StoredStandardPage
    const pageId = id(source.id)
    if (pageId !== undefined) pages.push(convertPage(source, pageId))
  }
  return { id: id(doc.id) ?? '', title: doc.title ?? '', pages }
}
