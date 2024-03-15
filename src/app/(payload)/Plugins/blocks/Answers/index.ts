import { Block } from 'payload/types'
import { booleanChoiceBlock } from './booleanChoice'
import { inputTextBlock } from './inputText'
import { multipleChoiceBlock } from './multipleChoice'
// TODO:  Collapsible Selection images for each option
export default [booleanChoiceBlock, multipleChoiceBlock, inputTextBlock] satisfies Block[]
