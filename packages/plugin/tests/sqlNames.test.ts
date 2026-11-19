import type { Block, Field } from 'payload'
import { describe, expect, it } from 'vitest'
import { Questionnaires } from '../src/collections/Questionnaires.js'

const snake = (name: string) => name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
type Named = { dbName?: Block['dbName']; enumName?: Block['dbName'] }

// @payloadcms/drizzle 3.94.0: createTableName.js and schema/traverseFields.js.
// Blocks use the root table; arrays use their current table. Custom table names
// get another _..._v wrapper in versions. Enum overrides have no wrapper.
const generatedNames = (versions: boolean): string[] => {
  const root = versions ? `_${Questionnaires.slug}_v` : Questionnaires.slug
  const names = [root]
  const name = (
    config: Named,
    fallback: string,
    parent: string,
    target: keyof Named = 'dbName',
  ) => {
    const override = config[target] ?? (target === 'enumName' ? config.dbName : undefined)
    const result = typeof override === 'function' ? override({ tableName: parent }) : override
    return result ? (versions && target === 'dbName' ? `_${result}_v` : result) : fallback
  }
  const walk = (fields: Field[], table: string) => {
    for (const field of fields) {
      if (field.type === 'array') {
        const next = name(field, `${table}_${snake(field.name)}`, table)
        names.push(next)
        walk(field.fields, next)
      } else if (field.type === 'blocks') {
        for (const block of field.blocks) {
          if (typeof block === 'string') throw new Error('Expected inline block')
          const next = name(block, `${root}_blocks_${snake(block.slug)}`, root)
          names.push(next)
          walk(block.fields, next)
        }
      } else if (field.type === 'select' || field.type === 'radio') {
        names.push(name(field, `enum_${table}_${snake(field.name)}`, table, 'enumName'))
      } else if (field.type === 'group') {
        walk(field.fields, 'name' in field ? `${table}_${snake(field.name)}` : table)
      }
    }
  }
  // Payload's version fields wrap the collection fields in a version group.
  walk(Questionnaires.fields, versions ? `${root}_version` : root)
  return names
}

describe('SQL schema identifiers', () => {
  it('uses short names for the renamed questionnaire tables and enums', () => {
    expect(generatedNames(false)).toEqual(
      expect.arrayContaining([
        'questionnaires',
        'questionnaires_page',
        'questionnaires_page_q',
        'questionnaires_yn',
        'questionnaires_choice',
        'questionnaires_choice_opts',
        'questionnaires_text',
        'e_questionnaires_page_match',
        'e_questionnaires_page_cg_match',
        'e_questionnaires_page_cg_cond_op',
      ]),
    )
  })

  it.each([false, true])(
    'fits tables and enums within Postgres limits (versions: %s)',
    (versions) => {
      const names = generatedNames(versions)
      expect(names.length).toBeGreaterThan(10)
      expect(names.filter((name) => name.length > 63)).toEqual([])
      expect(new Set(names).size).toBe(names.length)
    },
  )
})
