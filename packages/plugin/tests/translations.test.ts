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

it('resolves every translation key used by schema callbacks and source code', () => {
  const keys = new Set<string>()
  const check = (key: string) => {
    expect(key.startsWith('plugin-questionnaire:')).toBe(true)
    const name = key.split(':')[1]
    expect(en['plugin-questionnaire']).toHaveProperty(name)
    keys.add(name)
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
  const literals = new Set<string>()
  for (const file of sourceFiles(root).filter((file) => !file.includes('/translations/languages/'))) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(/\b([a-zA-Z_]+)\b/g)) literals.add(match[1])
    expect(source, file).not.toMatch(/placeholder="[^"]+"/)
    for (const match of source.matchAll(
      /(?:label\(\s*|translate\([^,]+,\s*)('[^']+'|[^?,()]+\?\s*'[^']+'\s*:\s*'[^']+')/g,
    )) {
      for (const key of match[1].matchAll(/'([^']+)'/g)) check(`plugin-questionnaire:${key[1]}`)
    }
    for (const match of source.matchAll(/plugin-questionnaire:([a-zA-Z_]+)/g)) check(match[0])
  }
  for (const key of operators) check(`plugin-questionnaire:${key}`)
  for (const key of questionnaireIssueCodes.filter(
    (key) => !['noPages', 'emptyPage', 'emptyGroup', 'blankText'].includes(key),
  ))
    check(`plugin-questionnaire:${key}`)
  expect([...keys]).toEqual(
    expect.arrayContaining(['questionCountSingle', 'questionCount', 'groupCountSingle', 'groupCount']),
  )
  for (const key of Object.keys(en['plugin-questionnaire'])) expect(literals.has(key), key).toBe(true)
  expect(keys.size).toBeGreaterThan(50)
})

it('uses the host translator for validation messages and interpolation', () => {
  const calls: unknown[] = []
  const t = (key: string, options?: Record<string, unknown>) => {
    calls.push([key, options])
    return 'Translated'
  }
  expect(translate({ req: { t } }, 'tooLong', { max: 64 })).toBe('Translated')
  expect(calls).toEqual([['plugin-questionnaire:tooLong', { max: 64 }]])
})
