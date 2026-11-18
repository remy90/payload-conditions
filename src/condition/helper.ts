export const selectedOptionValue = (option: unknown): string | null =>
  option && typeof option === 'object' && !Array.isArray(option) &&
    'value' in option && typeof option.value === 'string' ? option.value : null
