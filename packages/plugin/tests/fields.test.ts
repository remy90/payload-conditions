import { describe, expect, it } from 'vitest'
import {
  trimText,
  textValidator,
  validateName,
  validateOptionLabel,
  validateYesNoLabel,
  validateMaxLength,
} from '../src/fields/validation.js'
import { fillQuestionNames } from '../src/fields/names.js'

const context = {}

it('checks question names across pages using row paths, including duplicate ids', () => {
  const data = {
    pages: [{ questions: [{ id: 'q', name: 'same' }] }, { questions: [{ id: 'q', name: 'same' }] }],
  }
  const options = { data, path: ['pages', '1', 'questions', '0', 'name'] }
  expect(validateName('same', options)).toBe('Question names must be unique.')
  expect(validateName('valid_name2', options)).toBe(true)
  for (const name of ['2abc', 'Upper', 'with space', 'a'.repeat(65), ' ']) {
    expect(validateName(name, options)).toEqual(expect.any(String))
  }
})

it('fills empty names from labels, reserving explicit names before generating suffixes', () => {
  const data = {
    pages: [
      {
        questions: [
          { label: ' Favourite colour? ', name: '' },
          { label: 'Favourite colour?', name: '  ' },
          { label: 'Reserved', name: 'favourite_colour' },
        ],
      },
      {
        questions: [
          { label: '123 café!', name: null },
          { label: '!!!' },
          { label: 'a'.repeat(100) },
        ],
      },
    ],
  }
  fillQuestionNames(data)
  expect(data.pages[0].questions.map((q) => q.name)).toEqual([
    'favourite_colour_2',
    'favourite_colour_3',
    'favourite_colour',
  ])
  expect(data.pages[1].questions.map((q) => q.name)).toEqual(['cafe', 'question', 'a'.repeat(64)])
  const snapshot = structuredClone(data)
  fillQuestionNames(data)
  expect(data).toEqual(snapshot)
})

it('leaves blank draft labels unnamed until they have text', () => {
  const data = {
    pages: [{ questions: [{ label: '   ', name: '' }, { label: '!!!', name: '' }] }],
  }
  fillQuestionNames(data)
  expect(data.pages[0].questions.map((question) => question.name)).toEqual(['', 'question'])
  data.pages[0].questions[0].label = 'Ready?'
  fillQuestionNames(data)
  expect(data.pages[0].questions[0].name).toBe('ready')
})

it('checks option labels after trimming and ignoring case', () => {
  const data = {
    pages: [{ questions: [{ answer: [{ options: [{ label: ' Red ' }, { label: 'red' }] }] }] }],
  }
  const options = {
    data,
    path: ['pages', '0', 'questions', '0', 'answer', '0', 'options', '1', 'label'],
  }
  expect(validateOptionLabel('red', options)).toBe(
    'Option labels must be unique within a question.',
  )
  expect(validateOptionLabel('Blue', options)).toBe(true)
  expect(validateOptionLabel(' ', options)).toBe('Enter a value.')
  expect(validateYesNoLabel('yesLabel')('YES', { siblingData: { noLabel: ' yes ' } })).toBe(
    'Option labels must be unique within a question.',
  )
  expect(validateYesNoLabel('noLabel')('No', { siblingData: { yesLabel: 'Yes' } })).toBe(true)
})

it('reports malformed text inline while checking uniqueness and filling names', () => {
  const data = {
    pages: [
      {
        questions: [
          { name: 42, label: 42 },
          { name: '', label: 'Ready' },
        ],
      },
    ],
  }
  expect(() => fillQuestionNames(data)).not.toThrow()
  expect(data.pages[0].questions[0].name).toBe(42)
  const path = ['pages', '0', 'questions', '1', 'name']
  expect(validateName('ready', { data, path })).toBe(true)
  const options = {
    pages: [{ questions: [{ answer: [{ options: [{ label: 42 }, { label: 'Red' }] }] }] }],
  }
  expect(
    validateOptionLabel('Red', {
      data: options,
      path: ['pages', '0', 'questions', '0', 'answer', '0', 'options', '1', 'label'],
    }),
  ).toBe(true)
})

it('limits free text length to a finite number from 1 to 10000', () => {
  for (const value of [undefined, null, 0, 10001, NaN, Infinity, '20'])
    expect(validateMaxLength(value, {})).toEqual(expect.any(String))
  for (const value of [1, 2000, 10000]) expect(validateMaxLength(value, {})).toBe(true)
})

describe('text field validation', () => {
  it('trims text and rejects whitespace-only required values', () => {
    expect(trimText({ value: '  Hello  ' } as never)).toBe('Hello')
    expect(trimText({ value: null } as never)).toBeNull()
    const validate = textValidator({ required: true, maxLength: 200 })
    expect(validate('   ', context)).toBe('Enter a value.')
    expect(validate(' Hello ', context)).toBe(true)
  })

  it('checks trimmed length and allows an empty optional value', () => {
    const validate = textValidator({ maxLength: 3 })
    expect(validate(' abc ', context)).toBe(true)
    expect(validate('abcd', context)).toBe('Use at most 3 characters.')
    expect(validate(undefined, context)).toBe(true)
    expect(validate(42, context)).toBe('Enter text.')
  })
})
