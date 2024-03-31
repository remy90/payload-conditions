import type { FormState, OptionObject } from 'payload/types'

export interface BooleanOptions {
  booleanOptions: {
    trueOption: string
    trueId?: string | null
    falseOption: string
    falseId?: string | null
  }
  id?: string | null
  blockName?: string | null
  blockType: 'booleanOptions'
}

export interface MultipleChoice {
  multipleChoice?:
    | {
        option: string
        id?: string | null
      }[]
    | null
  id?: string | null
  blockName?: string | null
  blockType: 'multipleChoice'
}

export interface InputText {
  inputText: string
  id?: string | null
  blockName?: string | null
  blockType: 'inputText'
}

export interface StandardPage {
  skippable?: boolean | null
  questionAnswerPair?:
    | {
        question: string
        answer: (BooleanOptions | MultipleChoice | InputText)[]
        id?: string | null
      }[]
    | null
  allOrAnyCondition: 'any' | 'all'
  conditionalLogicGroup?:
    | {
        questionValue?: string | null
        operatorType: '1' | '-1' | '2' | '-2'
        answerValue?: string | null
        id?: string | null
      }[]
    | null
  id?: string | null
  blockName?: string | null
  blockType: 'standardPage'
}
export type CMSAnswerBlockType = NonNullable<
  StandardPage['questionAnswerPair']
>[number]['answer'][number]['blockType']

export type AnswerProcessor = (field: FormState, answerBlockType: string) => OptionObject[]
