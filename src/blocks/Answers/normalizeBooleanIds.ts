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
  { originalDoc }: { originalDoc?: unknown } = {},
): unknown => {
  const owners = new Map<string, string>()
  for (const site of booleanSites(originalDoc)) {
    if (isId(site.id) && site.questionId && !owners.has(site.id)) owners.set(site.id, site.questionId)
  }

  const sites = booleanSites(document)
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
  for (const site of sites) {
    if (isId(site.id) && keepers.get(site.id) === site) continue
    let replacement = createId()
    while (!isId(replacement) || reserved.has(replacement)) replacement = createId()
    reserved.add(replacement)
    const group = replacements.get(site.block) ?? (isObject(site.block.booleanOptions) ? { ...site.block.booleanOptions } : {})
    group[site.key] = replacement
    replacements.set(site.block, group)
  }

  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit)
    if (!isObject(value)) return value
    const result = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visit(child)]))
    if (replacements.has(value)) result.booleanOptions = replacements.get(value)
    return result
  }
  return visit(document)
}

/** Normalize one top-level blocks field after Payload has filled omitted fields. */
export const normalizeBooleanIdsHook = (blocksField = 'pages'): CollectionBeforeChangeHook =>
  ({ data, originalDoc, req }) => {
    if (data[blocksField] === undefined) return data
    return { ...data, [blocksField]: normalizeBooleanIds(data[blocksField], () => crypto.randomUUID(), {
      originalDoc: req.context.isRestoringVersion ? undefined : originalDoc?.[blocksField],
    }) }
  }
