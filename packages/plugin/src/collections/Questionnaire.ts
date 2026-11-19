import type { CollectionConfig } from 'payload'
import { StandardPage } from '../blocks/formPage.js'
import { normalizeBooleanIdsHook } from '../blocks/Answers/normalizeBooleanIds.js'

export const Questionnaire: CollectionConfig = {
  slug: 'questionnaire',
  hooks: { beforeChange: [normalizeBooleanIdsHook()] },
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
      label: 'Pages',
      labels: { plural: 'Pages', singular: 'Page' },
    },
  ],
  versions: {
    drafts: true,
  },
}
