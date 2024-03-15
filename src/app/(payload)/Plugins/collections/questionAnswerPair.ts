import type { CollectionConfig } from 'payload/types'
import allAnswers from '../blocks/Answers'

const questionAnswerPair: CollectionConfig = {
  slug: 'question-answer-pair',
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'questionAnswerPair',
      label: 'Question and answer pair',
      labels: { singular: 'Question and answer pair', plural: 'Question and answer pairs' },
      type: 'array',
      fields: [
        {
          name: 'question',
          label: 'Question',
          type: 'text',
          required: true,
          admin: {
            description: 'This can be a question or input prompt',
          },
        },
        {
          name: 'answer',
          label: 'Answer type',
          labels: { singular: 'Answer type', plural: 'Answer types' },
          type: 'blocks',
          required: true,
          minRows: 1,
          maxRows: 1,
          blocks: allAnswers,
        },
      ],
    },
  ],
}

export default questionAnswerPair
