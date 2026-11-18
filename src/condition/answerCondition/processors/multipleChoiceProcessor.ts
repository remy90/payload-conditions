import type { AnswerProcessor } from './types.js'
import { rowCount } from '../../formState.js'

export const processMultipleChoice: AnswerProcessor = (fields, blockTypePath) => {
  const path = blockTypePath.replace(/blockType$/, 'multipleChoice')
  return Array.from({ length: rowCount(fields, path) }, (_, index) => ({
    label: fields[`${path}.${index}.option`]?.value as string,
    value: fields[`${path}.${index}.id`]?.value as string,
  }))
}
