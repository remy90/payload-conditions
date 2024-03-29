'use client'
import { reduceFieldsToValues } from '@payloadcms/ui'
import type { Data } from 'payload/types'
import { OptionObject } from 'payload/types'
import { useCallback } from 'react'
import { numberToArray } from '../../utilities'
import { getCurrentPageNoFromPath } from './helper'

export const useFormQuestions = (): ((props: {
  pageData: Data
  path: string
  pageName: string
}) => OptionObject[]) =>
  useCallback(({ pageData, path, pageName = 'pages' }) => {
    console.log('filtered question fields', pageData)
    const fieldValues = reduceFieldsToValues(pageData)
    const numberOfPages = pageData.pages?.value ?? 0
    const pageNumbers = numberToArray(numberOfPages)
    const currentPageNo = getCurrentPageNoFromPath({ path, pageName })

    // This should list all questions per page that are less than the current page number

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
