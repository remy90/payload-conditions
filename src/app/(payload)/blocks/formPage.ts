import type { Block, Field, OptionObject } from 'payload/types'
import questionAnswerPair from '../Plugins/collections/questionAnswerPair'
import AnswerCondition from '../Plugins/components/condition/answerCondition'
import QuestionCondition from '../Plugins/components/condition/questionCondition'

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
const options: OptionObject[] = [
  {
    label: 'is',
    value: '1',
  },
  {
    label: 'is not',
    value: '-1',
  },
  {
    // to be used for strings
    label: 'contains',
    value: '2',
  },
]
export const StandardPage: Block = {
  slug: 'standardPage',
  fields: [
    ...pageFields,
    {
      type: 'text',
      label: 'Question condition',
      name: 'questionValue',
      admin: {
        className: 'page-content',
        components: { Field: QuestionCondition },
      },
    },
    {
      name: 'operatorType',
      type: 'select',
      admin: {
        className: 'operator',
        isClearable: false,
      },
      defaultValue: options[0].value,
      label: false,
      options,

      required: true,
    },
    {
      type: 'text',
      label: 'Answer condition',
      name: 'answerValue',
      admin: { components: { Field: AnswerCondition } },
    },
  ],
  interfaceName: 'StandardPage',
  labels: {
    plural: 'Standard pages',
    singular: 'Standard page',
  },
}
