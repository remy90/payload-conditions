import { checkQuestionnaire } from '@remy90/payload-conditions-engine'
import { fromPayloadQuestionnaire, type StoredQuestionnaire } from '@remy90/payload-conditions-engine/payload'
import { ValidationError, type CollectionBeforeChangeHook } from 'payload'
import { normalizeQuestionnaire } from '../condition/normalizeQuestionnaire.js'
import { issueErrors } from './issueErrors.js'

export const questionnaireBeforeChange =
  (blocksField = 'pages'): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, collection, req }) => {
    const normalized = data[blocksField] === undefined ? data : normalizeQuestionnaire(
      data,
      () => crypto.randomUUID(),
      { blocksField, originalDoc: req.context.isRestoringVersion ? undefined : originalDoc },
    ) as typeof data
    const versions = collection.versions
    const drafts = versions && typeof versions === 'object' && versions.drafts
    const validateDrafts = drafts && typeof drafts === 'object' && drafts.validate
    const document = { ...originalDoc, ...normalized }
    if (drafts && !validateDrafts && document._status !== 'published') return normalized
    const stored: StoredQuestionnaire = { ...document, pages: document[blocksField] }
    const issues = checkQuestionnaire(fromPayloadQuestionnaire(stored))
    const errors = issueErrors(stored, issues, { req }, blocksField)
    if (errors.length) throw new ValidationError({ collection: collection.slug, errors, req }, req.t)
    return normalized
  }
