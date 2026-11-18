import type { OptionObject } from 'payload'
import type { AnswerProcessor } from './types.js'

export const processInputTextChoice: AnswerProcessor = (field, answerBlockType) => [
  {
    label: field[answerBlockType.replace('blockType', `inputText`)]?.value as string,
    value: field[answerBlockType.replace('blockType', `id`)]?.value as string,
  } satisfies OptionObject,
]
