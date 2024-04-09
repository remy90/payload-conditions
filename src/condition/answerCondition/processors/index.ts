import { processBooleanOptions } from './booleanProcessor.js'
import { processInputTextChoice } from './inputTextProcessor.js'
import { processMultipleChoice } from './multipleChoiceProcessor.js'
import type { AnswerProcessor, CMSAnswerBlockType } from './types.js'

export const processorLookup: Record<CMSAnswerBlockType, AnswerProcessor> = {
  booleanOptions: processBooleanOptions,
  multipleChoice: processMultipleChoice,
  inputText: processInputTextChoice,
}
