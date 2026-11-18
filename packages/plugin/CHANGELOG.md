# Changelog

## 1.0.0

### Schema and engine

- Pair with `@remy90/payload-conditions-engine` 1.0.0 through a runtime dependency. Import shared operators and match modes from the engine and re-export its stored types.
- Replace `allOrAnyCondition` with `match`. Replace `conditionalLogicGroup` with `conditionGroups`, each with its own `match` and `conditions` array. Both match fields default to `all`.
- Store required condition fields as `questionId`, `operator` and `answerId`. Operators are `is`, `isNot`, `includes` and `excludes`.
- Give SQL arrays, blocks and selects short database names, including version tables and enums. Stored document keys stay unchanged.
- Add `optional` to question rows and `allowMultipleSelection` to multiple-choice answer blocks. Both default to false.

Version 0.2.2 never loaded, so there is no migration.

### Payload support

- Require Payload and `@payloadcms/ui` `^3.94.0`, React 19 and Node `>=22.23.5`. Payload and React are peer dependencies.
- Split server exports from the `/client` components. Regenerate the Payload admin import map after upgrading.
- Remove the `/types` subpath. Import stored types from the package root. The package ships ESM with explicit `.js` imports.
- Move boolean-id normalization to a collection `beforeChange` hook. Collections embedding `StandardPage` must add `normalizeBooleanIdsHook()` and pass their top-level blocks field name when it differs from `pages`. `Questionnaire` includes the hook.

### Editor and saves

- Offer earlier boolean and multiple-choice questions as condition sources. Derive operator choices with the engine's `operatorsFor`; validate incompatible stored operators on the server. Input text remains available as a question type.
- Map `is`/`includes` and `isNot`/`excludes` when answer settings change. The admin displays and saves the equivalent operator; the collection hook applies the same mapping alongside boolean-id normalization.
- Validate condition answer ids against the selected question's current options. Payload skips field validation on drafts with the collection's default settings.
- Clear the answer when a condition's question changes, retaining compatible operators. Apply field changes together so Payload can preserve them through autosave.
- Share one form-state index across condition selects per snapshot, with direct path lookups and cached question options for each page.
- Share one source-question index across server field validators per document in the request context.
- Create boolean answer ids through field defaults and regenerate missing or duplicate ids on save. Keep stored ownership when copies are reordered. Conditions under `conditionGroups[].conditions[]` follow regenerated ids throughout the document. No-op saves return the same data reference; rewrites preserve untouched branches.
- Normalize restored versions using their own data and document order.
- Keep incoming plugin config unchanged and enable the plugin by default.
- Replace the alpha demo submodule and app-specific tooling with workspace packages and tests.

### Known limitations

- Deleting a source question or moving it to the same or a later page leaves its condition references in storage. Operator validation rejects the reference on a validated save. Payload can save drafts without field validation; the engine treats invalid conditions as false.
- The engine treats a stale `answerId` under `isNot` or `excludes` as true when the question has a non-empty answer that lacks that id. Saving through the plugin validates current option ids and blocks publishing stale references. Data edited through other means needs the same care; editors must select another answer or remove the condition.
