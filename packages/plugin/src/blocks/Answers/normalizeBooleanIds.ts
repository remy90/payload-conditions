import type { CollectionBeforeChangeHook } from 'payload'
import { operatorsFor, type Operator } from '@remy90/payload-conditions-engine'
import { fromPayloadQuestionnaire, type StoredQuestionnaire } from '@remy90/payload-conditions-engine/payload'
import { normalizeOperator } from '../../condition/normalizeOperator.js'

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)

const isId = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

type BooleanSite = {
  block: Record<string, unknown>
  key: 'trueId' | 'falseId'
  id: unknown
  questionId?: string
}

const booleanSites = (
  document: unknown,
  blocksField?: string,
  questions = new Map<string, readonly Operator[]>(),
  conditions: Record<string, unknown>[] = [],
): BooleanSite[] => {
  const sites: BooleanSite[] = []
  const visit = (value: unknown, questionId?: string, inScope = blocksField === undefined): void => {
    if (Array.isArray(value)) value.forEach((child) => visit(child, questionId, inScope))
    else if (isObject(value)) {
      if (inScope && Array.isArray(value.answer)) {
        questionId = isId(value.id) ? value.id : undefined
        const question = fromPayloadQuestionnaire({ pages: [{ id: '_', blockType: 'standardPage',
          questionAnswerPair: [value],
        }] } as StoredQuestionnaire).pages[0]?.questions[0]
        if (question) questions.set(question.id, operatorsFor(question.answer))
      }
      if (Array.isArray(value.conditionGroups)) {
        for (const group of value.conditionGroups) {
          if (isObject(group) && Array.isArray(group.conditions)) {
            for (const condition of group.conditions) if (isObject(condition)) conditions.push(condition)
          }
        }
      }
      if (inScope && value.blockType === 'booleanOptions') {
        const group = isObject(value.booleanOptions) ? value.booleanOptions : {}
        for (const key of ['trueId', 'falseId'] as const) {
          sites.push({ block: value, key, id: group[key], questionId })
        }
      }
      Object.entries(value).forEach(([key, child]) => visit(child, questionId, inScope || (value === document && key === blocksField)))
    }
  }
  visit(document)
  return sites
}

/** Stored question rows keep their ids; unowned duplicates use document order. */
export const normalizeBooleanIds = (
  document: unknown,
  createId: () => string,
  { originalDoc, blocksField }: { originalDoc?: unknown; blocksField?: string } = {},
): unknown => {
  const questions = new Map<string, readonly Operator[]>()
  const conditions: Record<string, unknown>[] = []
  const sites = booleanSites(document, blocksField, questions, conditions)
  const operatorRewrites = new Map<Record<string, unknown>, unknown>()
  for (const condition of conditions) {
    const allowed = typeof condition.questionId === 'string' ? questions.get(condition.questionId) : undefined
    if (!allowed) continue
    const operator = normalizeOperator(condition.operator, allowed)
    if (operator !== condition.operator) operatorRewrites.set(condition, operator)
  }
  const seen = new Set<string>()
  const validIds = sites.every(({ id }) => {
    if (!isId(id) || seen.has(id)) return false
    seen.add(id)
    return true
  })
  if (validIds && !operatorRewrites.size) return document

  const owners = new Map<string, string>()
  for (const site of validIds ? [] : booleanSites(originalDoc, blocksField)) {
    if (isId(site.id) && site.questionId && !owners.has(site.id)) owners.set(site.id, site.questionId)
  }

  const reserved = new Set(sites.flatMap(({ id }) => typeof id === 'string' ? [id] : []))
  const keepers = new Map<string, BooleanSite>()
  for (const site of sites) {
    if (!isId(site.id)) continue
    const previous = keepers.get(site.id)
    const owner = owners.get(site.id)
    if (!previous || (owner !== undefined && owner === site.questionId && owner !== previous.questionId)) {
      keepers.set(site.id, site)
    }
  }

  const replacements = new Map<Record<string, unknown>, Record<string, unknown>>()
  const conditionRewrites = new Map<string, Map<string, string>>()
  for (const site of sites) {
    if (isId(site.id) && keepers.get(site.id) === site) continue
    let replacement = createId()
    while (!isId(replacement) || reserved.has(replacement)) replacement = createId()
    reserved.add(replacement)
    const group = replacements.get(site.block) ?? (isObject(site.block.booleanOptions) ? { ...site.block.booleanOptions } : {})
    group[site.key] = replacement
    replacements.set(site.block, group)
    if (isId(site.id) && site.questionId && keepers.get(site.id)?.questionId !== site.questionId) {
      const rewrites = conditionRewrites.get(site.questionId) ?? new Map<string, string>()
      if (!rewrites.has(site.id)) rewrites.set(site.id, replacement)
      conditionRewrites.set(site.questionId, rewrites)
    }
  }

  if (!replacements.size && !operatorRewrites.size) return document

  const mapChanged = (values: unknown[], transform: (value: unknown) => unknown): unknown[] => {
    let result = values
    values.forEach((value, index) => {
      const next = transform(value)
      if (next !== value) {
        if (result === values) result = values.slice()
        result[index] = next
      }
    })
    return result
  }
  const rewriteGroups = (groups: unknown): unknown => !Array.isArray(groups) ? groups : mapChanged(groups, (group) => {
    if (!isObject(group) || !Array.isArray(group.conditions)) return group
    const conditions = mapChanged(group.conditions, (condition) => {
      if (!isObject(condition)) return condition
      const answerId = isId(condition.questionId) && isId(condition.answerId)
        ? conditionRewrites.get(condition.questionId)?.get(condition.answerId) : undefined
      const operator = operatorRewrites.get(condition)
      return answerId === undefined && operator === undefined ? condition : {
        ...condition, ...(answerId === undefined ? {} : { answerId }),
        ...(operator === undefined ? {} : { operator }),
      }
    })
    return conditions === group.conditions ? group : { ...group, conditions }
  })
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return mapChanged(value, visit)
    if (!isObject(value)) return value
    const replacement = replacements.get(value)
    let result = replacement ? { ...value, booleanOptions: replacement } : value
    for (const [key, child] of Object.entries(value)) {
      if (replacement && key === 'booleanOptions') continue
      const next = visit(key === 'conditionGroups' ? rewriteGroups(child) : child)
      if (next !== child) {
        if (result === value) result = { ...value }
        result[key] = next
      }
    }
    return result
  }
  return visit(document)
}

/** Normalize one top-level blocks field after Payload has filled omitted fields. */
export const normalizeBooleanIdsHook = (blocksField = 'pages'): CollectionBeforeChangeHook =>
  ({ data, originalDoc, req }) => {
    if (data[blocksField] === undefined) return data
    return normalizeBooleanIds(data, () => crypto.randomUUID(), {
      blocksField,
      originalDoc: req.context.isRestoringVersion ? undefined : originalDoc,
    })
  }
