import { describe, expect, it } from 'vitest'
import { validatePageAnswers, type Question } from '../src/index.js'
import { booleanQuestion, page, questionnaire } from './fixtures.js'

const single: Question = { id: 'single', text: '', optional: false, answer: {
  type: 'multipleChoice', allowMultipleSelection: false, options: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }],
} }
const multiple: Question = { ...single, id: 'multiple', answer: { ...single.answer, type: 'multipleChoice', allowMultipleSelection: true, options: [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }] } }
const text: Question = { id: 'text', text: '', optional: false, answer: { type: 'inputText', prompt: '' } }

describe('page answer validation', () => {
  it('requires non-whitespace text and a selection for required questions', () => {
    const q = questionnaire(page('page', [booleanQuestion('boolean'), single, multiple, text]))
    expect(validatePageAnswers(q, 'page', new Map([['text', [' \n\t ']], ['single', []], ['multiple', ['x']]]))).toEqual([
      { questionId: 'boolean', issue: 'required' },
      { questionId: 'single', issue: 'required' },
      { questionId: 'text', issue: 'required' },
    ])
    expect(validatePageAnswers(q, 'page', new Map([['boolean', ['no']], ['single', ['x']], ['multiple', ['x', 'y']], ['text', [' hello ']]]))).toEqual([])
    expect(validatePageAnswers(q, 'unknown', new Map())).toEqual([])
  })

  it('reports unknown choices and counts duplicate selections in a stable issue order', () => {
    const q = questionnaire(page('page', [booleanQuestion('boolean'), single, multiple, text]))
    expect(validatePageAnswers(q, 'page', new Map([
      ['boolean', ['alien', 'yes']], ['single', ['x', 'x']], ['multiple', ['alien', 'alien']], ['text', ['a', 'b']],
    ]))).toEqual([
      { questionId: 'boolean', issue: 'unknownOption' },
      { questionId: 'boolean', issue: 'tooManySelections' },
      { questionId: 'single', issue: 'tooManySelections' },
      { questionId: 'multiple', issue: 'unknownOption' },
    ])
    expect(validatePageAnswers(q, 'page', new Map([['single', ['', ' ']], ['boolean', ['yes']], ['multiple', ['x']], ['text', ['ok']]]))).toEqual([
      { questionId: 'single', issue: 'required' },
      { questionId: 'single', issue: 'unknownOption' },
      { questionId: 'single', issue: 'tooManySelections' },
    ])
  })

  it('lets optional questions and skippable pages suppress only required issues', () => {
    for (const optional of [false, true]) {
      const q = questionnaire({ ...page('page', [{ ...single, optional }]), skippable: !optional })
      expect(validatePageAnswers(q, 'page', new Map())).toEqual([])
      expect(validatePageAnswers(q, 'page', new Map([['single', ['alien', 'alien']]]))).toEqual([
        { questionId: 'single', issue: 'unknownOption' }, { questionId: 'single', issue: 'tooManySelections' },
      ])
    }
  })
})
