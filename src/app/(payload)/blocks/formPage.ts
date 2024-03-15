import type { Block, BlockField, Field } from 'payload/types'
import questionAnswerPair from '../Plugins/collections/questionAnswerPair'
import QuestionCondition from '../Plugins/components/condition/questionCondition'
import { question } from './question'

const ContentBlockField: BlockField = {
  name: 'contentBlock', // page type
  type: 'blocks',
  blocks: [question],
  label: 'Content',
  labels: {
    plural: 'Content',
    singular: 'content',
  },
  required: true,
}

export const pageFields: Field[] = [
  {
    name: 'skippable',
    type: 'checkbox',
    defaultValue: false,
    hidden: false,
    label: 'Page is skippable',
  },
  ...questionAnswerPair.fields,
]

export const StandardPage: Block = {
  slug: 'standardPage',
  fields: [
    // blockFields({
    // name: 'content',
    // fields: [
    ...pageFields,
    {
      type: 'text',
      label: 'Question Condition',
      name: 'questionValue',
      admin: {
        className: 'page-content',
        components: { Field: QuestionCondition },
      },
      // fields: [ContentBlockField, ...prerequisiteGroups],
      // fields: [ContentBlockField],
    },
  ],
  interfaceName: 'StandardPage',
  labels: {
    plural: 'Standard pages',
    singular: 'Standard page',
  },
}
