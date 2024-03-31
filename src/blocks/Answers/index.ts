import { Block } from 'payload/types'
import { booleanOptionsBlock } from './boolean.js'
import { inputTextBlock } from './inputText.js'
import { multipleChoiceBlock } from './multipleChoice.js'

export default [booleanOptionsBlock, multipleChoiceBlock, inputTextBlock] satisfies Block[]
