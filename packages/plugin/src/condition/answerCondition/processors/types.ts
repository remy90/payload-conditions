import type { FormState, OptionObject } from 'payload'
import type { StandardPage } from '../../../types.js'

export type CMSAnswerBlockType = NonNullable<NonNullable<NonNullable<
  StandardPage['questionAnswerPair']
>[number]['answer']>[number]['blockType']>

export type AnswerProcessor = (field: FormState, answerBlockType: string) => OptionObject[]
