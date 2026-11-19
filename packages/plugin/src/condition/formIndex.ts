import { operatorsFor, type Answer } from '@remy90/payload-conditions-engine'
import type { FormState, OptionObject } from 'payload'
import { rowCount, stringValue } from './formState.js'
import { translate } from '../translations/index.js'

export type IndexedQuestion = {
  path: string
  pageIndex: number
  answer: Answer
  options: OptionObject[]
  operators: OptionObject[]
}
type PagesIndex = {
  questions: Map<string, IndexedQuestion>
  eligible: OptionObject[]
  ends: number[]
  before: Map<number, OptionObject[]>
}
type ConditionPath = { pages: PagesIndex; pageIndex: number; rowPath: string }
type Index = { paths: Map<string, ConditionPath> }
const indexes = new WeakMap<FormState, Index>()
const empty: OptionObject[] = []

const rowString = (
  fields: FormState,
  parent: string,
  row: number,
  key: 'id' | 'blockType',
): string | undefined => {
  const value = stringValue(fields, `${parent}.${row}.${key}`) ?? fields[parent]?.rows?.[row]?.[key]
  return typeof value === 'string' && value.trim() ? value : undefined
}
const option = (id: string | undefined, label: string | undefined): OptionObject[] =>
  id && label ? [{ value: id, label }] : []

const readAnswer = (
  fields: FormState,
  path: string,
): { answer: Answer; options: OptionObject[] } | undefined => {
  const block = `${path}.answer.0`
  const type = rowString(fields, `${path}.answer`, 0, 'blockType')
  if (type === 'yesNo') {
    const yesLabel = {
      id: stringValue(fields, `${block}.yesId`) ?? '',
      label: stringValue(fields, `${block}.yesLabel`) ?? '',
    }
    const noLabel = {
      id: stringValue(fields, `${block}.noId`) ?? '',
      label: stringValue(fields, `${block}.noLabel`) ?? '',
    }
    return {
      answer: { type: 'yesNo', yes: yesLabel, no: noLabel },
      options: [...option(yesLabel.id, yesLabel.label), ...option(noLabel.id, noLabel.label)],
    }
  }
  if (type === 'choice') {
    const parent = `${block}.options`
    const options: OptionObject[] = []
    for (let row = 0; row < rowCount(fields, parent); row++) {
      options.push(
        ...option(
          rowString(fields, parent, row, 'id'),
          stringValue(fields, `${parent}.${row}.label`),
        ),
      )
    }
    return {
      answer: {
        type,
        hasMany: fields[`${block}.hasMany`]?.value === true,
        options: options.map(({ value, label }) => ({ id: String(value), label: String(label) })),
      },
      options,
    }
  }
  return undefined
}

const buildPages = (fields: FormState, root: string): PagesIndex => {
  const pages: PagesIndex = { questions: new Map(), eligible: [], ends: [], before: new Map() }
  const seen = new Set<string>()
  for (let pageIndex = 0; pageIndex < rowCount(fields, root); pageIndex++) {
    const parent = `${root}.${pageIndex}.questions`
    for (let row = 0; row < rowCount(fields, parent); row++) {
      const path = `${parent}.${row}`
      const id = rowString(fields, parent, row, 'id')
      if (!id || seen.has(id)) continue
      seen.add(id)
      const source = readAnswer(fields, path)
      if (!source) continue
      pages.questions.set(id, {
        path,
        pageIndex,
        ...source,
        operators: operatorsFor(source.answer).map((value) => ({
          value,
          label: translate({}, value),
        })),
      })
      pages.eligible.push({
        value: id,
        label:
          stringValue(fields, `${path}.label`) ??
          translate({}, 'questionNumber', { number: pages.eligible.length + 1 }),
      })
    }
    pages.ends.push(pages.eligible.length)
  }
  return pages
}

/** A snapshot is immutable in Payload's reducer. All selects share this index. */
export const formIndex = (fields: FormState): Index => {
  const cached = indexes.get(fields)
  if (cached) return cached
  const pagesByRoot = new Map<string, PagesIndex>()
  const paths = new Map<string, ConditionPath>()
  for (const path of Object.keys(fields)) {
    const match =
      /^(.*)\.(\d+)\.conditionGroups\.\d+\.conditions\.\d+\.(?:questionId|operator|answerId)$/.exec(
        path,
      )
    if (!match) continue
    const [, root, page] = match
    let pages = pagesByRoot.get(root)
    if (!pages) {
      pages = buildPages(fields, root)
      pagesByRoot.set(root, pages)
    }
    const rowPath = path.slice(0, path.lastIndexOf('.'))
    const context = { pages, pageIndex: Number(page), rowPath }
    for (const name of ['questionId', 'operator', 'answerId'])
      paths.set(`${rowPath}.${name}`, context)
  }
  const index = { paths }
  indexes.set(fields, index)
  return index
}

export const questionOptions = (fields: FormState, path: string): OptionObject[] => {
  const context = formIndex(fields).paths.get(path)
  if (!context) return empty
  const { pages, pageIndex } = context
  let options = pages.before.get(pageIndex)
  if (!options) {
    options = pages.eligible.slice(
      0,
      pageIndex === 0 ? 0 : (pages.ends[Math.min(pageIndex, pages.ends.length) - 1] ?? 0),
    )
    pages.before.set(pageIndex, options)
  }
  return options
}

export const selectedQuestion = (
  fields: FormState,
  path: string,
  id?: string | null,
): IndexedQuestion | undefined => {
  const context = formIndex(fields).paths.get(path)
  if (!context) return undefined
  const selected = id === undefined ? stringValue(fields, `${context.rowPath}.questionId`) : id
  const question = selected ? context.pages.questions.get(selected) : undefined
  return question && question.pageIndex < context.pageIndex ? question : undefined
}
