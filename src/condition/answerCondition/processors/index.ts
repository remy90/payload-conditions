import { processBooleanOptions } from './booleanProcessor'
import { processInputTextChoice } from './inputTextProcessor'
import { processMultipleChoice } from './multipleChoiceProcessor'
import type { AnswerProcessor, CMSAnswerBlockType } from './types'

export const processorLookup: Record<CMSAnswerBlockType, AnswerProcessor> = {
  booleanOptions: processBooleanOptions,
  multipleChoice: processMultipleChoice,
  inputText: processInputTextChoice,
}
