import type { CollectionBeforeChangeHook } from 'payload'

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)

/** Walk in document order; each boolean answer claims trueId before falseId. */
export const normalizeBooleanIds = (document: unknown, createId: () => string): unknown => {
  const seen = new Set<string>()
  const reserved = new Set<string>()
  const reserve = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(reserve)
    else if (isObject(value)) {
      if (value.blockType === 'booleanOptions' && isObject(value.booleanOptions)) {
        for (const key of ['trueId', 'falseId']) {
          const id = value.booleanOptions[key]
          if (typeof id === 'string') reserved.add(id)
        }
      }
      Object.values(value).forEach(reserve)
    }
  }
  reserve(document)
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit)
    if (!isObject(value)) return value
    const result = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visit(child)]))
    if (value.blockType === 'booleanOptions') {
      const group = isObject(value.booleanOptions) ? value.booleanOptions : {}
      const options = { ...group }
      for (const key of ['trueId', 'falseId']) {
        const id = group[key]
        if (typeof id === 'string' && id.trim() && !seen.has(id)) {
          seen.add(id)
        } else {
          let replacement = createId()
          while (!replacement.trim() || reserved.has(replacement)) replacement = createId()
          options[key] = replacement
          reserved.add(replacement)
          seen.add(replacement)
        }
      }
      result.booleanOptions = options
    }
    return result
  }
  return visit(document)
}

/** Normalize one top-level blocks field after Payload has filled omitted fields. */
export const normalizeBooleanIdsHook = (blocksField = 'pages'): CollectionBeforeChangeHook =>
  ({ data }) => {
    if (data[blocksField] === undefined) return data
    return { ...data, [blocksField]: normalizeBooleanIds(data[blocksField], () => crypto.randomUUID()) }
  }
