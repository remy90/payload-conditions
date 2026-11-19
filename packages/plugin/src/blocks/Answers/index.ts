import type { Block } from 'payload'
import { yesNoAnswerBlock } from './yesNo.js'
import { textAnswerBlock } from './text.js'
import { choiceAnswerBlock } from './choice.js'

export default [yesNoAnswerBlock, choiceAnswerBlock, textAnswerBlock] satisfies Block[]
