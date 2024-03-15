'use client'
import { reduceFieldsToValues } from '@payloadcms/ui'
import type { Data } from 'payload/types'
import { OptionObject } from 'payload/types'
import { useMemo } from 'react'
import { numberToArray } from '../../utilities'

export const useFormQuestions = ({
  pageData,
  path,
  pageName = 'pages',
}: {
  pageData: Data
  path: string
  pageName: string
}): OptionObject[] => {
  return useMemo(() => {
    const fieldValues = reduceFieldsToValues(pageData)
    const numberOfPages = fieldValues.pages as number
    const pageNumbers = numberToArray(numberOfPages)
    const currentPageNo = getCurrentPageNoFromPath({ path, pageName })
    console.log(fieldValues)
    const result = pageNumbers.flatMap<OptionObject>((pageNo: number) => {
      const pageQuestions = `${pageName}.${pageNo}.questionAnswerPair`
      const numberOfQuestionsPerPage = pageData[pageQuestions]?.value ?? 0

      return numberToArray(numberOfQuestionsPerPage)
        ?.filter((pageNo) => pageNo < currentPageNo)
        .map<OptionObject>((qNo) => ({
          label: fieldValues[`${pageQuestions}.${qNo}.question`],
          value: `${pageQuestions}.${qNo}.question`,
        }))
    })

    return result
  }, [pageData, pageName, path])
}

const getCurrentPageNoFromPath: ({
  pageName,
  path,
}: {
  pageName: string
  path: string
}) => number = ({ path, pageName }) => {
  const pathAsArray = path.split('.')
  const pageIndexFromPathArray = (pathAsArray?.indexOf(pageName) ?? 0) + 1

  return Number(pathAsArray[pageIndexFromPathArray])
}

// export const useFormQuestions: ({
//   pageData,
//   path,
//   pageName,
// }: {
//   pageData: Data
//   path: string
//   pageName: string
// }) => () => () => OptionObject[] = ({ pageData, path, pageName = 'pages' }) =>
//   useCallback(() => {
//     const fieldValues = reduceFieldsToValues(pageData)

//     // const [currentPageType] = path.split('.')
//     const numberOfPages = fieldValues.pages as number
//     // const currentPageNo =
//     //   currentPageType === pageName ? getCurrentPageNoFromPath(path) : numberOfPages

//     const pageNumbers = numberToArray(numberOfPages)

//     return () => {
//       const result = pageNumbers
//         // ?.filter(pageNo =>
//         // pageNo < currentPageNo &&
//         //   isValidConditionalLogicBlockType(
//         //     pageState[`${fieldValues}.${pageNo}.content.contentBlock.0.answerType.0.blockType`]
//         //       ?.value as CMSAnswerBlockType,
//         //   ),
//         // )

//         ?.flatMap<OptionObject>((pageNo: number) => {
//           const numberOfQuestionsPerPage =
//             pageData[`${pageName}.${pageNo}.questionAnswerPair`]?.value ?? 0
//           const options = numberToArray(numberOfQuestionsPerPage).map<OptionObject>(
//             (qNo) =>
//               ({
//                 label: fieldValues[`${pageName}.${pageNo}.questionAnswerPair.${qNo}.question`],
//                 value: `${pageName}.${pageNo}.questionAnswerPair.${qNo}.question`,
//               } satisfies OptionObject),
//           )

//           return options
//         })
//       return result
//     }
//   }, [pageData, pageName])
