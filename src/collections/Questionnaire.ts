import type { CollectionConfig } from 'payload/types'
import { StandardPage } from '@/blocks/formPage.js'

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
    },
  ],
  versions: {
    drafts: true,
  },
}
