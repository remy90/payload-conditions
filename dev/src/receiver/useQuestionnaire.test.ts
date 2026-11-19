import { act, renderHook, cleanup } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { fromPayloadQuestionnaire } from '@remy90/payload-conditions-engine/payload'
import { trip } from '../seed-data'
import { useQuestionnaire } from './useQuestionnaire'

afterEach(cleanup)
const questionnaire = fromPayloadQuestionnaire(trip)

test('required answers block Next until the current page is complete', () => {
  const { result } = renderHook(() => useQuestionnaire(questionnaire))
  expect(result.current.canContinue).toBe(false)
  expect(result.current.pageIssues).toEqual([
    { questionId: 'children', issue: 'required' }, { questionId: 'travel', issue: 'required' },
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
  expect(result.current.visiblePages.map((page) => page.id)).toEqual(['about', 'children-page', 'flight', 'car-seats', 'accessibility', 'anything'])
  act(() => result.current.setAnswer('children', ['children-no']))
  expect(result.current.visiblePages.map((page) => page.id)).toEqual(['about', 'flight', 'accessibility', 'anything'])
  expect(result.current.answers.has('ages')).toBe(false)
  expect(result.current.answers.has('seat-help')).toBe(false)
  act(() => result.current.setAnswer('children', ['children-yes']))
  expect(result.current.visiblePages.map((page) => page.id)).not.toContain('car-seats')
})
