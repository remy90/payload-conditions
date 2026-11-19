import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'
import { operators } from '@remy90/payload-conditions-engine'
import { Questionnaires, QuestionnairePage } from '../src/index.js'
import { yesNoAnswerBlock } from '../src/blocks/Answers/yesNo.js'
import { choiceAnswerBlock } from '../src/blocks/Answers/choice.js'
import { textAnswerBlock } from '../src/blocks/Answers/text.js'
import { trimText } from '../src/fields/validation.js'

const named = (fields: Field[], name: string): any => {
  const field = fields.find((field) => 'name' in field && field.name === name)
  if (!field) throw new Error(`Missing field ${name}`)
  return field
}
const flattened = (fields: Field[]): Field[] => fields.flatMap((field) => field.type === 'row' ? field.fields : [field])

describe('stored schema', () => {
  it('uses the contracted collection, block slugs and generated interface names', () => {
    expect(Questionnaires.slug).toBe('questionnaires')
    expect(Questionnaires.versions).toEqual({ drafts: true })
    expect(QuestionnairePage.slug).toBe('page')
    expect(QuestionnairePage.interfaceName).toBe('QuestionnairePage')
    expect([yesNoAnswerBlock, choiceAnswerBlock, textAnswerBlock].map(({ slug, interfaceName }) => [slug, interfaceName])).toEqual([
      ['yesNo', 'YesNoAnswer'], ['choice', 'ChoiceAnswer'], ['text', 'TextAnswer'],
    ])
    const answer = named(named(QuestionnairePage.fields, 'questions').fields, 'answer')
    expect(answer.minRows).toBe(1)
    expect(answer.maxRows).toBe(1)
    expect(answer.required).toBe(true)
  })

  it('sets required row counts, checkbox defaults and free text limits', () => {
    expect(named(Questionnaires.fields, 'pages')).toMatchObject({ minRows: 1, required: true })
    const questions = named(QuestionnairePage.fields, 'questions')
    expect(questions).toMatchObject({ minRows: 1, required: true })
    expect(named(questions.fields, 'required').defaultValue).toBe(true)
    expect(named(QuestionnairePage.fields, 'skippable').defaultValue).toBe(false)
    expect(named(choiceAnswerBlock.fields, 'hasMany').defaultValue).toBe(false)
    expect(named(choiceAnswerBlock.fields, 'options')).toMatchObject({ minRows: 2, required: true })
    expect(named(textAnswerBlock.fields, 'maxLength')).toMatchObject({ min: 1, max: 10000, defaultValue: 2000, required: true })
    expect(named(textAnswerBlock.fields, 'placeholder').required).toBe(false)
    const groups = named(QuestionnairePage.fields, 'conditionGroups')
    expect(named(groups.fields, 'conditions')).toMatchObject({ minRows: 1, required: true })
    for (const fields of [QuestionnairePage.fields, groups.fields]) {
      expect(named(fields, 'match')).toMatchObject({ defaultValue: 'all', required: true })
    }
    const operator = named(named(groups.fields, 'conditions').fields, 'operator')
    expect(operator.options.map((option: any) => option.value)).toEqual(operators)
  })

  it('trims every authored text field and applies its length limit', () => {
    const questions = named(QuestionnairePage.fields, 'questions')
    const yesNo = flattened(yesNoAnswerBlock.fields)
    for (const [field, maxLength] of [
      [named(Questionnaires.fields, 'title'), 200],
      [named(QuestionnairePage.fields, 'blockName'), 120],
      [named(questions.fields, 'label'), 500],
      [named(questions.fields, 'name'), 64],
      [named(yesNo, 'yesLabel'), 200],
      [named(yesNo, 'noLabel'), 200],
      [named(named(choiceAnswerBlock.fields, 'options').fields, 'label'), 200],
      [named(textAnswerBlock.fields, 'placeholder'), 200],
    ]) {
      expect(field.maxLength).toBe(maxLength)
      expect(field.hooks.beforeValidate).toContain(trimText)
      expect(field.validate('x'.repeat(maxLength + 1), {})).toEqual(expect.any(String))
    }
  })

  it('keeps Yes / No labels in a row and generates hidden option ids', () => {
    expect(yesNoAnswerBlock.fields[0].type).toBe('row')
    const fields = flattened(yesNoAnswerBlock.fields)
    expect(named(fields, 'yesLabel').defaultValue).toBe('Yes')
    expect(named(fields, 'noLabel').defaultValue).toBe('No')
    const yes = named(fields, 'yesId')
    const no = named(fields, 'noId')
    expect(yes.admin.hidden).toBe(true)
    expect(no.admin.hidden).toBe(true)
    expect(yes.defaultValue()).not.toBe(no.defaultValue())
  })
})
