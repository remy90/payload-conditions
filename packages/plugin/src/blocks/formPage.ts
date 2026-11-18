import { operators, type Operator } from '@remy90/payload-conditions-engine'
import { questionAnswerPair } from '../fields/questionAnswerPair.js'
import { match } from '../fields/questionAnswerCondition.js'
import type { Block, Field } from 'payload'
import { validateConditionOperator } from '../condition/validateOperator.js'

export const pageFields: Field[] = [
  {
    name: 'skippable',
    type: 'checkbox',
    defaultValue: false,
    hidden: false,
    label: 'Page is skippable',
  },
  questionAnswerPair,
]

const operatorLabels: Record<Operator, string> = {
  is: 'is', isNot: 'is not', includes: 'includes', excludes: 'excludes',
}

export const StandardPage: Block = {
  slug: 'standardPage',
  fields: [
    ...pageFields,
    match,
    {
      type: 'array',
      name: 'conditionGroups',
      label: 'Condition groups',
      fields: [
        match,
        {
          type: 'array',
          name: 'conditions',
          fields: [
            {
              type: 'text',
              label: 'Question condition',
              name: 'questionId',
              required: true,
              admin: {
                className: 'page-content',
                components: { Field: '@remy90/payload-conditions-plugin/client#QuestionCondition' },
              },
            },
            {
              name: 'operator',
              type: 'select',
              admin: {
                className: 'operator',
                components: { Field: '@remy90/payload-conditions-plugin/client#OperatorCondition' },
              },
              label: false,
              options: operators.map((value) => ({ label: operatorLabels[value], value })),
              validate: validateConditionOperator,
              required: true,
            },
            {
              type: 'text',
              label: 'Answer condition',
              name: 'answerId',
              required: true,
              admin: { components: { Field: '@remy90/payload-conditions-plugin/client#AnswerCondition' } },
            },
          ],
        },
      ],
    },
  ],
  interfaceName: 'StandardPage',
  labels: { plural: 'Standard pages', singular: 'Standard page' },
}
