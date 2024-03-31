import questionAnswerPair from '@/collections/questionAnswerPair'
import AnswerCondition from '@/condition/answerCondition'
import QuestionCondition from '@/condition/questionCondition'
import { allOrAnyCondition } from '@/fields/questionAnswerCondition'
import type { Block, Field, OptionObject } from 'payload/types'

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
    label: 'contains',
    value: '2',
  },
  {
    label: 'excludes',
    value: '-2',
  },
]

export const StandardPage: Block = {
  slug: 'standardPage',
  fields: [
    ...pageFields,
    allOrAnyCondition,
    {
      type: 'array',
      name: 'conditionalLogicGroup',
      label: 'Conditional logic group',
      labels: { singular: 'conditional logic group', plural: 'conditional logic groups' },
      fields: [
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
    },
  ],
  interfaceName: 'StandardPage',
  labels: {
    plural: 'Standard pages',
    singular: 'Standard page',
  },
}
