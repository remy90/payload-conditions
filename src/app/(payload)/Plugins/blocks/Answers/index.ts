import { Block } from 'payload/types'
import { booleanOptionsBlock } from './boolean'
import { inputTextBlock } from './inputText'
import { multipleChoiceBlock } from './multipleChoice'

export default [booleanOptionsBlock, multipleChoiceBlock, inputTextBlock] satisfies Block[]
