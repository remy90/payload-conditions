import type { Field } from 'payload'
import { answer } from './answer.js'
import { question } from './question.js'

export const questionAnswerPair: Field = {
  name: 'questionAnswerPair',
  dbName: ({ tableName }) => `${tableName}_qa`,
  label: 'Questions',
  labels: { singular: 'Question', plural: 'Questions' },
  type: 'array',
  fields: [
    question,
    {
      name: 'optional',
      type: 'checkbox',
      defaultValue: false,
      label: 'Optional',
      admin: { description: 'Respondents can leave this question unanswered' },
    },
    answer,
  ],
  admin: {
    components: {
      RowLabel: '@remy90/payload-conditions-plugin/client#QuestionAnswerRowLabel',
    },
  },
}
