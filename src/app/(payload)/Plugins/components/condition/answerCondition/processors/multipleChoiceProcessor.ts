import { numberToArray } from '@/app/(payload)/Plugins/utilities'
import { OptionObject } from 'payload/types'
import { AnswerProcessor } from './types'

export const processMultipleChoice: AnswerProcessor = (field, answerBlockType) =>
  numberToArray(
    Number(field[answerBlockType.replace('blockType', 'multipleChoice')]?.value ?? 0),
  ).map<OptionObject>((choiceNo) => ({
    label: field[answerBlockType.replace('blockType', `multipleChoice.${choiceNo}.option`)]
      ?.value as string,
    value: field[answerBlockType.replace('blockType', `multipleChoice.${choiceNo}.id`)]
      ?.value as string,
  }))
