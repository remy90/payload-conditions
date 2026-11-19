import { operators } from '@remy90/payload-conditions-engine'
import { questions } from '../fields/questions.js'
import { matchField } from '../fields/questionAnswerCondition.js'
import type { Block } from 'payload'
import { validateConditionOperator } from '../condition/validateOperator.js'
import { validateConditionAnswer } from '../condition/validateAnswer.js'
import { textField } from '../fields/validation.js'
import { label } from '../translations/index.js'

export const QuestionnairePage: Block = {
  slug: 'page',
  interfaceName: 'QuestionnairePage',
  admin: {
    components: { Label: '@remy90/payload-conditions-plugin/client#QuestionnairePageRowLabel' },
  },
  dbName: ({ tableName }) => `${tableName}_page`,
  labels: { plural: label('pages'), singular: label('page') },
  fields: [
    { ...textField('blockName', 'pageTitle', 120), admin: { disabled: true } },
    {
      name: 'skippable',
      type: 'checkbox',
      defaultValue: false,
      label: label('skippable'),
      admin: { description: label('skippableDescription') },
    },
    questions,
    matchField('pageMatch', { all: 'allGroups', any: 'anyGroup' }),
    {
      type: 'array',
      name: 'conditionGroups',
      dbName: ({ tableName }) => `${tableName}_cg`,
      label: label('conditionGroups'),
      labels: { singular: label('conditionGroup'), plural: label('conditionGroups') },
      fields: [
        matchField('groupMatch', { all: 'allConditions', any: 'anyCondition' }),
        {
          type: 'array',
          name: 'conditions',
          dbName: ({ tableName }) => `${tableName}_cond`,
          label: label('conditions'),
          labels: { singular: label('condition'), plural: label('conditions') },
          minRows: 1,
          required: true,
          fields: [
            {
              type: 'text',
              label: label('question'),
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
              options: operators.map((value) => ({ label: label(value), value })),
              validate: validateConditionOperator,
              required: true,
            },
            {
              type: 'text',
              label: label('answer'),
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
}
