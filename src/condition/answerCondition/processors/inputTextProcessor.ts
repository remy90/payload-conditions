import type { OptionObject } from 'payload/types'
import type { AnswerProcessor } from './types'

export const processInputTextChoice: AnswerProcessor = (field, answerBlockType) => [
  {
    label: field[answerBlockType.replace('blockType', `inputText`)]?.value as string,
    value: field[answerBlockType.replace('blockType', `id`)]?.value as string,
  } satisfies OptionObject,
]
