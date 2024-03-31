import { answer } from '@/fields/answer'
import { question } from '@/fields/question'
import type { CollectionConfig } from 'payload/types'

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
    },
  ],
}

export default questionAnswerPair
