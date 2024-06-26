import type {  } from 'payload/types'

export const numberToArray: (numberOfIndices: number) => number[] = (numberOfIndices: number) => [
  ...Array(numberOfIndices).keys(),
]

export function filterKeysByPattern({
  obj,
  pattern,
}: {
  obj: any /* FormState */
  pattern: RegExp
}): any /* FormState */ {
  return Object.keys(obj).reduce((acc: any /* FormState */, key: string) => {
    if (pattern.test(key)) {
      acc[key] = obj[key]
    }
    return acc
  }, {})
}
