'use client'

import { useState } from 'react'
import {
  applyAnswer,
  nextPageId,
  previousPageId,
  resolveVisibility,
  validatePageAnswers,
  type Answers,
  type Questionnaire,
} from '@remy90/payload-conditions-engine'

export function useQuestionnaire(questionnaire: Questionnaire) {
  const initialState = () => ({
    answers: new Map() as Answers,
    pageId: nextPageId(questionnaire, resolveVisibility(questionnaire, new Map()).visiblePageIds),
    finished: false,
  })
  const [state, setState] = useState(initialState)
  const { visiblePageIds } = resolveVisibility(questionnaire, state.answers)
  const visiblePages = questionnaire.pages.filter((page) => visiblePageIds.has(page.id))
  const currentPage = visiblePages.find((page) => page.id === state.pageId)
  const pageIssues = currentPage
    ? validatePageAnswers(questionnaire, currentPage.id, state.answers)
    : []
  return {
    answers: state.answers,
    visiblePages,
    currentPage,
    pageIssues,
    canContinue: pageIssues.length === 0,
    finished: state.finished,
    canGoBack:
      state.finished || previousPageId(questionnaire, visiblePageIds, state.pageId) !== undefined,
    setAnswer(questionId: string, values: readonly string[]) {
      setState((state) => {
        const result = applyAnswer(questionnaire, state.answers, questionId, values)
        const pageId =
          state.pageId && result.visiblePageIds.has(state.pageId)
            ? state.pageId
            : (previousPageId(questionnaire, result.visiblePageIds, state.pageId) ??
              nextPageId(questionnaire, result.visiblePageIds))
        return { ...state, answers: result.answers, pageId }
      })
    },
    next() {
      setState((state) => {
        if (state.pageId && validatePageAnswers(questionnaire, state.pageId, state.answers).length)
          return state
        const { visiblePageIds } = resolveVisibility(questionnaire, state.answers)
        const next = nextPageId(questionnaire, visiblePageIds, state.pageId)
        return { ...state, pageId: next ?? state.pageId, finished: !next }
      })
    },
    restart() {
      setState(initialState())
    },
    back() {
      setState((state) => {
        if (state.finished) return { ...state, finished: false }
        const { visiblePageIds } = resolveVisibility(questionnaire, state.answers)
        return {
          ...state,
          pageId: previousPageId(questionnaire, visiblePageIds, state.pageId) ?? state.pageId,
        }
      })
    },
  }
}
