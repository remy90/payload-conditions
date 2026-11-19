# Payload conditions

A Payload CMS plugin for authoring page conditions based on answers to earlier questions. Answer types include boolean options, multiple choice and input text. Your frontend uses the saved conditions to decide which pages to show.

## Install

```sh
pnpm add @remy90/payload-conditions-plugin @remy90/payload-conditions-engine
```

Version 1.1.0 targets Payload 3.94. Install matching versions of `payload` and `@payloadcms/ui` (`^3.94.0`) in your app, with React 19 and a matching `react-dom`. Payload 3.94 supports React `~19.0.9 || ~19.1.10 || ~19.2.9 || ^19.3.1`.

Use a Next.js version supported by `@payloadcms/ui`. For Next 15.4, that means `>=15.4.11 <15.5.0`; Next 16 requires `>=16.4.5 <17.0.0`. The package follows Payload 3.94\'s Node support: `^22.23.5 || ^24.22.3 || >=26.13.1`.

## Configure

Add the plugin to the `plugins` array in your existing `payload.config.ts`:

```ts
import { payloadConditions } from '@remy90/payload-conditions-plugin'

// Keep your existing database adapter, collections and other config.
plugins: [
  payloadConditions(),
]
```

The plugin adds the `questionnaire` collection. It is enabled by default; pass `{ enabled: false }` to skip registration. It returns a new config object.

Generate Payload's admin import map after adding the plugin:

```sh
pnpm payload generate:importmap
```

Keep your app's `admin.importMap.baseDir` and generated import-map location configured as described in the Payload setup guide. Restart the app after generation.

## Preview

Pass Payload's collection admin settings through the plugin:

```ts
payloadConditions({
  preview: (doc) => `/q/${doc.id}?preview=1`,
  livePreview: {
    url: ({ data }) => `/q/${data.id}?preview=1`,
    breakpoints: [
      { name: 'mobile', label: 'Mobile', width: 375, height: 667 },
      { name: 'desktop', label: 'Desktop', width: 1440, height: 900 },
    ],
  },
})
```

Both options use Payload's `CollectionAdminOptions` types and merge into the `questionnaire` collection's admin settings. Omitting them keeps the default configuration. Your frontend handles the preview route, authenticates requests before loading drafts, and subscribes with `@payloadcms/live-preview-react` for unsaved edits.

## Author conditions

Create a questionnaire and add standard pages. Each page contains question-and-answer pairs, with an `optional` checkbox for each question. Multiple-choice answers have an `allowMultipleSelection` checkbox. Both default to false.

A page matches `all` or `any` of its condition groups. Each group matches `all` or `any` of its conditions. Only boolean and multiple-choice questions on earlier pages appear as sources. Boolean and single-select questions offer `is` and `isNot` (labelled “is not”). Multi-select questions offer `includes` and `excludes`.

Changing a condition's question clears its answer and clears an incompatible operator. Toggling multiple selection or changing an answer type maps equivalent operators: `is` ↔ `includes` and `isNot` ↔ `excludes`. The admin displays and saves that equivalent; the collection hook also maps operators on save. Boolean answers receive ids when their fields initialize, so you can select them before saving.

Publishing validates condition operators and requires an answer id from the selected question's current options. The collection allows drafts to skip field validation. A host collection with `drafts.validate: true` validates drafts too. After deleting an option, select another answer or remove its condition. The engine can treat a stale answer id under `isNot` or `excludes` as true, so data written outside the plugin needs the same validation.

If question ids repeat, the admin uses the first occurrence in document order for condition sources.

## Stored schema and engine

The plugin pairs with `@remy90/payload-conditions-engine` 1.0.1, which it also uses as a runtime dependency. The engine shares the stored types and operator definitions with the editor. Use its Payload adapter in your frontend:

```ts
import { fromPayloadQuestionnaire } from '@remy90/payload-conditions-engine/payload'
import { resolveVisibility } from '@remy90/payload-conditions-engine'

const questionnaire = fromPayloadQuestionnaire(document)
const { visiblePageIds, answers } = resolveVisibility(questionnaire, new Map())
```

The `questionnaire` collection stores `title` and `pages`, a blocks field with `standardPage` blocks. A page stores:

- `skippable`, default false, and `questionAnswerPair` rows with `id`, `question`, `optional` and exactly one block in `answer`.
- `match`, default `all`, and `conditionGroups` rows with `id`, their own `match` and `conditions`.

Each condition stores `{ id, questionId, operator, answerId }`; its references and operator are required. `questionId` is the question row id. `answerId` is a boolean `trueId`/`falseId` or a multiple-choice option row id. Boolean answers keep their `booleanOptions` group. Multiple-choice blocks store `multipleChoice: [{ id, option }]` (at least two rows) and `allowMultipleSelection`. Input-text blocks store `inputText` and remain available as questions.

## Exports and upgrading

The server entry point exports `payloadConditions`, `Questionnaire`, the `StandardPage` block and `normalizeBooleanIdsHook`. It re-exports the engine's stored types, including `StoredQuestionnaire` and `StoredStandardPage`. The names `StandardPage`, `BooleanOptions`, `MultipleChoice` and `InputText` remain as type aliases.

Use `StandardPage` in your own blocks field to reuse the editor. Page conditions work under nested field paths as well as `pages`. Add the collection hook when embedding the block elsewhere:

```ts
import type { CollectionConfig } from 'payload'
import { normalizeBooleanIdsHook, StandardPage } from '@remy90/payload-conditions-plugin'

export const Survey: CollectionConfig = {
  slug: 'surveys',
  hooks: {
    beforeChange: [normalizeBooleanIdsHook('surveyPages')],
  },
  fields: [
    { name: 'surveyPages', type: 'blocks', blocks: [StandardPage] },
  ],
}
```

`normalizeBooleanIdsHook(blocksField = 'pages')` returns a Payload `CollectionBeforeChangeHook`. Pass the top-level blocks field name. Each hook normalizes boolean ids within that field and updates matching `conditionGroups[].conditions[]` references anywhere in the document. It also maps equivalent operators to the referenced question's current answer settings. `Questionnaire` already includes the hook for `pages`. Standalone `StandardPage` blocks require this opt-in.

On save, missing or duplicate boolean ids receive fresh ids. A question row that held an id in the stored document keeps it after copies are reordered. When no stored holder remains, the first occurrence in document order keeps it. Conditions targeting a copied question row follow its regenerated answer ids. Restoring a version uses that version's data and document order without borrowing ids or ownership from the current document.

The `@remy90/payload-conditions-plugin/client` entry point exports the condition selects (`QuestionCondition`, `OperatorCondition`, `AnswerCondition`), `QuestionAnswerRowLabel` and `StandardPageRowLabel`. The plugin config already references these through Payload's import map.

Version 1.0.0 replaces `allOrAnyCondition` with `match`, and replaces `conditionalLogicGroup` with `conditionGroups[].conditions[]`. Conditions now use `questionId`, `operator` and `answerId`, with readable operator values. Version 0.2.2 never loaded, so there is no migration.

The alpha Payload API and the old `/types` subpath have been removed. Import types from the package root. This package ships ESM; use `import`.
