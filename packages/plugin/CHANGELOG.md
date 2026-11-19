# Changelog

## 0.3.0

This entry covers changes since 0.2.2. Version 1.0.0 was published briefly and withdrawn.
The schema changes without a data migration.

### Schema and API

- Add `questionnairePlugin`, built with Payload's `definePlugin` and slug `questionnaire`. It accepts `enabled`, `preview` and `livePreview`; disabled plugins leave the host config unchanged.
- Export the `Questionnaires` collection with slug `questionnaires`, the `QuestionnairePage` block and `questionnaireBeforeChange(blocksField = 'pages')`. Collections embedding the page block can install this hook with their own top-level blocks field name.
- Use block slugs `page`, `yesNo`, `choice` and `text`. Generated block interfaces are `QuestionnairePage`, `YesNoAnswer`, `ChoiceAnswer` and `TextAnswer`.
- Store question rows under `questions`, with `name`, `label`, `required` and one `answer` block. Questions are required by default. Choice answers use `hasMany` and `options: { id, label }[]`. Yes / No answers have flat `yesLabel`, `yesId`, `noLabel` and `noId` fields. Text answers have an optional `placeholder` and a `maxLength` of 2000 by default.
- Store visibility rules under `conditionGroups`, with `match` on pages and groups. Both default to `all`. Conditions use `questionId`, `operator` and `answerId`.
- Use Payload operator names `equals`, `not_equals`, `in` and `not_in`. The editor labels remain “is”, “is not”, “includes” and “excludes”. Equivalent operators map when selection settings change.
- Keep database table and enum names short, including names for version tables.
- Depend on engine `^0.3.0` through `workspace:^` and re-export its stored types. Remove `payloadConditions`, `normalizeBooleanIdsHook` and the `/types` subpath.

### Validation and saves

- Trim authored text before validation. Apply length limits to titles, question labels, names, option labels and placeholders. Require a page, a question per page, a condition per group and two options per choice answer.
- Generate missing question names from their labels in snake_case. Add numeric suffixes for uniqueness, validate the name format and enforce uniqueness across the questionnaire.
- Require distinct option labels after trimming and ignoring case. Yes and No labels must differ. Limit Free text `maxLength` to a number from 1 to 10000.
- Normalize missing and duplicate Yes / No answer ids while preserving stored ownership across reordered copies. Update condition references throughout the document. Restored versions use their own id ownership.
- Run the engine's structural checks when publishing, saving a collection without drafts or enabling `drafts.validate`. Report issues through Payload's inline field errors. Field validation remains skipped for ordinary drafts.
- Validate selected operators and current answer options on the server. Offer earlier Yes / No and choice questions as condition sources. Changing the source clears its selected answer and keeps compatible operators.
- Share a form-state index between condition selects and cache source questions per request for server field validation. Unchanged normalization preserves object references.

### Admin and packaging

- Put authored admin labels and validation messages under the `plugin-questionnaire` translation namespace, with English defaults. Host overrides use Payload's `i18n.translations`.
- Keep Pages, Questions, Yes / No, Multiple choice and Free text as editor labels. Pages have numbered headers, editable titles and reactive counts. Page headers honour `admin.disableBlockName`, including referenced blocks.
- Rename client exports `StandardPageRowLabel` to `QuestionnairePageRowLabel` and `QuestionAnswerRowLabel` to `QuestionRowLabel`. Regenerate the admin import map after upgrading.
- Split server exports from `/client`. Ship side-effect-free ESM and declarations without source maps. Guard the client bundle against Payload server imports.
- Require Payload and `@payloadcms/ui` `^3.94.0` with React 19. Match Payload's Node support: `^22.23.5 || ^24.22.3 || >=26.13.1`. Workspace development uses Node 26.13.1 and TypeScript 7.1 beta.
- Remove SWC, rimraf and the unused React DOM dependency. Move development and tests into the pnpm workspace.
