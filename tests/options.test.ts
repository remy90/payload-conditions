import type { FormState } from 'payload'
import { describe, expect, it } from 'vitest'
import { booleanOptionsBlock } from '../src/blocks/Answers/boolean.js'
import { buildAnswerOptions, buildQuestionOptions } from '../src/condition/options.js'

// Payload 3 stores array and blocks row counts at their parent paths.
const state = (values: Record<string, unknown>): FormState =>
  Object.fromEntries(Object.entries(values).map(([path, value]) => [path, { value }]))

const answerState = (blockValues: Record<string, unknown>): FormState => state({
  pages: 2,
  'pages.0.questionAnswerPair': 1,
  'pages.0.questionAnswerPair.0.id': 'question-id',
  'pages.0.questionAnswerPair.0.answer': 1,
  'pages.1.conditionalLogicGroup.0.questionValue': 'question-id',
  ...Object.fromEntries(Object.entries(blockValues).map(([key, value]) => [
    `pages.0.questionAnswerPair.0.answer.0.${key}`, value,
  ])),
})
const answerPath = 'pages.1.conditionalLogicGroup.0.answerValue'

describe('answer options', () => {
  it.each(['unknown', 'toString', '__proto__'])('ignores unsupported answer blocks: %s', (blockType) => {
    expect(buildAnswerOptions(answerState({ blockType }), answerPath)).toEqual([])
  })

  it('ignores answers without both a string label and id', () => {
    expect(buildAnswerOptions(answerState({
      blockType: 'booleanOptions',
      'booleanOptions.trueOption': 'Yes',
      'booleanOptions.falseId': 'no-id',
      'booleanOptions.falseOption': {},
    }), answerPath)).toEqual([])
  })

  it('limits answers to the selected earlier question', () => {
    const fields = answerState({ blockType: 'inputText', inputText: 'First answer', id: 'first-answer' })
    Object.assign(fields, state({
      'pages.0.questionAnswerPair': 2,
      'pages.0.questionAnswerPair.1.id': 'second-question',
      'pages.0.questionAnswerPair.1.answer.0.blockType': 'inputText',
      'pages.0.questionAnswerPair.1.answer.0.inputText': 'Second answer',
      'pages.0.questionAnswerPair.1.answer.0.id': 'second-answer',
      'pages.1.conditionalLogicGroup.0.questionValue': 'second-question',
    }))
    expect(buildAnswerOptions(fields, answerPath)).toEqual([{ label: 'Second answer', value: 'second-answer' }])
    fields['pages.1.conditionalLogicGroup.0.questionValue'].value = 'missing-question'
    expect(buildAnswerOptions(fields, answerPath)).toEqual([])
    fields['pages.1.conditionalLogicGroup.0.questionValue'].value = 'question-id'
    expect(buildAnswerOptions(fields, 'pages.0.conditionalLogicGroup.0.answerValue')).toEqual([])
  })

  it.each(['booleanOptions', 'inputText'])('handles blockType and eOption inside parent field names: %s', (blockType) => {
    const fields = answerState({
      blockType,
      inputText: 'Text',
      id: 'text-id',
      'booleanOptions.trueOption': 'Yes',
      'booleanOptions.trueId': 'yes-id',
    })
    const nested = Object.fromEntries(Object.entries(fields).map(([path, value]) => [path.replace(/^pages/, 'someOptions.blockTypes'), value]))
    expect(buildAnswerOptions(nested, 'someOptions.blockTypes.1.conditionalLogicGroup.0.answerValue'))
      .toEqual(blockType === 'inputText' ? [{ label: 'Text', value: 'text-id' }] : [{ label: 'Yes', value: 'yes-id' }])
  })

  it('follows nested page paths for answers', () => {
    const fields = answerState({ blockType: 'inputText', inputText: 'Text', id: 'text-id' })
    const nested = Object.fromEntries(Object.entries(fields).map(([path, value]) => [path.replace(/^pages/, 'content.survey'), value]))
    expect(buildAnswerOptions(nested, 'content.survey.1.conditionalLogicGroup.0.answerValue'))
      .toEqual([{ label: 'Text', value: 'text-id' }])
  })

  it('offers multiple choice rows with their generated ids', () => {
    const fields = answerState({
      blockType: 'multipleChoice',
      multipleChoice: 2,
      'multipleChoice.0.option': 'Red',
      'multipleChoice.0.id': 'red-id',
      'multipleChoice.1.option': 'Blue',
      'multipleChoice.1.id': 'blue-id',
    })
    expect(buildAnswerOptions(fields, answerPath)).toEqual([
      { label: 'Red', value: 'red-id' },
      { label: 'Blue', value: 'blue-id' },
    ])
  })

  it('uses row metadata when a multiple choice count is absent', () => {
    const fields = answerState({
      blockType: 'multipleChoice',
      'multipleChoice.0.option': 'Red',
      'multipleChoice.0.id': 'red-id',
    })
    fields['pages.0.questionAnswerPair.0.answer.0.multipleChoice'] = { rows: [{ id: 'red-id' }] }
    expect(buildAnswerOptions(fields, answerPath)).toEqual([{ label: 'Red', value: 'red-id' }])
  })

  it.each([undefined, null, -1, 1.5, NaN, Infinity, 'two', {}, []])(
    'ignores malformed multiple choice counts: %s', (count) => {
      expect(buildAnswerOptions(answerState({ blockType: 'multipleChoice', multipleChoice: count }), answerPath)).toEqual([])
    },
  )

  it('offers input text using the block id', () => {
    expect(buildAnswerOptions(answerState({ blockType: 'inputText', inputText: 'Expected text', id: 'text-id' }), answerPath))
      .toEqual([{ label: 'Expected text', value: 'text-id' }])
  })

  it('offers fresh boolean ids created by the field defaults before any validation hook', () => {
    const values: Record<string, unknown> = { blockType: 'booleanOptions' }
    for (const group of booleanOptionsBlock.fields) {
      if (group.type !== 'group') continue
      for (const field of group.fields) {
        if (!('name' in field) || !('defaultValue' in field)) continue
        values[`booleanOptions.${field.name}`] = typeof field.defaultValue === 'function'
          ? field.defaultValue({}) : field.defaultValue
      }
    }
    const options = buildAnswerOptions(answerState(values), answerPath)
    expect(options).toEqual([
      { label: 'Yes', value: expect.stringMatching(/^[0-9a-f-]{36}$/) },
      { label: 'No', value: expect.stringMatching(/^[0-9a-f-]{36}$/) },
    ])
    expect(options[0].value).not.toBe(options[1].value)
  })

  it('offers both boolean answers from the selected question before saving', () => {
    const fields = answerState({
      blockType: 'booleanOptions',
      'booleanOptions.trueOption': 'Yes',
      'booleanOptions.trueId': 'unsaved-yes',
      'booleanOptions.falseOption': 'No',
      'booleanOptions.falseId': 'unsaved-no',
    })
    expect(buildAnswerOptions(fields, answerPath)).toEqual([
      { label: 'Yes', value: 'unsaved-yes' },
      { label: 'No', value: 'unsaved-no' },
    ])
  })
})

