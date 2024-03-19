import { OptionObject } from 'payload/types'
import { AnswerProcessor } from './types'

export const processBooleanOptions: AnswerProcessor = (fields, answerBlockType) => {
  const booleanPaths = [
    answerBlockType.replace('blockType', 'booleanOptions.trueOption'),
    answerBlockType.replace('blockType', 'booleanOptions.falseOption'),
  ]

  return booleanPaths.map<OptionObject>((label) => ({
    label: fields[label]?.value as string,
    value: fields[label.replace('eOption', 'eId')]?.value as string,
  }))
}
