export const selectedOptionValue = (option: unknown): string | null =>
  option && typeof option === 'object' && !Array.isArray(option) &&
    'value' in option && typeof option.value === 'string' ? option.value : null

export const questionRowLabel = (question: unknown, rowNumber?: number): string =>
  typeof question === 'string' && question
    ? question.length > 20 ? question.substring(0, 20) + '...' : question
    : `Question ${(rowNumber ?? 0) + 1}`

export const questionChangeActions = (
  path: string,
  current: string | null | undefined,
  next: string | null,
): { type: 'UPDATE'; path: string; value: null }[] =>
  next === (current ?? null) ? [] : [
    { type: 'UPDATE', path: path.replace(/questionValue$/, 'answerValue'), value: null },
  ]