describe('empty and malformed state', () => {
  it.each(['', 'pages', 'pages.NaN.conditionalLogicGroup.0.answerValue', 'pages.1.other.0.questionValue'])('ignores invalid paths: %s', (path) => {
    expect(buildQuestionOptions(state({ pages: 2 }), path)).toEqual([])
    expect(buildAnswerOptions(state({ pages: 2 }), path)).toEqual([])
  })

  it.each([undefined, null, -1, 1.5, NaN, Infinity, 'two', {}, []])('ignores malformed page counts: %s', (count) => {
    expect(buildQuestionOptions(state({ pages: count }), 'pages.1.conditionalLogicGroup.0.questionValue')).toEqual([])
    expect(buildAnswerOptions(state({ pages: count }), answerPath)).toEqual([])
  })

  it('handles an empty form while data is loading', () => {
    expect(buildQuestionOptions({}, 'pages.1.conditionalLogicGroup.0.questionValue')).toEqual([])
    expect(buildAnswerOptions({}, answerPath)).toEqual([])
  })
})

describe('question options', () => {
  it('follows nested page paths and supplies labels for unfinished questions', () => {
    const fields = state({
      'content.survey': 2,
      'content.survey.0.questionAnswerPair': 2,
      'content.survey.0.questionAnswerPair.0.id': 'unsaved-question',
      'content.survey.0.questionAnswerPair.1.question': 'Missing id',
    })
    expect(buildQuestionOptions(fields, 'content.survey.1.conditionalLogicGroup.0.questionValue'))
      .toEqual([{ label: 'Question 1', value: 'unsaved-question' }])
    fields['content.survey.0.questionAnswerPair.0.question'] = { value: 'Loaded question' }
    expect(buildQuestionOptions(fields, 'content.survey.1.conditionalLogicGroup.0.questionValue'))
      .toEqual([{ label: 'Loaded question', value: 'unsaved-question' }])
  })

  it('offers questions from earlier pages only', () => {
    const fields = state({
      pages: 3,
      'pages.0.questionAnswerPair': 1,
      'pages.0.questionAnswerPair.0.id': 'first',
      'pages.0.questionAnswerPair.0.question': 'First question',
      'pages.1.questionAnswerPair': 1,
      'pages.1.questionAnswerPair.0.id': 'current',
      'pages.1.questionAnswerPair.0.question': 'Current question',
      'pages.2.questionAnswerPair': 1,
      'pages.2.questionAnswerPair.0.id': 'later',
      'pages.2.questionAnswerPair.0.question': 'Later question',
    })
    expect(buildQuestionOptions(fields, 'pages.1.conditionalLogicGroup.0.questionValue')).toEqual([
      { label: 'First question', value: 'first' },
    ])
  })
})
