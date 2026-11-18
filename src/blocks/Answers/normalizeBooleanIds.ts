import type { FieldHook } from 'payload'

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

// Match Payload's fallback for omitted fields, including rows moved within arrays.
const withStoredValues = (incoming: unknown, stored: unknown): unknown => {
  if (incoming === undefined) return stored
  if (Array.isArray(incoming)) {
    return incoming.map((row) => withStoredValues(row,
      isObject(row) && row.id != null && Array.isArray(stored)
        ? stored.find((old) => isObject(old) && old.id === row.id) : undefined))
  }
  if (isObject(incoming) && isObject(stored)) {
    return Object.fromEntries([...new Set([...Object.keys(stored), ...Object.keys(incoming)])]
      .map((key) => [key, withStoredValues(incoming[key], stored[key])]))
  }
  return incoming
}

const atPath = (value: unknown, path: (string | number)[]): unknown =>
  path.reduce<unknown>((parent, key) =>
    Array.isArray(parent) ? parent[Number(key)] : isObject(parent) ? parent[key] : undefined, value)

type PageHookArgs = Pick<Parameters<FieldHook>[0], 'data' | 'originalDoc' | 'path' | 'value'>

/** Return only this page's rows; Payload traverses sibling pages concurrently. */
export const normalizePageBooleanIds = ({ data, originalDoc, path, value }: PageHookArgs): unknown =>
  atPath(normalizeBooleanIds(withStoredValues(data, originalDoc), () => crypto.randomUUID()), path) ?? value
