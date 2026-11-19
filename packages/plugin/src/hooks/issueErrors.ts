import {
  operators,
  type QuestionnaireIssue,
  type QuestionnaireIssueCode,
} from '@remy90/payload-conditions-engine'
import {
  fromPayloadQuestionnaire,
  type StoredQuestionnaire,
} from '@remy90/payload-conditions-engine/payload'
import type { ValidationFieldError } from 'payload'
import { translate, type TranslationContext, type TranslationKey } from '../translations/index.js'

const fieldCodes = new Set<QuestionnaireIssueCode>([
  'noPages',
  'emptyPage',
  'emptyGroup',
  'blankText',
  'duplicateOptionLabel',
  'invalidName',
  'duplicateName',
])
const conditionFields: Partial<Record<QuestionnaireIssueCode, string>> = {
  unknownQuestion: 'questionId',
  samePageQuestion: 'questionId',
  laterQuestion: 'questionId',
  unsupportedSource: 'questionId',
  unknownAnswer: 'answerId',
  operatorMismatch: 'operator',
  contradiction: 'operator',
}
type Location = {
  pageId?: string
  questionId?: string
  optionId?: string
  groupId?: string
  conditionId?: string
  path: string
  complete?: boolean
}
const id = (value: unknown): string | undefined =>
  value == null || value === '' ? undefined : String(value)

const errorLabel = (path: string, blocksField: string, context: TranslationContext): string => {
  const rows: Record<string, TranslationKey> = {
    page: 'page',
    questions: 'question',
    conditionGroups: 'conditionGroup',
    conditions: 'condition',
    options: 'option',
  }
  const fields: Record<string, TranslationKey> = {
    questionId: 'question',
    answerId: 'answer',
    operator: 'operator',
    yesId: 'yesLabel',
    noId: 'noLabel',
  }
  const segments = ['page', ...path.slice(blocksField.length + 1).split('.')]
  const labels: string[] = []
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]
    const row = rows[segment]
    if (row) {
      const number = segments[index + 1]
      if (/^\d+$/.test(number ?? '')) {
        labels.push(`${translate(context, row)} ${Number(number) + 1}`)
        index++
      } else if (segment === 'conditionGroups') {
        labels.push(translate(context, 'conditionGroups'))
      }
    } else if (fields[segment]) {
      labels.push(translate(context, fields[segment]))
    }
  }
  return labels.join(' > ')
}

export const issueErrors = (
  document: StoredQuestionnaire,
  issues: QuestionnaireIssue[],
  context: TranslationContext = {},
  blocksField = 'pages',
): ValidationFieldError[] => {
  const locations: Location[] = []
  const ids = new Map<string, string[]>()
  const addId = (value: string, path: string) => ids.set(value, [...(ids.get(value) ?? []), path])
  for (const [p, page] of (document.pages ?? []).entries()) {
    if (page.blockType !== 'page' || id(page.id) === undefined) continue
    const pageId = String(page.id)
    const path = `${blocksField}.${p}`
    locations.push({ pageId, path })
    addId(pageId, `${path}.id`)
    for (const [q, question] of (page.questions ?? []).entries()) {
      // Use the adapter's row eligibility so discarded draft rows cannot shift duplicate paths.
      const adapted = fromPayloadQuestionnaire({
        pages: [{ id: '_', blockType: 'page', questions: [question] }],
      })
      if (!adapted.pages[0]?.questions.length) continue
      const questionId = String(question.id)
      const questionPath = `${path}.questions.${q}`
      locations.push({ pageId, questionId, path: questionPath })
      addId(questionId, `${questionPath}.id`)
      const a = question.answer.findIndex(
        (answer: any) =>
          answer.blockType === 'choice' ||
          answer.blockType === 'text' ||
          (answer.blockType === 'yesNo' &&
            id(answer.yesId) !== undefined &&
            id(answer.noId) !== undefined),
      )
      const answer = question.answer[a]
      const answerPath = `${questionPath}.answer.${a}`
      if (answer.blockType === 'yesNo') {
        for (const key of ['yes', 'no'] as const) {
          const optionId = String(answer[`${key}Id`])
          locations.push({ pageId, questionId, optionId, path: `${answerPath}.${key}Label` })
          addId(optionId, `${answerPath}.${key}Id`)
        }
      } else if (answer.blockType === 'choice') {
        for (const [o, option] of (answer.options ?? []).entries()) {
          if (id(option.id) === undefined) continue
          const optionId = String(option.id)
          locations.push({ pageId, questionId, optionId, path: `${answerPath}.options.${o}.label` })
          addId(optionId, `${answerPath}.options.${o}.id`)
        }
      }
    }
    for (const [g, group] of (page.conditionGroups ?? []).entries()) {
      const groupId = id(group.id)
      if (groupId === undefined) continue
      const groupPath = `${path}.conditionGroups.${g}`
      locations.push({ pageId, groupId, path: groupPath })
      for (const [c, condition] of (group.conditions ?? []).entries()) {
        const conditionId = id(condition.id)
        if (conditionId === undefined) continue
        locations.push({
          pageId,
          groupId,
          conditionId,
          path: `${groupPath}.conditions.${c}`,
          complete: !!(
            condition.questionId &&
            operators.includes(condition.operator) &&
            condition.answerId
          ),
        })
      }
    }
  }
  const duplicates = new Map([...ids].map(([id, paths]) => [id, paths.slice(1)]))
  const errors: ValidationFieldError[] = []
  for (const issue of issues) {
    if (fieldCodes.has(issue.code)) continue
    let path: string | undefined
    if (issue.code === 'duplicateId') {
      const target = issue.optionId ?? issue.questionId ?? issue.pageId
      path = target === undefined ? undefined : duplicates.get(target)?.shift()
    } else if (issue.conditionId !== undefined || issue.groupId !== undefined) {
      const location = locations.find(
        (location) =>
          location.pageId === issue.pageId &&
          location.groupId === issue.groupId &&
          location.conditionId === issue.conditionId,
      )
      if (location?.complete === false) continue
      const field = conditionFields[issue.code]
      if (!field) continue
      path = location && `${location.path}.${field}`
    } else if (issue.code === 'unreachablePage') {
      const location = locations.find(
        (location) =>
          location.pageId === issue.pageId &&
          location.questionId === issue.questionId &&
          location.optionId === issue.optionId &&
          location.groupId === undefined,
      )
      path = location && `${location.path}.conditionGroups`
    }
    if (path)
      errors.push({
        path,
        label: errorLabel(path, blocksField, context),
        message: translate(
          context,
          issue.code as Exclude<
            QuestionnaireIssueCode,
            'noPages' | 'emptyPage' | 'emptyGroup' | 'blankText'
          >,
        ),
      })
  }
  return errors
}
