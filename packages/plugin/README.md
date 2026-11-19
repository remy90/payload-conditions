# Payload questionnaire plugin

Author questionnaires in Payload with Yes / No, multiple-choice and Free text answers. Pages can depend on answers from earlier pages. Version 0.3.0 uses the matching conditions engine.

## Install

```sh
pnpm add @remy90/payload-conditions-plugin@^0.3.0 @remy90/payload-conditions-engine@^0.3.0
```

Use Payload and `@payloadcms/ui` 3.94 with React 19 and matching `react-dom`. Payload 3.94 supports React `~19.0.9 || ~19.1.10 || ~19.2.9 || ^19.3.1`. Next 15.4 requires `>=15.4.11 <15.5.0`; Next 16 requires `>=16.4.5 <17.0.0`. Supported Node versions are `^22.23.5 || ^24.22.3 || >=26.13.1`.

## Configure

```ts
import { questionnairePlugin } from '@remy90/payload-conditions-plugin'

// Add to your existing Payload config:
plugins: [questionnairePlugin()]
```

The plugin registers the `questionnaires` collection with drafts enabled. Pass `{ enabled: false }` to skip registration. It uses Payload's `definePlugin` with slug `questionnaire`.

Generate the admin import map and document types after configuration:

```sh
pnpm payload generate:importmap
pnpm payload generate:types
```

Keep `admin.importMap.baseDir` and your import-map location configured for your app. Restart after generating the map.

### Preview

```ts
questionnairePlugin({
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

`preview` and `livePreview` use Payload's `CollectionAdminOptions` types. Your frontend authenticates draft access and subscribes through `@payloadcms/live-preview-react` for unsaved edits.

## Authoring and stored schema

`questionnaires` stores `title` and a `pages` blocks field. Each `page` block stores `{ id, blockName, skippable, questions, match, conditionGroups }`. Page titles are edited in their draggable headers. The label respects the block's `admin.disableBlockName` setting.

Questions store `{ id, name, label, required, answer }`. `required` defaults to true. Blank names fill from the question label in snake_case, with `_2`, `_3` suffixes to avoid collisions. Names are unique within the questionnaire and match `^[a-z][a-z0-9_]*$`. Conditions reference question row ids, so changing a name keeps those references intact.

`answer` contains exactly one answer block:

| Block | Fields |
| --- | --- |
| `yesNo` | `yesId`, `yesLabel`, `noId`, `noLabel` |
| `choice` | `hasMany` (default false), `options: [{ id, label }]` |
| `text` | `placeholder`, `maxLength` (default 2000) |

Answer blocks also have row ids. Generated interfaces are `QuestionnairePage`, `YesNoAnswer`, `ChoiceAnswer` and `TextAnswer`.

A page's `match` combines `conditionGroups`. Each group has `{ id, match, conditions }`; each condition has `{ id, questionId, operator, answerId }`. Both match modes default to `all`; `any` accepts one matching child. **Show this page when** controls the page mode. **This group matches when** controls its group.

Only Yes / No and choice questions on earlier pages can be sources. Single-select sources offer `equals` (is) and `not_equals` (is not). Sources with `hasMany: true` offer `in` (includes) and `not_in` (excludes). Changing a condition's question clears its answer. Changing selection mode maps equivalent operators: `equals` ↔ `in` and `not_equals` ↔ `not_in`.

Yes / No ids initialize in the editor. The collection hook repairs missing or duplicate option ids and updates matching references. Existing ownership follows the stored question id when copies are reordered. Restoring a version uses that version's data and order.

## Validation

Required text is trimmed. Inline validators check fields when publishing. The limits in characters are:

| Field | Maximum |
| --- | --- |
| Questionnaire title | 200 |
| Question label | 500 |
| Option, Yes and No labels | 200 |
| Placeholder | 200 |
| Question name | 64 |
| Page title | 120 |

Choice option labels must be unique within a question, and Yes and No labels must differ. Free text `maxLength` is an integer from 1 to 10000. Pages and questions need at least one row; condition groups need at least one condition, and choices need at least two options.

`questionnaireBeforeChange()` fills names and normalizes ids and operators before running the engine's `checkQuestionnaire` on publish. It throws Payload `ValidationError` with field paths, so structural errors appear beside their fields. Draft saves skip validation. A collection without drafts validates every save; `versions.drafts.validate: true` also validates drafts. An update to a published questionnaire with unchanged pages and status skips the structural check, so title-only updates succeed.

Structural issue codes are `noPages`, `emptyPage`, `emptyGroup`, `duplicateId`, `duplicateName`, `invalidName`, `blankText`, `duplicateOptionLabel`, `unknownQuestion`, `samePageQuestion`, `laterQuestion`, `unsupportedSource`, `unknownAnswer`, `operatorMismatch`, `contradiction` and `unreachablePage`. Field validators handle missing rows, text and names. Structural errors cover references, incompatible operators and impossible page logic.

`versions.drafts.localizeStatus` is unsupported in 0.3. The publish gate skips collections using it.

## Compose your own collection

```ts
import type { CollectionConfig } from 'payload'
import { QuestionnairePage, questionnaireBeforeChange } from '@remy90/payload-conditions-plugin'

