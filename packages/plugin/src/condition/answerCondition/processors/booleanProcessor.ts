import type { OptionObject } from 'payload'
import type { AnswerProcessor } from './types.js'

export const processBooleanOptions: AnswerProcessor = (fields, answerBlockType) => {
  const booleanPaths = [
    answerBlockType.replace(/blockType$/, 'booleanOptions.trueOption'),
    answerBlockType.replace(/blockType$/, 'booleanOptions.falseOption'),
  ]

  return booleanPaths.map<OptionObject>((label) => ({
    label: fields[label]?.value as string,
    value: fields[label.replace(/Option$/, 'Id')]?.value as string,
  }))
}
