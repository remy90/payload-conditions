import type { Field } from 'payload'
import { answer } from './answer.js'
import { question } from './question.js'

export const questionAnswerPair: Field = {
  name: 'questionAnswerPair',
  label: 'Question & answer pair',
  labels: { singular: 'question & answer pair', plural: 'question and answer pairs' },
  type: 'array',
  fields: [question, answer],
  admin: {
    components: {
      RowLabel: '@remy90/payload-conditions-plugin/client#QuestionAnswerRowLabel',
    },
  },
}
