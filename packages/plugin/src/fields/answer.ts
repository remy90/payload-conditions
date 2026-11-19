import type { Field } from 'payload'
import allAnswers from '../blocks/Answers/index.js'
import { label } from '../translations/index.js'

export const answer: Field = {
  name: 'answer',
  label: label('answerType'),
  labels: { singular: label('answerType'), plural: label('answerTypes') },
  type: 'blocks',
  required: true,
  minRows: 1,
  maxRows: 1,
  blocks: allAnswers,
}
