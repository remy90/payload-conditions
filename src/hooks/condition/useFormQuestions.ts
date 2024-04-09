'use client'
import type {  OptionObject } from 'payload/types'
import { useCallback } from 'react'
import { numberToArray } from '@/utilities.js'
import { getCurrentPageNoFromPath } from './helper.js'
import { reduceFieldsToValues } from '@payloadcms/ui/utilities/reduceFieldsToValues'

export const useFormQuestions = (): ((props: {
  pageData: any // Data
  path: string
  pageName: string
}) => OptionObject[]) =>
  useCallback(({ pageData, path, pageName = 'pages' }) => {
    const fieldValues = reduceFieldsToValues(pageData)
    const numberOfPages = pageData.pages?.value ?? 0
    const pageNumbers = numberToArray(numberOfPages)
    const currentPageNo = getCurrentPageNoFromPath({ path, pageName })

    const result = pageNumbers
      .filter((pageNo) => pageNo < currentPageNo)
      .flatMap<OptionObject>((pageNo: number) => {
        const pageQuestions = `${pageName}.${pageNo}.questionAnswerPair`
        const numberOfQuestionsOnPage = (pageData[pageQuestions]?.value as number) ?? 0

        return numberToArray(numberOfQuestionsOnPage).map<OptionObject>((qNo) => ({
          label: fieldValues[`${pageQuestions}.${qNo}.question`],
          value: fieldValues[`${pageQuestions}.${qNo}.id`],
        }))
      })
    return result
  }, [])
