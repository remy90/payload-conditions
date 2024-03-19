import type { FormState } from 'payload/types'

export const numberToArray: (numberOfIndices: number) => number[] = (numberOfIndices: number) => [
  ...Array(numberOfIndices).keys(),
]

export function filterKeysByPattern({
  obj,
  pattern,
}: {
  obj: FormState
  pattern: RegExp
}): FormState {
  return Object.keys(obj).reduce((acc: FormState, key: string) => {
    if (pattern.test(key)) {
      acc[key] = obj[key]
    }
    return acc
  }, {})
}
