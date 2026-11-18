# Changelog

## 1.0.0

### Breaking changes

- Require Payload and `@payloadcms/ui` `^3.94.0`, React 19 and Node `>=22.23.5`. Payload and React are peer dependencies.
- Split server exports from the `/client` components. Regenerate the Payload admin import map after upgrading.
- Remove the `/types` subpath. Import data types from the package root. The package ships ESM.

### Fixes

- Build explicit `.js` imports so Node can load the server entry point.
- Use Payload 3.94 field props and import-map references for admin components. Handle empty question rows in labels.
- Derive question and answer options from current form state. Restrict questions to earlier pages and clear the answer when a condition's question changes.
- Create boolean answer ids through field defaults, retain the validation fallback for legacy documents and require both ids.
- Keep incoming plugin config unchanged and document that the plugin is enabled by default.
- Replace the alpha demo submodule and app-specific tooling with a library build and tests for option generation.

Field names, slugs and stored document shapes are unchanged.
