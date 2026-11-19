import type { Operator } from '@remy90/payload-conditions-engine'

const equivalents: Record<Operator, Operator> = {
  equals: 'in',
  not_equals: 'not_in',
  in: 'equals',
  not_in: 'not_equals',
}

/** Equivalent operators preserve membership semantics when selection settings change. */
export const normalizeOperator = <T>(value: T, allowed: readonly Operator[]): T | Operator => {
  if (allowed.some((operator) => operator === value)) return value
  const equivalent =
    typeof value === 'string' && Object.hasOwn(equivalents, value)
      ? equivalents[value as Operator]
      : undefined
  return equivalent && allowed.some((operator) => operator === equivalent) ? equivalent : value
}
