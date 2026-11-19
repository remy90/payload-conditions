import { describe, expect, it } from 'vitest'
import { validateAnswers, validatePageAnswers, type Question } from '../src/index.js'
import { condition, yesNoQuestion, page, questionnaire } from './fixtures.js'

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

describe('questionnaire answer validation', () => {
  it('validates only the first occurrence of repeated question and page ids', () => {
    const q = questionnaire(
      page('A', [{ ...text, id: 'a', required: false }]),
      page('B', [yesNoQuestion('a')]),
      page('A', [yesNoQuestion('ignored')]),
    )
    expect(validateAnswers(q, new Map([['a', ['free text']]]))).toEqual([])
    expect(validatePageAnswers(q, 'B', new Map())).toEqual([])
  })

  it('validates visible pages and reports hidden and unknown answers without mutating them', () => {
    const q = questionnaire(
      page('A', [yesNoQuestion('a')]),
      page('B', [{ ...text, id: 'b' }], [condition('a')]),
      page('C', [{ ...single, id: 'c' }]),
    )
    const answers = new Map([
      ['a', ['no']],
      ['b', ['hidden']],
      ['foreign', ['value']],
    ])
    const before = new Map(answers)
    expect(validateAnswers(q, answers)).toEqual([
      { questionId: 'c', pageId: 'C', issue: 'required' },
      { questionId: 'b', pageId: 'B', issue: 'hiddenQuestion' },
      { questionId: 'foreign', issue: 'unknownQuestion' },
    ])
    expect(answers).toEqual(before)
    expect(
      validateAnswers(
        q,
        new Map([
          ['a', ['yes']],
          ['b', ['ok']],
          ['c', ['x']],
        ]),
      ),
    ).toEqual([])
  })
})

describe('page answer validation', () => {
  it('reports tooLong for text beyond maxLength, including non-required text', () => {
    const q = questionnaire(
      page('page', [{ ...text, required: false, answer: { type: 'text', maxLength: 3 } }]),
    )
    expect(validatePageAnswers(q, 'page', new Map([['text', ['four']]]))).toEqual([
      { questionId: 'text', issue: 'tooLong' },
    ])
    expect(validateAnswers(q, new Map([['text', ['four']]]))).toEqual([
      { questionId: 'text', pageId: 'page', issue: 'tooLong' },
    ])
    expect(validatePageAnswers(q, 'page', new Map([['text', ['abc']]]))).toEqual([])
  })

  it('trims text for the questionnaire-wide required check', () => {
    const q = questionnaire(page('page', [text]))
    expect(validateAnswers(q, new Map([['text', [' \n\t ']]]))).toEqual([
      { questionId: 'text', pageId: 'page', issue: 'required' },
    ])
  })

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
