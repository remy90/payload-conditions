import type { Operator } from '@remy90/payload-conditions-engine'

const equivalents: Record<Operator, Operator> = {
  is: 'includes', isNot: 'excludes', includes: 'is', excludes: 'isNot',
}

/** Both spellings have identical membership semantics in the engine. */
export const normalizeOperator = <T>(value: T, allowed: readonly Operator[]): T | Operator => {
  if (allowed.some((operator) => operator === value)) return value
  const equivalent = typeof value === 'string' && Object.hasOwn(equivalents, value)
    ? equivalents[value as Operator] : undefined
  return equivalent && allowed.some((operator) => operator === equivalent) ? equivalent : value
}
