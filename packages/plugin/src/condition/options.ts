import type { FormState, OptionObject } from 'payload'
import { rowCount, stringValue } from './formState.js'
import { processorLookup } from './answerCondition/processors/index.js'

const earlierQuestions = (fields: FormState, path: string): string[] => {
  const match = /^(.*)\.(\d+)\.conditionalLogicGroup\.\d+\.(?:questionValue|answerValue)$/.exec(path)
  if (!match) return []
  const [, pagesPath, pageIndex] = match
  const paths: string[] = []
  const pageCount = Math.min(rowCount(fields, pagesPath), Number(pageIndex))
  for (let page = 0; page < pageCount; page++) {
    const questions = `${pagesPath}.${page}.questionAnswerPair`
    for (let question = 0; question < rowCount(fields, questions); question++) {
      paths.push(`${questions}.${question}`)
    }
  }
  return paths
}

export const buildAnswerOptions = (fields: FormState, path: string): OptionObject[] => {
  const selectedQuestion = stringValue(fields, path.replace(/answerValue$/, 'questionValue'))
  if (!selectedQuestion) return []
  const questionPath = earlierQuestions(fields, path).find(
    (candidate) => stringValue(fields, `${candidate}.id`) === selectedQuestion,
  )
  if (!questionPath) return []
  const blockTypePath = `${questionPath}.answer.0.blockType`
  const blockType = stringValue(fields, blockTypePath)
  if (!blockType || !Object.hasOwn(processorLookup, blockType)) return []
  const processor = processorLookup[blockType as keyof typeof processorLookup]
  return processor(fields, blockTypePath).filter(
    (option) => typeof option.value === 'string' && !!option.value.trim() &&
      typeof option.label === 'string' && !!option.label.trim(),
  )
}

export const buildQuestionOptions = (fields: FormState, path: string): OptionObject[] =>
  earlierQuestions(fields, path).flatMap((questionPath, index) => {
    const value = stringValue(fields, `${questionPath}.id`)
    return value ? [{ label: stringValue(fields, `${questionPath}.question`) ?? `Question ${index + 1}`, value }] : []
  })
