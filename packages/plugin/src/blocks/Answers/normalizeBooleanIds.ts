import type { CollectionBeforeChangeHook } from 'payload'

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

const booleanSites = (document: unknown): BooleanSite[] => {
  const sites: BooleanSite[] = []
  const visit = (value: unknown, questionId?: string): void => {
    if (Array.isArray(value)) value.forEach((child) => visit(child, questionId))
    else if (isObject(value)) {
      if (Array.isArray(value.answer)) questionId = isId(value.id) ? value.id : undefined
      if (value.blockType === 'booleanOptions') {
        const group = isObject(value.booleanOptions) ? value.booleanOptions : {}
        for (const key of ['trueId', 'falseId'] as const) {
          sites.push({ block: value, key, id: group[key], questionId })
        }
      }
      Object.values(value).forEach((child) => visit(child, questionId))
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
  const scope = (value: unknown): unknown =>
    blocksField === undefined ? value : isObject(value) ? value[blocksField] : undefined
  const sites = booleanSites(scope(document))
  const seen = new Set<string>()
  if (sites.every(({ id }) => {
    if (!isId(id) || seen.has(id)) return false
    seen.add(id)
    return true
  })) return document

  const owners = new Map<string, string>()
  for (const site of booleanSites(scope(originalDoc))) {
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

  if (!replacements.size) return document

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
      if (!isObject(condition) || !isId(condition.questionId) || !isId(condition.answerId)) return condition
      const answerId = conditionRewrites.get(condition.questionId)?.get(condition.answerId)
      return answerId === undefined ? condition : { ...condition, answerId }
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
