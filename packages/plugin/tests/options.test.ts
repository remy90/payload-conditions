import type { FormState } from 'payload'
import { describe, expect, it } from 'vitest'
import { yesNoAnswerBlock } from '../src/blocks/Answers/yesNo.js'
import {
  buildAnswerOptions,
  buildOperatorOptions,
  buildQuestionOptions,
} from '../src/condition/options.js'
import { formIndex } from '../src/condition/formIndex.js'

// Payload 3 stores array and blocks row counts at their parent paths.
const state = (values: Record<string, unknown>): FormState =>
  Object.fromEntries(Object.entries(values).map(([path, value]) => [path, { value }]))

const answerState = (blockValues: Record<string, unknown>): FormState =>
  state({
    pages: 2,
    'pages.0.questions': 1,
    'pages.0.questions.0.id': 'question-id',
    'pages.0.questions.0.answer': 1,
    'pages.1.conditionGroups.0.conditions.0.questionId': 'question-id',
    ...Object.fromEntries(
      Object.entries(blockValues).map(([key, value]) => [
        `pages.0.questions.0.answer.0.${key}`,
        value,
      ]),
    ),
  })
const answerPath = 'pages.1.conditionGroups.0.conditions.0.answerId'

describe('answer options', () => {
  it.each(['unknown', 'toString', '__proto__'])(
    'ignores unsupported answer blocks: %s',
    (blockType) => {
      expect(buildAnswerOptions(answerState({ blockType }), answerPath)).toEqual([])
    },
  )

  it('ignores answers without both a string label and id', () => {
    expect(
      buildAnswerOptions(
        answerState({
          blockType: 'yesNo',
          'yesLabel': 'Yes',
          'noId': 'no-id',
          'noLabel': {},
        }),
        answerPath,
      ),
    ).toEqual([])
  })

  it.each(['yesNo', 'text'])(
    'uses the first duplicate question id when its answer is %s',
    (blockType) => {
      const fields = answerState({
        blockType,
        'yesLabel': 'First answer',
        'yesId': 'first-answer',
      })
      Object.assign(
        fields,
        state({
          pages: 4,
          'pages.0.questions.0.label': 'First question',
          'pages.2.questions': 1,
          'pages.2.questions.0.id': 'question-id',
          'pages.2.questions.0.label': 'Duplicate question',
          'pages.2.questions.0.answer.0.blockType': 'yesNo',
          'pages.2.questions.0.answer.0.yesLabel': 'Later answer',
          'pages.2.questions.0.answer.0.yesId': 'later-answer',
          'pages.3.conditionGroups.0.conditions.0.questionId': 'question-id',
        }),
      )
      for (const page of [1, 3]) {
        const path = `pages.${page}.conditionGroups.0.conditions.0`
        expect(buildAnswerOptions(fields, `${path}.answerId`)).toEqual(
          blockType === 'text' ? [] : [{ label: 'First answer', value: 'first-answer' }],
        )
        expect(buildQuestionOptions(fields, `${path}.questionId`)).toEqual(
          blockType === 'text' ? [] : [{ label: 'First question', value: 'question-id' }],
        )
      }
    },
  )

  it('limits answers to the selected earlier question', () => {
    const fields = answerState({
      blockType: 'yesNo',
      'yesLabel': 'First answer',
      'yesId': 'first-answer',
    })
    Object.assign(
      fields,
      state({
        'pages.0.questions': 2,
        'pages.0.questions.1.id': 'second-question',
        'pages.0.questions.1.answer.0.blockType': 'yesNo',
        'pages.0.questions.1.answer.0.yesLabel': 'Second answer',
        'pages.0.questions.1.answer.0.yesId': 'second-answer',
        'pages.1.conditionGroups.0.conditions.0.questionId': 'second-question',
      }),
    )
    expect(buildAnswerOptions(fields, answerPath)).toEqual([
      { label: 'Second answer', value: 'second-answer' },
    ])
    expect(
      buildAnswerOptions(
        {
          ...fields,
          'pages.1.conditionGroups.0.conditions.0.questionId': { value: 'missing-question' },
        },
        answerPath,
      ),
    ).toEqual([])
    expect(buildAnswerOptions(fields, 'pages.0.conditionGroups.0.conditions.0.answerId')).toEqual(
      [],
    )
  })

  it.each(['yesNo', 'text'])(
    'handles blockType and eOption inside parent field names: %s',
    (blockType) => {
      const fields = answerState({
        blockType,
        placeholder: 'Text',
        id: 'text-id',
        'yesLabel': 'Yes',
        'yesId': 'yes-id',
      })
      const nested = Object.fromEntries(
        Object.entries(fields).map(([path, value]) => [
          path.replace(/^pages/, 'someOptions.blockTypes'),
          value,
        ]),
      )
      expect(
        buildAnswerOptions(
          nested,
          'someOptions.blockTypes.1.conditionGroups.0.conditions.0.answerId',
        ),
      ).toEqual(blockType === 'text' ? [] : [{ label: 'Yes', value: 'yes-id' }])
    },
  )

  it('follows nested page paths for answers', () => {
    const fields = answerState({ blockType: 'text', placeholder: 'Text', id: 'text-id' })
    const nested = Object.fromEntries(
      Object.entries(fields).map(([path, value]) => [
        path.replace(/^pages/, 'content.survey'),
        value,
      ]),
    )
    expect(
      buildAnswerOptions(nested, 'content.survey.1.conditionGroups.0.conditions.0.answerId'),
    ).toEqual([])
  })

  it('offers multiple choice rows with their generated ids', () => {
    const fields = answerState({
      blockType: 'choice',
      options: 2,
      'options.0.label': 'Red',
      'options.0.id': 'red-id',
      'options.1.label': 'Blue',
      'options.1.id': 'blue-id',
    })
    expect(buildAnswerOptions(fields, answerPath)).toEqual([
      { label: 'Red', value: 'red-id' },
      { label: 'Blue', value: 'blue-id' },
    ])
  })

  it('uses row metadata when a multiple choice count is absent', () => {
    const fields = answerState({
      blockType: 'choice',
      'options.0.label': 'Red',
      'options.0.id': 'red-id',
    })
    fields['pages.0.questions.0.answer.0.options'] = { rows: [{ id: 'red-id' }] }
    expect(buildAnswerOptions(fields, answerPath)).toEqual([{ label: 'Red', value: 'red-id' }])
  })

  it.each([undefined, null, -1, 1.5, NaN, Infinity, 'two', {}, []])(
    'ignores malformed multiple choice counts: %s',
    (count) => {
      expect(
        buildAnswerOptions(
          answerState({ blockType: 'choice', options: count }),
          answerPath,
        ),
      ).toEqual([])
    },
  )

  it('excludes input text answers', () => {
    expect(
      buildAnswerOptions(
        answerState({ blockType: 'text', placeholder: 'Expected text', id: 'text-id' }),
        answerPath,
      ),
    ).toEqual([])
  })

  it('offers fresh boolean ids created by the field defaults before any validation hook', () => {
    const values: Record<string, unknown> = { blockType: 'yesNo' }
    for (const field of yesNoAnswerBlock.fields.flatMap((field) => field.type === 'row' ? field.fields : [field])) {
        if (!('name' in field) || !('defaultValue' in field)) continue
        values[`${field.name}`] =
          typeof field.defaultValue === 'function'
            ? Reflect.apply(field.defaultValue, undefined, [])
            : field.defaultValue
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
      blockType: 'yesNo',
      'yesLabel': 'Yes',
      'yesId': 'unsaved-yes',
      'noLabel': 'No',
      'noId': 'unsaved-no',
    })
    expect(buildAnswerOptions(fields, answerPath)).toEqual([
      { label: 'Yes', value: 'unsaved-yes' },
      { label: 'No', value: 'unsaved-no' },
    ])
  })
})

