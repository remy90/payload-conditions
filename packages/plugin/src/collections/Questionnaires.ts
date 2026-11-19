import type { CollectionConfig } from 'payload'
import { QuestionnairePage } from '../blocks/questionnairePage.js'
import { questionnaireBeforeChange } from '../hooks/questionnaireBeforeChange.js'
import { fillQuestionNames } from '../fields/names.js'
import { textField } from '../fields/validation.js'
import { label } from '../translations/index.js'

export const Questionnaires: CollectionConfig = {
  slug: 'questionnaires',
  labels: { singular: label('questionnaire'), plural: label('questionnaires') },
  hooks: {
    beforeValidate: [fillQuestionNames],
    beforeChange: [questionnaireBeforeChange()],
  },
  admin: { useAsTitle: 'title' },
  fields: [
    textField('title', 'title', 200, true),
    {
      name: 'pages',
      type: 'blocks',
      blocks: [QuestionnairePage],
      minRows: 1,
      required: true,
      label: label('pages'),
      labels: { plural: label('pages'), singular: label('page') },
    },
  ],
  versions: { drafts: true },
}
