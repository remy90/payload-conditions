import {
  fromPayloadQuestionnaire,
  type StoredQuestionnaire,
} from '@remy90/payload-conditions-engine/payload'
import type { Question } from '@remy90/payload-conditions-engine'
import { hasInvalidQuestionnaireArrays } from './storedShape.js'

import type { TranslationContext } from '../translations/index.js'

export type ConditionValidationContext = TranslationContext & {
  data?: unknown
  path?: (number | string)[]
  siblingData?: { questionId?: unknown }
  req?: { context?: Record<string, unknown> }
}
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

type Index = Map<string, { question: Question; pageIndex: number }>
const cacheKey = '__questionnairePluginValidationIndexes'

const buildIndex = (pages: unknown[]): Index => {
  // Read each page once for the shape check and adapter.
  pages = pages.map((page) => record(page) ? { ...page } : page)
  if (hasInvalidQuestionnaireArrays({ pages })) return new Map()
  const positions: number[] = []
  pages.forEach((page, index) => {
    if (
      record(page) &&
      page.blockType === 'page' &&
      page.id !== undefined &&
      page.id !== null &&
      page.id !== ''
    ) {
      positions.push(index)
    }
  })
  const questionnaire = fromPayloadQuestionnaire({ pages } as StoredQuestionnaire)
  const index: Index = new Map()
  questionnaire.pages.forEach((page, offset) => {
    for (const question of page.questions) {
      if (!index.has(question.id))
        index.set(question.id, { question, pageIndex: positions[offset] })
    }
  })
  return index
}

const requestIndex = (pages: unknown[], req: ConditionValidationContext['req']): Index => {
  if (!req?.context) return buildIndex(pages)
  // Payload creates validationData per field, retaining its source arrays.
  // Keep the cache in the request so each save sees current answer settings.
  let cache = req.context[cacheKey]
  if (!(cache instanceof WeakMap)) {
    cache = new WeakMap<object, Index>()
    req.context[cacheKey] = cache
  }
  const indexes = cache as WeakMap<object, Index>
  let index = indexes.get(pages)
  if (!index) {
    index = buildIndex(pages)
    indexes.set(pages, index)
  }
  return index
}

export const conditionQuestion = ({
  data,
  path = [],
  siblingData,
  req,
}: ConditionValidationContext): Question | undefined => {
  let pages: unknown = data
  for (const segment of path.slice(0, -6)) pages = record(pages) ? pages[segment] : undefined
  const segment = path[path.length - 6]
  if (!/^\d+$/.test(String(segment))) return undefined
  const pageIndex = Number(segment)
  if (!Array.isArray(pages)) return undefined
  const source = requestIndex(pages, req).get(String(siblingData?.questionId))
  return source && source.pageIndex < pageIndex ? source.question : undefined
}
