import type { Data, OptionObject } from 'payload/types'
import { useCallback } from 'react'
import { numberToArray } from '@/utilities.js'
import { getCurrentPageNoFromPath } from './helper.js'
import type { CMSAnswerBlockType } from '@/condition/answerCondition/processors/types.js'
import { processorLookup } from '@/condition/answerCondition/processors/index.js'

export const useAnswerGeneration = (): (({
  pageState,
  path,
}: {
  pageState: Data
  path: string
}) => OptionObject[]) =>
  useCallback(({ pageState, path }) => {
    const [topLevelPath] = path.split('.')
    const numberOfPages = (pageState.pages?.value as number) ?? 0

    const currentPageNo =
      topLevelPath === 'pages'
        ? getCurrentPageNoFromPath({ path, pageName: 'pages' }) // TODO: pass in "page" concept
        : numberOfPages
    const currentQuestionId = getQuestionIdFromAnswerIdPath(path, pageState)

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
        const answerOptions = getAnswerOptionsFromAnswerType({
          field: pageState,
          answerBlockType: `${pathForQuestionId}.answer.0.blockType`,
        })

        return pathForQuestionId
          ? answerOptions?.flatMap<OptionObject>((option) =>
              option?.value && option?.label ? option : [],
            ) ?? []
          : []
      })

    return options ?? []
  }, [])

const getQuestionIdFromAnswerIdPath: (path: string, pageState: Data) => string | undefined = (
  path,
  pageState,
) => {
  const questionIdPath = path.replace('answerValue', 'questionValue')

  return pageState[`${questionIdPath}`]?.value as string | undefined
}

export const getAnswerOptionsFromAnswerType = ({
  field,
  answerBlockType,
}: {
  field: Data
  answerBlockType: string
}): OptionObject[] | null => {
  const blockType = field[answerBlockType]?.value as CMSAnswerBlockType

  const processor = processorLookup[blockType]
  if (!processor) {
    console.error(`Unknown answer type: ${answerBlockType}`)
    return null
  }

  return processor(field, answerBlockType)
}
