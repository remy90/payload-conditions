import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { operators, questionnaireIssueCodes } from '@remy90/payload-conditions-engine'
import { Questionnaires } from '../src/index.js'
import { en } from '../src/translations/languages/en.js'
import { translate } from '../src/translations/index.js'

const root = fileURLToPath(new URL('../src/', import.meta.url))
const sourceFiles = (path: string): string[] =>
  readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sourceFiles(`${path}/${entry.name}`)
      : /\.tsx?$/.test(entry.name)
        ? [`${path}/${entry.name}`]
        : [],
  )

const translationKeysIn = (source: string): string[] =>
  [
    ...source.matchAll(
      /(?:label\(\s*|translate\([^,]+,\s*)('[^']+'|[^?,()]+\?\s*'[^']+'\s*:\s*'[^']+')/g,
    ),
  ].flatMap((match) => [...match[1].matchAll(/'([^']+)'/g)].map((key) => key[1]))

it('scans both branches of conditional translation keys', () => {
  expect(
    translationKeysIn("translate({ t }, count === 1 ? 'single' : 'plural', { count })"),
  ).toEqual(['single', 'plural'])
})

it('resolves every translation key used by schema callbacks and source code', () => {
  const keys = new Set<string>()
  const check = (key: string) => {
    expect(key.startsWith('plugin-questionnaire:')).toBe(true)
    const name = key.split(':')[1]
    const names = name in en['plugin-questionnaire'] ? [name] : [`${name}_one`, `${name}_other`]
    for (const englishKey of names) {
      expect(en['plugin-questionnaire']).toHaveProperty(englishKey)
      keys.add(englishKey)
    }
    return key
  }
  const walk = (value: unknown, name = '') => {
    if (
      typeof value === 'function' &&
      ['label', 'description', 'singular', 'plural'].includes(name)
    ) {
      value({ t: check })
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) walk(child, key)
    }
  }
  walk(Questionnaires)
  const sourceKeys = new Set<string>()
  for (const file of sourceFiles(root).filter((file) => !file.includes('/translations/languages/'))) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(/\b([a-zA-Z_]+)\b/g)) sourceKeys.add(match[1])
    expect(source, file).not.toMatch(/placeholder="[^"]+"/)
    for (const key of translationKeysIn(source)) check(`plugin-questionnaire:${key}`)
    for (const match of source.matchAll(/plugin-questionnaire:([a-zA-Z_]+)/g)) check(match[0])
  }
  for (const key of operators) check(`plugin-questionnaire:${key}`)
  for (const key of questionnaireIssueCodes.filter(
    (key) => !['noPages', 'emptyPage', 'emptyGroup', 'blankText'].includes(key),
  ))
    check(`plugin-questionnaire:${key}`)
  expect([...keys]).toEqual(
    expect.arrayContaining([
      'questionCount_one',
      'questionCount_other',
      'groupCount_one',
      'groupCount_other',
    ]),
  )
  for (const key of Object.keys(en['plugin-questionnaire'])) expect(sourceKeys.has(key), key).toBe(true)
  expect(keys.size).toBeGreaterThan(50)
})

it.each([
  [0, '0 questions', '0 condition groups'],
  [1, '1 question', '1 condition group'],
  [2, '2 questions', '2 condition groups'],
])('pluralises English count labels for %i rows', (count, questions, groups) => {
  expect(translate({}, 'questionCount', { count })).toBe(questions)
  expect(translate({}, 'groupCount', { count })).toBe(groups)
})

it('uses the host translator for validation messages and interpolation', () => {
  const calls: unknown[] = []
  const t = (key: string, options?: Record<string, unknown>) => {
    calls.push([key, options])
    return 'Translated'
  }
  expect(translate({ req: { t } }, 'tooLong', { max: 64 })).toBe('Translated')
  expect(translate({ t }, 'questionCount', { count: 1 })).toBe('Translated')
  expect(translate({ t }, 'groupCount', { count: 2 })).toBe('Translated')
  expect(calls).toEqual([
    ['plugin-questionnaire:tooLong', { max: 64 }],
    ['plugin-questionnaire:questionCount_one', undefined],
    ['plugin-questionnaire:questionCount', { count: 1 }],
    ['plugin-questionnaire:groupCount_other', undefined],
    ['plugin-questionnaire:groupCount', { count: 2 }],
  ])
})
