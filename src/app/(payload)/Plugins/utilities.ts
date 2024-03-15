export const numberToArray: (numberOfIndices: number) => number[] = (numberOfIndices: number) => [
  ...Array(numberOfIndices).keys(),
]
