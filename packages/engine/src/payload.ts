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
export type StoredOption = { id?: StoredId | null; label?: string | null }
export type StoredYesNo = {
  id?: StoredId | null
  blockName?: string | null
  blockType?: 'yesNo' | null
  yesLabel?: string | null
  yesId?: StoredId | null
  noLabel?: string | null
  noId?: StoredId | null
}
export type StoredChoice = {
  id?: StoredId | null
  blockName?: string | null
  blockType?: 'choice' | null
  hasMany?: boolean | null
  options?: StoredOption[] | null
}
export type StoredText = {
  id?: StoredId | null
  blockName?: string | null
  blockType?: 'text' | null
  placeholder?: string | null
  maxLength?: number | null
}
// Payload generates interfaces for custom blocks. An any-valued index also
// accepts those interfaces, which have no index signature of their own.
export type StoredUnknownBlock = { blockType: string; [field: string]: any }
export type StoredAnswer = StoredYesNo | StoredChoice | StoredText | StoredUnknownBlock
export type StoredQuestion = {
  id?: StoredId | null
  name?: string | null
  label?: string | null
  required?: boolean | null
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
export type StoredPage = {
  id?: StoredId | null
  blockName?: string | null
  blockType?: 'page' | null
  skippable?: boolean | null
  questions?: StoredQuestion[] | null
  match?: Match | null
  conditionGroups?: StoredConditionGroup[] | null
}
export type StoredQuestionnaire = {
  id?: StoredId | null
  title?: string | null
  pages?: (StoredPage | StoredUnknownBlock)[] | null
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
    case 'yesNo': {
      const source = block as StoredYesNo
      const yesId = id(source.yesId)
      const noId = id(source.noId)
      if (yesId === undefined || noId === undefined) return undefined
      return {
        type: 'yesNo',
        yes: { id: yesId, label: source.yesLabel ?? 'Yes' },
        no: { id: noId, label: source.noLabel ?? 'No' },
      }
    }
    case 'choice': {
      const source = block as StoredChoice
      const options = []
      for (const row of source.options ?? []) {
        const optionId = id(row.id)
        if (optionId !== undefined) options.push({ id: optionId, label: row.label ?? '' })
      }
      return { type: 'choice', hasMany: source.hasMany ?? false, options }
    }
    case 'text': {
      const source = block as StoredText
      return {
        type: 'text',
        ...(source.placeholder == null ? {} : { placeholder: source.placeholder }),
        maxLength: source.maxLength ?? 2000,
      }
    }
    default:
      return undefined
  }
}

function convertQuestion(row: StoredQuestion): Question | undefined {
  const questionId = id(row.id)
  if (questionId === undefined) return undefined
  for (const block of row.answer ?? []) {
    const answer = convertAnswer(block)
    if (answer) return {
      id: questionId,
      name: row.name ?? '',
      label: row.label ?? '',
      required: row.required ?? true,
      answer,
    }
  }
  return undefined
}

function convertCondition(row: StoredCondition): Condition | undefined {
  const conditionId = id(row.id)
  if (conditionId === undefined) return undefined
  const questionId = id(row.questionId)
  const answerId = id(row.answerId)
  const operator = operators.find((operator) => operator === row.operator)
  // Empty references fail for every operator, preserving incomplete id-bearing rows.
  if (questionId === undefined || answerId === undefined || operator === undefined) {
    return { id: conditionId, questionId: '', operator: 'equals', answerId: '' }
  }
  return { id: conditionId, questionId, operator, answerId }
}

function convertPage(source: StoredPage, pageId: string): Page {
  const questions: Question[] = []
  for (const row of source.questions ?? []) {
    const question = convertQuestion(row)
    if (question) questions.push(question)
  }
  const conditionGroups = []
  for (const group of source.conditionGroups ?? []) {
    const groupId = id(group.id)
    if (groupId === undefined) continue
    const conditions: Condition[] = []
    for (const row of group.conditions ?? []) {
      const condition = convertCondition(row)
      if (condition) conditions.push(condition)
    }
    if (conditions.length) conditionGroups.push({ id: groupId, match: match(group.match), conditions })
  }
  return {
    id: pageId,
    ...(source.blockName == null ? {} : { title: source.blockName }),
    skippable: source.skippable ?? false,
    questions,
    match: match(source.match),
    conditionGroups,
  }
}

export function fromPayloadQuestionnaire(doc: StoredQuestionnaire): Questionnaire {
  const pages: Page[] = []
  for (const block of doc.pages ?? []) {
    if (block.blockType !== 'page') continue
    const source = block as StoredPage
    const pageId = id(source.id)
    if (pageId !== undefined) pages.push(convertPage(source, pageId))
  }
  return { id: id(doc.id) ?? '', title: doc.title ?? '', pages }
}
