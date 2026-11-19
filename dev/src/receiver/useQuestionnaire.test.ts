import { act, renderHook, cleanup } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { fromPayloadQuestionnaire } from '@remy90/payload-conditions-engine/payload'
import { trip } from '../seed-data'
import { useQuestionnaire } from './useQuestionnaire'

afterEach(cleanup)
const questionnaire = fromPayloadQuestionnaire(trip)

test('a questionnaire swap removing the current page selects its nearest visible predecessor and keeps answers', () => {
  const { result, rerender } = renderHook((document) => useQuestionnaire(document), {
    initialProps: questionnaire,
  })
  act(() => {
    result.current.setAnswer('children', ['children-yes'])
    result.current.setAnswer('travel', ['plane'])
    result.current.setAnswer('ages', ['under2'])
  })
  act(() => result.current.next())
  act(() => result.current.next())
  expect(result.current.currentPage?.id).toBe('flight')
  rerender({ ...questionnaire, pages: questionnaire.pages.filter((page) => page.id !== 'flight') })
  expect(result.current.currentPage?.id).toBe('children-page')
  expect(result.current.answers.get('travel')).toEqual(['plane'])
  expect(result.current.answers.get('ages')).toEqual(['under2'])
})

test('an added condition hiding the current page selects a visible predecessor and preserves earlier answers', () => {
  const { result, rerender } = renderHook((document) => useQuestionnaire(document), {
    initialProps: questionnaire,
  })
  act(() => {
    result.current.setAnswer('children', ['children-no'])
    result.current.setAnswer('travel', ['plane'])
  })
  act(() => result.current.next())
  expect(result.current.currentPage?.id).toBe('flight')
  rerender({
    ...questionnaire,
    pages: questionnaire.pages.map((page) => page.id === 'flight' ? {
      ...page,
      conditionGroups: [{ match: 'all', conditions: [
        { questionId: 'travel', operator: 'is', answerId: 'train' },
      ] }],
    } : page),
  })
  expect(result.current.currentPage?.id).toBe('about')
  expect(result.current.visiblePages.map((page) => page.id)).not.toContain('flight')
  expect(result.current.answers.get('travel')).toEqual(['plane'])
})

test('removing the first page selects the first visible page', () => {
  const { result, rerender } = renderHook((document) => useQuestionnaire(document), {
    initialProps: questionnaire,
  })
  rerender({ ...questionnaire, pages: questionnaire.pages.filter((page) => page.id !== 'about') })
  expect(result.current.currentPage?.id).toBe('anything')
})

test('required answers block Next until the current page is complete', () => {
  const { result } = renderHook(() => useQuestionnaire(questionnaire))
  expect(result.current.canContinue).toBe(false)
  expect(result.current.pageIssues).toEqual([
    { questionId: 'children', issue: 'required' },
    { questionId: 'travel', issue: 'required' },
  ])
  act(() => result.current.next())
  expect(result.current.currentPage?.id).toBe('about')
  act(() => {
    result.current.setAnswer('children', ['children-no'])
    result.current.setAnswer('travel', ['plane'])
  })
  expect(result.current.canContinue).toBe(true)
  act(() => result.current.next())
  expect(result.current.currentPage?.id).toBe('flight')
})

test('Back and Next skip hidden pages and finish can return to the last page', () => {
  const { result } = renderHook(() => useQuestionnaire(questionnaire))
  act(() => {
    result.current.setAnswer('children', ['children-no'])
    result.current.setAnswer('travel', ['car'])
  })
  act(() => result.current.next())
  expect(result.current.currentPage?.id).toBe('anything')
  act(() => result.current.back())
  expect(result.current.currentPage?.id).toBe('about')
  act(() => result.current.next())
  act(() => result.current.next())
  expect(result.current.finished).toBe(true)
  act(() => result.current.back())
  expect(result.current.currentPage?.id).toBe('anything')
  expect(result.current.finished).toBe(false)
})

test('Restart clears answers and resets navigation; hiding the current page selects a visible neighbour', () => {
  const { result } = renderHook(() => useQuestionnaire(questionnaire))
  act(() => {
    result.current.setAnswer('children', ['children-yes'])
    result.current.setAnswer('travel', ['plane'])
  })
  act(() => result.current.next())
  expect(result.current.currentPage?.id).toBe('children-page')
  act(() => result.current.setAnswer('children', ['children-no']))
  expect(result.current.currentPage?.id).toBe('about')
  act(() => result.current.restart())
  expect(result.current.answers.size).toBe(0)
  expect(result.current.currentPage?.id).toBe('about')
  expect(result.current.finished).toBe(false)
  expect(result.current.canContinue).toBe(false)
})

test('hiding Children clears ages before evaluating the dependent Car seats page', () => {
  const { result } = renderHook(() => useQuestionnaire(questionnaire))
  act(() => {
    result.current.setAnswer('children', ['children-yes'])
    result.current.setAnswer('travel', ['plane'])
    result.current.setAnswer('ages', ['under2'])
    result.current.setAnswer('seat-help', ['seat-help-yes'])
  })
  expect(result.current.visiblePages.map((page) => page.id)).toEqual([
    'about',
    'children-page',
    'flight',
    'car-seats',
    'accessibility',
    'anything',
  ])
  act(() => result.current.setAnswer('children', ['children-no']))
  expect(result.current.visiblePages.map((page) => page.id)).toEqual([
    'about',
    'flight',
    'accessibility',
    'anything',
  ])
  expect(result.current.answers.has('ages')).toBe(false)
  expect(result.current.answers.has('seat-help')).toBe(false)
  act(() => result.current.setAnswer('children', ['children-yes']))
  expect(result.current.visiblePages.map((page) => page.id)).not.toContain('car-seats')
})
