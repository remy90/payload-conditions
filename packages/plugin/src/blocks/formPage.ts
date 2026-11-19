import { operators, type Operator } from '@remy90/payload-conditions-engine'
import { questionAnswerPair } from '../fields/questionAnswerPair.js'
import { matchField } from '../fields/questionAnswerCondition.js'
import type { Block, Field } from 'payload'
import { validateConditionOperator } from '../condition/validateOperator.js'
import { validateConditionAnswer } from '../condition/validateAnswer.js'

export const pageFields: Field[] = [
  {
    name: 'skippable',
    type: 'checkbox',
    defaultValue: false,
    hidden: false,
    label: 'Page is skippable',
    admin: { description: 'Respondents can skip every question on this page' },
  },
  questionAnswerPair,
]

const operatorLabels: Record<Operator, string> = {
  is: 'is',
  isNot: 'is not',
  includes: 'includes',
  excludes: 'excludes',
}

export const StandardPage: Block = {
  slug: 'standardPage',
  admin: {
    components: { Label: '@remy90/payload-conditions-plugin/client#StandardPageRowLabel' },
  },
  dbName: ({ tableName }) => `${tableName}_page`,
  fields: [
    ...pageFields,
    matchField('Show this page when', { all: 'All groups match', any: 'Any group matches' }),
    {
      type: 'array',
      name: 'conditionGroups',
      dbName: ({ tableName }) => `${tableName}_cg`,
      label: 'Condition groups',
      fields: [
        matchField('This group matches when', {
          all: 'All conditions are true',
          any: 'Any condition is true',
        }),
        {
          type: 'array',
          name: 'conditions',
          dbName: ({ tableName }) => `${tableName}_cond`,
          fields: [
            {
              type: 'text',
              label: 'Question',
              name: 'questionId',
              required: true,
              admin: {
                className: 'page-content',
                components: { Field: '@remy90/payload-conditions-plugin/client#QuestionCondition' },
              },
            },
            {
              name: 'operator',
              enumName: ({ tableName }) => `e_${tableName}_op`,
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
              label: 'Answer',
              name: 'answerId',
              required: true,
              validate: validateConditionAnswer,
              admin: {
                components: { Field: '@remy90/payload-conditions-plugin/client#AnswerCondition' },
              },
            },
          ],
        },
      ],
    },
  ],
  interfaceName: 'StandardPage',
  labels: { plural: 'Pages', singular: 'Page' },
}