export const Surveys: CollectionConfig = {
  slug: 'surveys',
  versions: { drafts: true },
  hooks: { beforeChange: [questionnaireBeforeChange('surveyPages')] },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'surveyPages', type: 'blocks', blocks: [QuestionnairePage], required: true, minRows: 1 },
  ],
}
```

Pass the top-level blocks field name to `questionnaireBeforeChange(blocksField = 'pages')`. The hook handles empty names as well as ids and validation. `Questionnaires` already includes it for `pages`. Generate the import map for host-composed collections too.

### Translations

The plugin merges English strings under `plugin-questionnaire` into `config.i18n.translations` for configured languages. A host-composed collection gets English through the built-in fallback even when `questionnairePlugin()` is absent. Override individual strings in Payload's config:

```ts
i18n: {
  translations: {
    en: {
      'plugin-questionnaire': {
        questions: 'Prompts',
        requiredText: 'Enter a value for this prompt.',
      },
    },
  },
}
```

Version 0.3 ships English only. Supply overrides under each language key you use.

## Frontend and API

```ts
import { fromPayloadQuestionnaire } from '@remy90/payload-conditions-engine/payload'
import { resolveVisibility, validateAnswers } from '@remy90/payload-conditions-engine'

const questionnaire = fromPayloadQuestionnaire(document)
const { visiblePageIds, answers } = resolveVisibility(questionnaire, new Map())
const issues = validateAnswers(questionnaire, answers)
```

The engine exports `operatorsFor`, `checkQuestionnaire`, `validatePageAnswers`, `validateAnswers`, `resolveVisibility`, `evaluatePage`, `applyAnswer`, `nextPageId` and `previousPageId`, with domain types. Answers use `ReadonlyMap<string, readonly string[]>`; Free text uses a single string. Visibility clears hidden answers in page order. Drop empty-array answers before calling `validateAnswers`. Respondent issue codes are `required`, `unknownOption`, `tooManySelections`, `tooLong`, `unknownQuestion` and `hiddenQuestion`. See the engine README for signatures and semantics.

The server entry exports `questionnairePlugin`, type `QuestionnairePluginOptions`, collection `Questionnaires`, block `QuestionnairePage`, hook factory `questionnaireBeforeChange`, and the engine's `Stored*` types.

`@remy90/payload-conditions-plugin/client` exports `QuestionCondition`, `OperatorCondition`, `AnswerCondition`, `QuestionnairePageRowLabel` and `QuestionRowLabel`. The block registers these components through Payload's import map.

## Upgrading to 0.3

Use `questionnairePlugin` in place of `payloadConditions`. The collection is `questionnaires`, the page block is `page`, and questions live in `questions`. Answer blocks are `yesNo`, `choice` and `text`. Questions use `name`, `label` and `required`; choices use `hasMany` and `options`. Operators are `equals`, `not_equals`, `in`, `not_in`.

Compose collections with `QuestionnairePage` and `questionnaireBeforeChange()`. The old `normalizeBooleanIdsHook` is removed. Stored answer types are `StoredYesNo`, `StoredChoice` and `StoredText`. Import types from the package root or the engine's `/payload` entry. There is no data migration. The briefly published 1.0.0 plugin release was withdrawn.
