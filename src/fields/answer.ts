import type { Field } from 'payload/types'
import allAnswers from '@/blocks/Answers/index.js'

export const answer: Field = {
  name: 'answer',
  label: 'Answer type',
  labels: { singular: 'Answer type', plural: 'Answer types' },
  type: 'blocks',
  required: true,
  minRows: 1,
  maxRows: 1,
  blocks: allAnswers,
}
