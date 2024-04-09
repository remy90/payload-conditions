import { OptionObject } from 'payload/types'
import { AnswerProcessor } from './types.js'
import { numberToArray } from '@/utilities.js'

export const processMultipleChoice: AnswerProcessor = (field, answerBlockType) =>
  numberToArray(
    Number(field[answerBlockType.replace('blockType', 'multipleChoice')]?.value ?? 0),
  ).map<OptionObject>((choiceNo) => ({
    label: field[answerBlockType.replace('blockType', `multipleChoice.${choiceNo}.option`)]
      ?.value as string,
    value: field[answerBlockType.replace('blockType', `multipleChoice.${choiceNo}.id`)]
      ?.value as string,
  }))