describe('empty and malformed state', () => {
  it.each([
    '',
    'pages',
    'pages.NaN.conditionGroups.0.conditions.0.answerId',
    'pages.1.other.0.questionId',
  ])('ignores invalid paths: %s', (path) => {
    expect(buildQuestionOptions(state({ pages: 2 }), path)).toEqual([])
    expect(buildAnswerOptions(state({ pages: 2 }), path)).toEqual([])
  })

  it.each([undefined, null, -1, 1.5, NaN, Infinity, 'two', {}, []])(
    'ignores malformed page counts: %s',
    (count) => {
      expect(
        buildQuestionOptions(
          state({ pages: count }),
          'pages.1.conditionGroups.0.conditions.0.questionId',
        ),
      ).toEqual([])
      expect(buildAnswerOptions(state({ pages: count }), answerPath)).toEqual([])
    },
  )

  it('handles an empty form while data is loading', () => {
    expect(buildQuestionOptions({}, 'pages.1.conditionGroups.0.conditions.0.questionId')).toEqual(
      [],
    )
    expect(buildAnswerOptions({}, answerPath)).toEqual([])
  })
})

describe('shared form index', () => {
  it('builds once for N selects on a snapshot and builds again for a new snapshot', () => {
    let builds = 0
    const fields = new Proxy(answerState({ blockType: 'yesNo' }), {
      ownKeys: (target) => {
        builds++
        return Reflect.ownKeys(target)
      },
    })
    for (let row = 0; row < 30; row++) {
      fields[`pages.1.conditionGroups.0.conditions.${row}.questionId`] = { value: 'question-id' }
    }
    const index = formIndex(fields)
    const options = buildQuestionOptions(fields, answerPath)
    for (let row = 0; row < 30; row++) {
      const path = `pages.1.conditionGroups.0.conditions.${row}`
      expect(buildQuestionOptions(fields, `${path}.questionId`)).toBe(options)
      buildAnswerOptions(fields, `${path}.answerId`)
      buildOperatorOptions(fields, `${path}.operator`)
      expect(formIndex(fields)).toBe(index)
    }
    expect(builds).toBe(1)
    expect(formIndex({ ...fields })).not.toBe(index)
  })

  it('re-derives operators when multiple selection toggles without rewriting the stored operator', () => {
    const fields = answerState({ blockType: 'choice', hasMany: false })
    fields['pages.1.conditionGroups.0.conditions.0.operator'] = { value: 'not_equals' }
    expect(buildOperatorOptions(fields, answerPath)).toEqual([
      { label: 'is', value: 'equals' },
      { label: 'is not', value: 'not_equals' },
    ])
    const toggled: FormState = {
      ...fields,
      'pages.0.questions.0.answer.0.hasMany': { value: true },
    }
    expect(buildOperatorOptions(toggled, answerPath)).toEqual([
      { label: 'includes', value: 'in' },
      { label: 'excludes', value: 'not_in' },
    ])
    expect(toggled['pages.1.conditionGroups.0.conditions.0.operator'].value).toBe('not_equals')
  })

  it('supports Payload row metadata for question ids and block types', () => {
    const fields = answerState({
      'yesId': 'yes',
      'yesLabel': 'Yes',
    })
    delete fields['pages.0.questions.0.id']
    fields['pages.0.questions'] = { rows: [{ id: 'question-id' }] }
    fields['pages.0.questions.0.answer'] = {
      rows: [{ id: 'block', blockType: 'yesNo' }],
    }
    expect(buildAnswerOptions(fields, answerPath)).toEqual([{ label: 'Yes', value: 'yes' }])
  })
})

