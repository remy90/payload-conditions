import { Block } from 'payload/types'
import { booleanOptionsBlock } from './boolean'
import { inputTextBlock } from './inputText'
import { multipleChoiceBlock } from './multipleChoice'
// TODO:  Collapsible Selection images for each option
export default [booleanOptionsBlock, multipleChoiceBlock, inputTextBlock] satisfies Block[]
