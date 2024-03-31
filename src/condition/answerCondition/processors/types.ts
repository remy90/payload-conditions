import type { StandardPage } from '@/payload-types'
import type { FormState, OptionObject } from 'payload/types'

export type CMSAnswerBlockType = NonNullable<
  StandardPage['questionAnswerPair']
>[number]['answer'][number]['blockType']

export type AnswerProcessor = (field: FormState, answerBlockType: string) => OptionObject[]
