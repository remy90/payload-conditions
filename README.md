# Payload conditions

A Payload CMS plugin for authoring page conditions based on answers to earlier questions. Answer types include boolean options, multiple choice and input text. Your frontend uses the saved conditions to decide which pages to show.

## Install

```sh
pnpm add @remy90/payload-conditions-plugin
```

Version 1.0.0 targets Payload 3.94. Install matching versions of `payload` and `@payloadcms/ui` (`^3.94.0`) in your app, with React 19 and a matching `react-dom`. Payload 3.94 supports React `~19.0.9 || ~19.1.10 || ~19.2.9 || ^19.3.1`.

Use a Next.js version supported by `@payloadcms/ui`. For Next 15.4, that means `>=15.4.11 <15.5.0`; Next 16 requires `>=16.4.5 <17.0.0`. The package requires Node `>=22.23.5`. Payload 3.94 supports Node `^22.23.5 || ^24.22.3 || >=26.13.1`.

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

## Author conditions

Create a questionnaire and add standard pages. Each page contains question-and-answer pairs. On a later page, choose a question from an earlier page, an operator and an answer. Select whether all or any conditions must match.

Changing a condition's question clears its answer. Boolean answers receive ids when their fields initialize, so you can select them before saving.

## Exports and upgrading

The server entry point exports `payloadConditions`, `Questionnaire` and the `StandardPage` block. It also exports the data types `StandardPage`, `BooleanOptions`, `MultipleChoice` and `InputText`.

Use `StandardPage` in your own blocks field to reuse the editor. Page conditions work under nested field paths as well as `pages`.

The `@remy90/payload-conditions-plugin/client` entry point exports `QuestionCondition`, `AnswerCondition` and `QuestionAnswerRowLabel`. The plugin config already references these through Payload's import map.

Version 1.0.0 replaces the alpha Payload API and removes the old `/types` subpath. Import types from the package root. This package ships ESM; use `import`. Existing field names, slugs and stored document shapes stay the same.
