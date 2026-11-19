import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'
import { operators, matchModes } from '@remy90/payload-conditions-engine'
import {
  fromPayloadQuestionnaire,
  type StoredQuestionnaire,
} from '@remy90/payload-conditions-engine/payload'
import { StandardPage } from '../src/index.js'
import { booleanOptionsBlock } from '../src/blocks/Answers/boolean.js'
import { validateConditionOperator } from '../src/condition/validateOperator.js'

const named = (fields: Field[], name: string) => {
  const field = fields.find((field) => 'name' in field && field.name === name)
  if (!field) throw new Error(`Missing field ${name}`)
  return field
}
const children = (field: Field): Field[] => {
  if (!('fields' in field)) throw new Error('Expected nested fields')
  return field.fields
}
const values = (field: Field) => {
  if (field.type !== 'select') throw new Error('Expected select')
  return field.options.map((option) => (typeof option === 'string' ? option : option.value))
}

// Build stored rows through the configured fields, including Payload's row ids.
const row = (fields: Field[], data: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = { id: data.id }
  for (const field of fields) {
    if (field.type === 'row') {
      Object.assign(result, row(field.fields, data))
      continue
    }
    if (!('name' in field)) continue
    let value = data[field.name] ?? ('defaultValue' in field ? field.defaultValue : undefined)
    if (field.type === 'array' && Array.isArray(value)) {
      value = value.map((item) => row(field.fields, item))
    } else if (field.type === 'blocks' && Array.isArray(value)) {
      value = value.map((item) => {
        const block = field.blocks.find(
          (block) => typeof block !== 'string' && block.slug === item.blockType,
        )
        if (!block || typeof block === 'string') throw new Error('Unknown block')
        return { ...row(block.fields, item), blockType: block.slug }
      })
    } else if (field.type === 'group' && value && typeof value === 'object') {
      value = row(field.fields, value as Record<string, unknown>)
    }
    if (value !== undefined) result[field.name] = value
  }
  return result
}

describe('stored schema', () => {
  it('lays out boolean labels in a presentational row while keeping hidden ids', () => {
    const fields = children(named(booleanOptionsBlock.fields, 'booleanOptions'))
    const layout = fields.find((field) => field.type === 'row')
    expect(layout).toBeDefined()
    expect(layout && children(layout).map((field) => 'name' in field && field.name)).toEqual([
      'trueOption',
      'falseOption',
    ])
    for (const name of ['trueId', 'falseId']) {
      const field = named(fields, name)
      expect(field.type === 'text' && field.admin?.hidden).toBe(true)
    }
  })

  it('requires at least two multiple-choice options', () => {
    const answer = named(children(named(StandardPage.fields, 'questionAnswerPair')), 'answer')
    if (answer.type !== 'blocks') throw new Error('Expected answer blocks')
    const multipleChoice = answer.blocks.find(
      (block) => typeof block !== 'string' && block.slug === 'multipleChoice',
    )
    if (!multipleChoice || typeof multipleChoice === 'string')
      throw new Error('Missing multiple choice')
    const options = named(multipleChoice.fields, 'multipleChoice')
    expect(options.type === 'array' && options.minRows).toBe(2)
    expect('required' in options && options.required).toBe(true)
  })

  it('round-trips configured fields through the engine adapter', () => {
    expect(values(named(StandardPage.fields, 'match'))).toEqual([...matchModes])
    const groups = children(named(StandardPage.fields, 'conditionGroups'))
    expect(values(named(groups, 'match'))).toEqual([...matchModes])
    const conditions = children(named(groups, 'conditions'))
    const operator = named(conditions, 'operator')
    expect(values(operator)).toEqual([...operators])
    expect('validate' in operator && operator.validate).toBe(validateConditionOperator)
    for (const name of ['questionId', 'operator', 'answerId']) {
      const field = named(conditions, name)
      expect('required' in field && field.required).toBe(true)
    }
    const pages = [
      {
        id: 'first',
        questionAnswerPair: [
          {
            id: 'choice',
            question: 'Pick',
            optional: true,
            answer: [
              {
                blockType: 'multipleChoice',
                allowMultipleSelection: true,
                multipleChoice: [
                  { id: 'a', option: 'A' },
                  { id: 'b', option: 'B' },
                ],
              },
            ],
          },
          {
            id: 'bool',
            question: 'Ready?',
            answer: [
              {
                blockType: 'booleanOptions',
                booleanOptions: {
                  trueId: 'yes',
                  trueOption: 'Yes',
                  falseId: 'no',
                  falseOption: 'No',
                },
              },
            ],
          },
          {
            id: 'text',
            question: 'Name',
            answer: [{ blockType: 'inputText', inputText: 'Your name' }],
          },
        ],
      },
      {
        id: 'second',
        match: 'any',
        conditionGroups: [
          {
            id: 'group',
            match: 'all',
            conditions: [
              { id: 'condition', questionId: 'choice', operator: 'includes', answerId: 'b' },
            ],
          },
        ],
      },
    ].map((data) => ({ ...row(StandardPage.fields, data), blockType: StandardPage.slug }))
    const doc: StoredQuestionnaire = { id: 'survey', title: 'Survey', pages }
    expect(fromPayloadQuestionnaire(doc)).toEqual({
      id: 'survey',
      title: 'Survey',
      pages: [
        {
          id: 'first',
          skippable: false,
          match: 'all',
          conditionGroups: [],
          questions: [
            {
              id: 'choice',
              text: 'Pick',
              optional: true,
              answer: {
                type: 'multipleChoice',
                allowMultipleSelection: true,
                options: [
                  { id: 'a', label: 'A' },
                  { id: 'b', label: 'B' },
                ],
              },
            },
            {
              id: 'bool',
              text: 'Ready?',
              optional: false,
              answer: {
                type: 'boolean',
                trueOption: { id: 'yes', label: 'Yes' },
                falseOption: { id: 'no', label: 'No' },
              },
            },
            {
              id: 'text',
              text: 'Name',
              optional: false,
              answer: { type: 'inputText', prompt: 'Your name' },
            },
          ],
        },
        {
          id: 'second',
          skippable: false,
          questions: [],
          match: 'any',
          conditionGroups: [
            {
              match: 'all',
              conditions: [{ questionId: 'choice', operator: 'includes', answerId: 'b' }],
            },
          ],
        },
      ],
    })
  })
})
