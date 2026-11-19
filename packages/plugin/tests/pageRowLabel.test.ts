import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import type { FormState } from 'payload'
import { beforeEach, expect, it, vi } from 'vitest'
import { QuestionnairePageRowLabel } from '../src/blocks/QuestionnairePageRowLabel.js'
import { translate, type TranslationKey } from '../src/translations/index.js'

const state = vi.hoisted(() => ({ fields: {} as FormState }))
vi.mock('@payloadcms/ui', () => ({
  SectionTitle: () => null,
  useConfig: () => ({ config: { blocksMap: {} } }),
  useRowLabel: () => ({ path: 'survey.1', rowNumber: 1, data: { blockType: 'page' } }),
  useFormFields: (selector: (args: [FormState]) => unknown) => selector([state.fields]),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      translate({}, key.split(':')[1] as TranslationKey, options),
  }),
}))

const elements = (node: ReactNode): ReactElement<Record<string, unknown>>[] =>
  Children.toArray(node).flatMap((child) =>
    isValidElement<Record<string, unknown>>(child)
      ? [child, ...elements(child.props.children as ReactNode)]
      : [],
  )
const props: Parameters<typeof QuestionnairePageRowLabel>[0] = {
  blockType: 'page',
  rowLabel: 'Page',
  rowNumber: 1,
  field: { name: 'survey', blocks: [{ slug: 'page', fields: [] }] },
}

beforeEach(() => {
  state.fields = {}
})

it('renders the current page title error beside its title control', () => {
  state.fields['survey.1.blockName'] = { value: 'Long title', errorMessage: 'Title is too long.' }
  state.fields['survey.0.blockName'] = { value: '', errorMessage: 'Another page error.' }
  const output = elements(QuestionnairePageRowLabel(props))
  expect(output.find((element) => element.props.role === 'alert')?.props.children).toBe(
    'Title is too long.',
  )
})

it('omits the title error when the field is valid or block names are disabled', () => {
  expect(
    elements(QuestionnairePageRowLabel(props)).some((element) => element.props.role === 'alert'),
  ).toBe(false)
  state.fields['survey.1.blockName'] = { value: 'Long title', errorMessage: 'Title is too long.' }
  const disabled: typeof props = {
    ...props,
    field: { name: 'survey', blocks: [{ slug: 'page', fields: [], admin: { disableBlockName: true } }] },
  }
  expect(
    elements(QuestionnairePageRowLabel(disabled)).some((element) => element.props.role === 'alert'),
  ).toBe(false)
})
