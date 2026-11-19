import { describe, expect, it } from 'vitest'
import { validatePageAnswers, type Question } from '../src/index.js'
import { yesNoQuestion, page, questionnaire } from './fixtures.js'

const single: Question = {
  id: 'single',
  name: 'question',
  label: 'Question',
  required: true,
  answer: {
    type: 'choice',
    hasMany: false,
    options: [
      { id: 'x', label: 'X' },
      { id: 'y', label: 'Y' },
    ],
  },
}
const multiple: Question = {
  ...single,
  id: 'multiple',
  answer: {
    ...single.answer,
    type: 'choice',
    hasMany: true,
    options: [
      { id: 'x', label: 'X' },
      { id: 'y', label: 'Y' },
    ],
  },
}
const text: Question = {
  id: 'text',
  name: 'question',
  label: 'Question',
  required: true,
  answer: { type: 'text', maxLength: 2000 },
}

describe('page answer validation', () => {
  it('requires non-whitespace text and a selection for required questions', () => {
    const q = questionnaire(page('page', [yesNoQuestion('yesNo'), single, multiple, text]))
    expect(
      validatePageAnswers(
        q,
        'page',
        new Map([
          ['text', [' \n\t ']],
          ['single', []],
          ['multiple', ['x']],
        ]),
      ),
    ).toEqual([
      { questionId: 'yesNo', issue: 'required' },
      { questionId: 'single', issue: 'required' },
      { questionId: 'text', issue: 'required' },
    ])
    expect(
      validatePageAnswers(
        q,
        'page',
        new Map([
          ['yesNo', ['no']],
          ['single', ['x']],
          ['multiple', ['x', 'y']],
          ['text', [' hello ']],
        ]),
      ),
    ).toEqual([])
    expect(validatePageAnswers(q, 'unknown', new Map())).toEqual([])
  })

  it('reports unknown choices and counts duplicate selections in a stable issue order', () => {
    const q = questionnaire(page('page', [yesNoQuestion('yesNo'), single, multiple, text]))
    expect(
      validatePageAnswers(
        q,
        'page',
        new Map([
          ['yesNo', ['alien', 'yes']],
          ['single', ['x', 'x']],
          ['multiple', ['alien', 'alien']],
          ['text', ['a', 'b']],
        ]),
      ),
    ).toEqual([
      { questionId: 'yesNo', issue: 'unknownOption' },
      { questionId: 'yesNo', issue: 'tooManySelections' },
      { questionId: 'single', issue: 'tooManySelections' },
      { questionId: 'multiple', issue: 'unknownOption' },
    ])
    expect(
      validatePageAnswers(
        q,
        'page',
        new Map([
          ['single', ['', ' ']],
          ['yesNo', ['yes']],
          ['multiple', ['x']],
          ['text', ['ok']],
        ]),
      ),
    ).toEqual([
      { questionId: 'single', issue: 'required' },
      { questionId: 'single', issue: 'unknownOption' },
      { questionId: 'single', issue: 'tooManySelections' },
    ])
  })

  it('lets non-required questions and skippable pages suppress only required issues', () => {
    for (const required of [false, true]) {
      const q = questionnaire({ ...page('page', [{ ...single, required }]), skippable: required })
      expect(validatePageAnswers(q, 'page', new Map())).toEqual([])
      expect(validatePageAnswers(q, 'page', new Map([['single', ['alien', 'alien']]]))).toEqual([
        { questionId: 'single', issue: 'unknownOption' },
        { questionId: 'single', issue: 'tooManySelections' },
      ])
    }
  })
})
