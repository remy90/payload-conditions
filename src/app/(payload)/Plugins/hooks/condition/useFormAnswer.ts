import { StandardPage } from '@/payload-types'
import type { Data, FormState, OptionObject } from 'payload/types'
import { useCallback } from 'react'
import { numberToArray } from '../../utilities'
import { getCurrentPageNoFromPath } from './helper'

type CMSAnswerBlockType = NonNullable<
  StandardPage['questionAnswerPair']
>[number]['answer'][number]['blockType']

type AnswerProcessor = (field: FormState, answerBlockType: string) => OptionObject[]
export const useAnswerGeneration = ({
  pageState,
  path,
}: {
  pageState: Data
  path: string
}): (() => OptionObject[]) => {
  return useCallback(() => {
    const [topLevelPath] = path.split('.')
    const numberOfPages = (pageState.pages?.value as number) ?? 0

    const currentPageNo =
      topLevelPath === 'pages'
        ? getCurrentPageNoFromPath({ path, pageName: 'pages' }) // ! get proper page
        : numberOfPages
    const currentQuestionId = getQuestionIdFromPrerequisiteAnswerIdPath(path, pageState)

    if (!currentQuestionId) return []

    const pageNumbers: number[] = numberToArray(pageState.pages?.value as number)

    const options = pageNumbers
      ?.filter((pageNo) => pageNo < currentPageNo)
      ?.flatMap((pageNo) => {
        const numberOfQuestions = Number(
          pageState[`pages.${pageNo}.questionAnswerPair`]?.value ?? 0,
        )
        const questionPaths: string[] = numberToArray(numberOfQuestions).map(
          (questionNo) => `pages.${pageNo}.questionAnswerPair.${questionNo}`,
        )

        const pathForQuestionId = questionPaths.find(
          (questionPath) => pageState[`${questionPath}.id`]?.value === currentQuestionId,
        )
        if (!pathForQuestionId) return []
        const answerOptions = getAnswerOptionsFromAnswerType(
          pageState,
          `${pathForQuestionId}.answer.0.blockType`,
        )

        return pathForQuestionId
          ? answerOptions?.flatMap<OptionObject>((option) =>
              option?.value && option?.label ? option : [],
            ) ?? []
          : []
      })

    return options ?? []
  }, [pageState, path])
}

const processBooleanOptions: AnswerProcessor = (fields, answerBlockType) => {
  const booleanPaths = [
    answerBlockType.replace('blockType', 'booleanOptions.trueOption'),
    answerBlockType.replace('blockType', 'booleanOptions.falseOption'),
  ]

  return booleanPaths.map<OptionObject>((label) => ({
    label: fields[label]?.value as string,
    value: fields[label.replace('eOption', 'eId')]?.value as string,
  }))
}
const processMultipleChoice: AnswerProcessor = (field, answerBlockType) => {
  return numberToArray(
    Number(field[answerBlockType.replace('blockType', 'multipleChoice.options')]?.value ?? 0),
  ).map<OptionObject>((choiceNo) => ({
    label: field[
      answerBlockType.replace('blockType', `multipleChoice.options.${choiceNo}.optionText`)
    ]?.value as string,
    value: field[answerBlockType.replace('blockType', `multipleChoice.options.${choiceNo}.id`)]
      ?.value as string,
  }))
}

const processInputTextChoice: AnswerProcessor = (field, answerBlockType) => {
  return numberToArray(
    Number(field[answerBlockType.replace('blockType', 'inputText.options')]?.value ?? 0),
  ).map<OptionObject>((choiceNo) => ({
    label: field[answerBlockType.replace('blockType', `inputText.${choiceNo}.inputText`)]
      ?.value as string,
    value: '',
  }))
}

const processorLookup: Record<CMSAnswerBlockType, AnswerProcessor> = {
  booleanOptions: processBooleanOptions,
  multipleChoice: processMultipleChoice,
  inputText: processInputTextChoice,
}

const getQuestionIdFromPrerequisiteAnswerIdPath: (
  path: string,
  pageState: Data,
) => string | undefined = (path, pageState) => {
  const prerequisiteQuestionPath = path.replace('answerValue', 'questionValue')
  // TODO: switch from pageData to reducedPageData formValues
  return pageState[`${prerequisiteQuestionPath}`]?.value as string | undefined
}

export const getAnswerOptionsFromAnswerType = (
  field: Data,
  answerBlockType: string,
): OptionObject[] | null => {
  const blockType = field[answerBlockType]?.value as CMSAnswerBlockType
  const processor = processorLookup[blockType]
  if (!processor) {
    console.error(`Unknown answer type: ${answerBlockType}`)
    return null
  }

  return processor(field, answerBlockType)
}
