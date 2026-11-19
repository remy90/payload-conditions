# Changelog

## 1.0.1 (unreleased)

- Remove the Node engine restriction. The ES2022 build runs on modern runtimes, including Bun and Deno.
- Mark the package as side-effect-free for bundlers and exclude source and declaration maps from releases.
- Build and typecheck with TypeScript 7.1 beta using `7.1.0-beta || >=7.1.0-rc <8`. Widen the range to `^7.1.0` once 7.1 is stable. TypeScript is a development dependency only; consumers keep their own compiler version.
- Update the test runner to Vitest 5.

## 1.0.0

Initial release of `@remy90/payload-conditions-engine`, a framework-free questionnaire engine with zero runtime dependencies. Ships ESM and TypeScript declarations for Node 20 and later.

- Evaluate page visibility with two levels of `all`/`any` matching and the `is`, `isNot`, `includes` and `excludes` operators.
- Apply answers and clear answers on hidden pages before evaluating dependent pages.
- Navigate visible pages in questionnaire order.
- Validate required answers, option ids and selection counts.
- Convert stored Payload questionnaires through the `/payload` adapter and export the shared stored types.
- Cache indexes per immutable questionnaire identity. Duplicate question ids use the first occurrence in document order.
