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

function pruneAnswers(questionnaire: Questionnaire, answers: Answers): Answers {
  const questions = new Map<string, Questionnaire['pages'][number]['questions'][number]>()
  for (const page of questionnaire.pages) {
    for (const question of page.questions) {
      if (!questions.has(question.id)) questions.set(question.id, question)
    }
  }
  let pruned: Map<string, readonly string[]> | undefined
  for (const [id, values] of answers) {
    const answer = questions.get(id)?.answer
    const optionIds =
      answer?.type === 'boolean'
        ? [answer.trueOption.id, answer.falseOption.id]
        : answer?.type === 'multipleChoice'
          ? answer.options.map((option) => option.id)
          : undefined
    const kept = !answer ? [] : optionIds ? values.filter((id) => optionIds.includes(id)) : values
    if (kept.length === values.length && kept.length > 0) continue
    pruned ??= new Map(answers)
    if (kept.length) pruned.set(id, kept)
    else pruned.delete(id)
  }
  return pruned ?? answers
}

export function useQuestionnaire(questionnaire: Questionnaire) {
  const initialState = () => ({
    questionnaire,
    answers: new Map() as Answers,
    pageId: nextPageId(questionnaire, resolveVisibility(questionnaire, new Map()).visiblePageIds),
    finished: false,
  })
  const [state, setState] = useState(initialState)
  const storedAnswers =
    state.questionnaire !== questionnaire ? pruneAnswers(questionnaire, state.answers) : state.answers
  const { visiblePageIds, answers } = resolveVisibility(questionnaire, storedAnswers)
  // Keep stored answers through half-edited preview conditions; expose only resolved answers.
  if (state.questionnaire !== questionnaire) {
    const oldIndex = state.questionnaire.pages.findIndex((page) => page.id === state.pageId)
    const previous = state.questionnaire.pages
      .slice(0, Math.max(0, oldIndex))
      .reverse()
      .find((page) => visiblePageIds.has(page.id))
    setState({
      ...state,
      questionnaire,
      answers: storedAnswers,
      pageId:
        state.pageId && visiblePageIds.has(state.pageId)
          ? state.pageId
          : (previous?.id ?? nextPageId(questionnaire, visiblePageIds)),
    })
  }
  const visiblePages = questionnaire.pages.filter((page) => visiblePageIds.has(page.id))
  const currentPage = visiblePages.find((page) => page.id === state.pageId)
  const pageIssues = currentPage
    ? validatePageAnswers(questionnaire, currentPage.id, answers)
    : []
  return {
    answers,
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
