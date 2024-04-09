import { answer } from '@/fields/answer.js'
import { question } from '@/fields/question.js'
import type { CollectionConfig } from 'payload/types'
import type {} from '@payloadcms/ui/forms/Form'

const questionAnswerPair: CollectionConfig = {
  slug: 'question-answer-pair',
  admin: {
    useAsTitle: 'title',
    description:
      'Select whether all or any of the filter group conditions should be true to show this page.',
  },
  fields: [
    {
      name: 'questionAnswerPair',
      label: 'Question & answer pair',
      labels: { singular: 'question & answer pair', plural: 'question and answer pairs' },
      type: 'array',
      fields: [question, answer],
      admin: {
        components: {
          
          RowLabel: (rowLabelArgs: any /*RowLabelArgs*/) => {
            const { data, index } = rowLabelArgs

            const question: string = data?.question

            return question.length > 20 ? question.substring(0, 20) + '...' : question
          },
        },
      },
    },
  ],
}

export default questionAnswerPair
