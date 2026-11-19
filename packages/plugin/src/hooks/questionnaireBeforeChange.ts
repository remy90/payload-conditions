import { isDeepStrictEqual } from 'node:util'
import { checkQuestionnaire } from '@remy90/payload-conditions-engine'
import {
  fromPayloadQuestionnaire,
  type StoredQuestionnaire,
} from '@remy90/payload-conditions-engine/payload'
import { ValidationError, type CollectionBeforeChangeHook } from 'payload'
import { normalizeQuestionnaire } from '../condition/normalizeQuestionnaire.js'
import { hasInvalidQuestionnaireArrays } from '../condition/storedShape.js'
import { issueErrors } from './issueErrors.js'
import { fillQuestionNames } from '../fields/names.js'

// Payload adds undefined fields while traversing an update.
const definedFields = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(definedFields)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .map(([key, child]) => [key, definedFields(child)]),
  )
}

export const questionnaireBeforeChange =
  (blocksField = 'pages'): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, collection, req }) => {
    if (data[blocksField] === undefined && data._status === undefined) return data
    // Replay generated ids so repairs alone do not make unchanged pages look edited.
    const ids: string[] = []
    const normalize = (value: typeof data) => {
      fillQuestionNames(value, blocksField)
      let index = 0
      return value[blocksField] === undefined
        ? value
        : (normalizeQuestionnaire(
            value,
            () => {
              ids[index] ??= crypto.randomUUID()
              return ids[index++]
            },
            {
              blocksField,
              originalDoc: req.context.isRestoringVersion ? undefined : originalDoc,
            },
          ) as typeof data)
    }
    const previous = originalDoc && normalize(structuredClone(originalDoc))
    const normalized = normalize(data)
    const document = { ...originalDoc, ...normalized }
    if (
      previous &&
      document._status === previous._status &&
      isDeepStrictEqual(definedFields(document[blocksField]), definedFields(previous[blocksField]))
    )
      return normalized
    const versions = collection.versions
    const drafts = versions && typeof versions === 'object' && versions.drafts
    const validateDrafts = drafts && typeof drafts === 'object' && drafts.validate
    if (drafts && !validateDrafts && document._status !== 'published') return normalized
    const stored: StoredQuestionnaire = { ...document, pages: document[blocksField] }
    if (hasInvalidQuestionnaireArrays(stored)) return normalized
    const issues = checkQuestionnaire(fromPayloadQuestionnaire(stored))
    const errors = issueErrors(stored, issues, { req }, blocksField)
    if (errors.length) throw new ValidationError({ collection: collection.slug, errors, req }, req.t)
    return normalized
  }
