import type { CollectionConfig } from 'payload/types'
import { StandardPage } from '../blocks/formPage'

export const Questionnaire: CollectionConfig = {
  slug: 'questionnaire',
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'pages',
      type: 'blocks',
      blocks: [StandardPage],
      label: 'Survey pages',
      labels: { plural: 'pages', singular: 'page' },
      hooks: {
        afterChange: [
          async ({ data }) => {
            console.log('data', data)
          },
        ],
      },
    },
  ],

  versions: {
    drafts: true,
  },
}
