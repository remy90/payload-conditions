import { Block } from 'payload/types'
import { booleanOptionsBlock } from './booleanChoice'
import { inputTextBlock } from './inputText'
import { multipleChoiceBlock } from './multipleChoice'
// TODO:  Collapsible Selection images for each option
export default [booleanOptionsBlock, multipleChoiceBlock, inputTextBlock] satisfies Block[]
