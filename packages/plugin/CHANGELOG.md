# Changelog

## 1.0.0

### Breaking changes

- Require Payload and `@payloadcms/ui` `^3.94.0`, React 19 and Node `>=22.23.5`. Payload and React are peer dependencies.
- Split server exports from the `/client` components. Regenerate the Payload admin import map after upgrading.
- Remove the `/types` subpath. Import data types from the package root. The package ships ESM.
- Move boolean-id normalization from `StandardPage` to a collection `beforeChange` hook. Collections embedding the block must add `normalizeBooleanIdsHook()` from the server entry point. Pass a top-level blocks field name when it differs from the default `pages`; `Questionnaire` includes the hook.

### Fixes

- Build explicit `.js` imports so Node can load the server entry point.
- Use Payload 3.94 field props and import-map references for admin components. Handle empty question rows in labels.
- Derive question and answer options from current form state. Restrict questions to earlier pages and clear the answer when a condition's question changes.
- Create boolean answer ids through field defaults, retain the validation fallback for legacy documents and require both ids. The collection hook regenerates missing or duplicate boolean ids on save. Stored ownership follows the question-row id when copies are reordered, including duplicated pages. Document order decides which occurrence keeps an id when its stored holder is absent.
- Rewrite matching `conditionalLogicGroup` references throughout the document when a copied question receives new boolean ids. Keep the input unchanged.
- Normalize restored versions using their own data and document order, without borrowing ids or ownership from the current document.
- Pass disabled state, descriptions and localization to both condition selects.
- Keep incoming plugin config unchanged and document that the plugin is enabled by default.
- Replace the alpha demo submodule and app-specific tooling with a library build and tests for option generation.

Field names, slugs and stored document shapes are unchanged.

### Known limitations

- Payload runs function defaults during `afterRead` when the stored value is `undefined`. A legacy MongoDB document saved before 1.0.0 without boolean ids receives new random ids on every read until it is saved again. Re-save old questionnaires once after upgrading. SQL adapters return `null` and are unaffected.
- Deleting a condition's referenced question, or reordering pages so that question is no longer on an earlier page, leaves the stored `questionValue` and `answerValue` in place. The select shows the raw id until an editor clears it.
