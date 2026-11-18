import type { FormState } from 'payload'
import { describe, expect, it } from 'vitest'
import { booleanOptionsBlock } from '../src/blocks/Answers/boolean.js'
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
    'pages.0.questionAnswerPair': 1,
    'pages.0.questionAnswerPair.0.id': 'question-id',
    'pages.0.questionAnswerPair.0.answer': 1,
    'pages.1.conditionGroups.0.conditions.0.questionId': 'question-id',
    ...Object.fromEntries(
      Object.entries(blockValues).map(([key, value]) => [
        `pages.0.questionAnswerPair.0.answer.0.${key}`,
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
          blockType: 'booleanOptions',
          'booleanOptions.trueOption': 'Yes',
          'booleanOptions.falseId': 'no-id',
          'booleanOptions.falseOption': {},
        }),
        answerPath,
      ),
    ).toEqual([])
  })

  it.each(['booleanOptions', 'inputText'])(
    'uses the first duplicate question id when its answer is %s',
    (blockType) => {
      const fields = answerState({
        blockType,
        'booleanOptions.trueOption': 'First answer',
        'booleanOptions.trueId': 'first-answer',
      })
      Object.assign(
        fields,
        state({
          pages: 4,
          'pages.0.questionAnswerPair.0.question': 'First question',
          'pages.2.questionAnswerPair': 1,
          'pages.2.questionAnswerPair.0.id': 'question-id',
          'pages.2.questionAnswerPair.0.question': 'Duplicate question',
          'pages.2.questionAnswerPair.0.answer.0.blockType': 'booleanOptions',
          'pages.2.questionAnswerPair.0.answer.0.booleanOptions.trueOption': 'Later answer',
          'pages.2.questionAnswerPair.0.answer.0.booleanOptions.trueId': 'later-answer',
          'pages.3.conditionGroups.0.conditions.0.questionId': 'question-id',
        }),
      )
      for (const page of [1, 3]) {
        const path = `pages.${page}.conditionGroups.0.conditions.0`
        expect(buildAnswerOptions(fields, `${path}.answerId`)).toEqual(
          blockType === 'inputText' ? [] : [{ label: 'First answer', value: 'first-answer' }],
        )
        expect(buildQuestionOptions(fields, `${path}.questionId`)).toEqual(
          blockType === 'inputText' ? [] : [{ label: 'First question', value: 'question-id' }],
        )
      }
    },
  )

  it('limits answers to the selected earlier question', () => {
    const fields = answerState({
      blockType: 'booleanOptions',
      'booleanOptions.trueOption': 'First answer',
      'booleanOptions.trueId': 'first-answer',
    })
    Object.assign(
      fields,
      state({
        'pages.0.questionAnswerPair': 2,
        'pages.0.questionAnswerPair.1.id': 'second-question',
        'pages.0.questionAnswerPair.1.answer.0.blockType': 'booleanOptions',
        'pages.0.questionAnswerPair.1.answer.0.booleanOptions.trueOption': 'Second answer',
        'pages.0.questionAnswerPair.1.answer.0.booleanOptions.trueId': 'second-answer',
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

  it.each(['booleanOptions', 'inputText'])(
    'handles blockType and eOption inside parent field names: %s',
    (blockType) => {
      const fields = answerState({
        blockType,
        inputText: 'Text',
        id: 'text-id',
        'booleanOptions.trueOption': 'Yes',
        'booleanOptions.trueId': 'yes-id',
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
      ).toEqual(blockType === 'inputText' ? [] : [{ label: 'Yes', value: 'yes-id' }])
    },
  )

  it('follows nested page paths for answers', () => {
    const fields = answerState({ blockType: 'inputText', inputText: 'Text', id: 'text-id' })
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
    'ignores malformed multiple choice counts: %s',
    (count) => {
      expect(
        buildAnswerOptions(
          answerState({ blockType: 'multipleChoice', multipleChoice: count }),
          answerPath,
        ),
      ).toEqual([])
    },
  )

  it('excludes input text answers', () => {
    expect(
      buildAnswerOptions(
        answerState({ blockType: 'inputText', inputText: 'Expected text', id: 'text-id' }),
        answerPath,
      ),
    ).toEqual([])
  })

  it('offers fresh boolean ids created by the field defaults before any validation hook', () => {
    const values: Record<string, unknown> = { blockType: 'booleanOptions' }
    for (const group of booleanOptionsBlock.fields) {
      if (group.type !== 'group') continue
      for (const field of group.fields) {
        if (!('name' in field) || !('defaultValue' in field)) continue
        values[`booleanOptions.${field.name}`] =
          typeof field.defaultValue === 'function'
            ? Reflect.apply(field.defaultValue, undefined, [])
            : field.defaultValue
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
    const fields = new Proxy(answerState({ blockType: 'booleanOptions' }), {
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
    const fields = answerState({ blockType: 'multipleChoice', allowMultipleSelection: false })
    fields['pages.1.conditionGroups.0.conditions.0.operator'] = { value: 'isNot' }
    expect(buildOperatorOptions(fields, answerPath)).toEqual([
      { label: 'is', value: 'is' },
      { label: 'is not', value: 'isNot' },
    ])
    const toggled: FormState = {
      ...fields,
      'pages.0.questionAnswerPair.0.answer.0.allowMultipleSelection': { value: true },
    }
    expect(buildOperatorOptions(toggled, answerPath)).toEqual([
      { label: 'includes', value: 'includes' },
      { label: 'excludes', value: 'excludes' },
    ])
    expect(toggled['pages.1.conditionGroups.0.conditions.0.operator'].value).toBe('isNot')
  })

  it('supports Payload row metadata for question ids and block types', () => {
    const fields = answerState({
      'booleanOptions.trueId': 'yes',
      'booleanOptions.trueOption': 'Yes',
    })
    delete fields['pages.0.questionAnswerPair.0.id']
    fields['pages.0.questionAnswerPair'] = { rows: [{ id: 'question-id' }] }
    fields['pages.0.questionAnswerPair.0.answer'] = {
      rows: [{ id: 'block', blockType: 'booleanOptions' }],
    }
    expect(buildAnswerOptions(fields, answerPath)).toEqual([{ label: 'Yes', value: 'yes' }])
  })
})

describe('question options', () => {
  it('follows nested page paths and supplies labels for unfinished questions', () => {
    const fields = state({
      'content.survey': 2,
      'content.survey.1.conditionGroups.0.conditions.0.questionId': '',
      'content.survey.0.questionAnswerPair.0.answer.0.blockType': 'booleanOptions',
      'content.survey.0.questionAnswerPair': 2,
      'content.survey.0.questionAnswerPair.0.id': 'unsaved-question',
      'content.survey.0.questionAnswerPair.1.question': 'Missing id',
    })
    expect(
      buildQuestionOptions(fields, 'content.survey.1.conditionGroups.0.conditions.0.questionId'),
    ).toEqual([{ label: 'Question 1', value: 'unsaved-question' }])
    const updated = {
      ...fields,
      'content.survey.0.questionAnswerPair.0.question': { value: 'Loaded question' },
    }
    expect(
      buildQuestionOptions(updated, 'content.survey.1.conditionGroups.0.conditions.0.questionId'),
    ).toEqual([{ label: 'Loaded question', value: 'unsaved-question' }])
  })

  it('offers questions from earlier pages only', () => {
    const fields = state({
      pages: 3,
      'pages.1.conditionGroups.0.conditions.0.questionId': '',
      'pages.0.questionAnswerPair.0.answer.0.blockType': 'booleanOptions',
      'pages.0.questionAnswerPair': 3,
      'pages.0.questionAnswerPair.1.id': 'text',
      'pages.0.questionAnswerPair.1.answer.0.blockType': 'inputText',
      'pages.0.questionAnswerPair.2.id': 'multiple',
      'pages.0.questionAnswerPair.2.question': 'Pick one',
      'pages.0.questionAnswerPair.2.answer.0.blockType': 'multipleChoice',
      'pages.0.questionAnswerPair.0.id': 'first',
      'pages.0.questionAnswerPair.0.question': 'First question',
      'pages.1.questionAnswerPair': 1,
      'pages.1.questionAnswerPair.0.id': 'current',
      'pages.1.questionAnswerPair.0.answer.0.blockType': 'booleanOptions',
      'pages.1.questionAnswerPair.0.question': 'Current question',
      'pages.2.questionAnswerPair': 1,
      'pages.2.questionAnswerPair.0.id': 'later',
      'pages.2.questionAnswerPair.0.answer.0.blockType': 'multipleChoice',
      'pages.2.questionAnswerPair.0.question': 'Later question',
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