describe('question options', () => {
  it('follows nested page paths and supplies labels for unfinished questions', () => {
    const fields = state({
      'content.survey': 2,
      'content.survey.1.conditionGroups.0.conditions.0.questionId': '',
      'content.survey.0.questions.0.answer.0.blockType': 'yesNo',
      'content.survey.0.questions': 2,
      'content.survey.0.questions.0.id': 'unsaved-question',
      'content.survey.0.questions.1.label': 'Missing id',
    })
    expect(
      buildQuestionOptions(fields, 'content.survey.1.conditionGroups.0.conditions.0.questionId'),
    ).toEqual([{ label: 'Question 1', value: 'unsaved-question' }])
    const updated = {
      ...fields,
      'content.survey.0.questions.0.label': { value: 'Loaded question' },
    }
    expect(
      buildQuestionOptions(updated, 'content.survey.1.conditionGroups.0.conditions.0.questionId'),
    ).toEqual([{ label: 'Loaded question', value: 'unsaved-question' }])
  })

  it('offers questions from earlier pages only', () => {
    const fields = state({
      pages: 3,
      'pages.1.conditionGroups.0.conditions.0.questionId': '',
      'pages.0.questions.0.answer.0.blockType': 'yesNo',
      'pages.0.questions': 3,
      'pages.0.questions.1.id': 'text',
      'pages.0.questions.1.answer.0.blockType': 'text',
      'pages.0.questions.2.id': 'multiple',
      'pages.0.questions.2.label': 'Pick one',
      'pages.0.questions.2.answer.0.blockType': 'choice',
      'pages.0.questions.0.id': 'first',
      'pages.0.questions.0.label': 'First question',
      'pages.1.questions': 1,
      'pages.1.questions.0.id': 'current',
      'pages.1.questions.0.answer.0.blockType': 'yesNo',
      'pages.1.questions.0.label': 'Current question',
      'pages.2.questions': 1,
      'pages.2.questions.0.id': 'later',
      'pages.2.questions.0.answer.0.blockType': 'choice',
      'pages.2.questions.0.label': 'Later question',
    })
    expect(
      buildQuestionOptions(fields, 'pages.1.conditionGroups.0.conditions.0.questionId'),
    ).toEqual([
      { label: 'First question', value: 'first' },
      { label: 'Pick one', value: 'multiple' },
    ])
    for (const id of ['current', 'later', 'text']) {
      const selected = {
        ...fields,
        'pages.1.conditionGroups.0.conditions.0.questionId': { value: id },
      }
      expect(buildAnswerOptions(selected, answerPath)).toEqual([])
      expect(buildOperatorOptions(selected, answerPath)).toEqual([])
    }
  })
})
