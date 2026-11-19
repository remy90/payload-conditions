# Changelog

## 0.3.0

Version 1.0.0 was published briefly and withdrawn. That npm release is deprecated; use 0.3.0 or later.

- Adopt the 0.3 questionnaire schema: questions have submission names, labels and required flags. Answers use `yesNo`, `choice` and `text`, with text placeholders and length limits. Pages can have titles.
- Rename the operators to `equals`, `not_equals`, `in` and `not_in`. `operatorsFor` lists the operators each answer supports. Empty answers keep negative conditions false.
- Update the `./payload` adapter and its exported stored types for the new block slugs and fields. Preserve condition and group ids, and map page titles from `blockName`.
- Add `checkQuestionnaire`, `QuestionnaireIssue` and the `questionnaireIssueCodes` const array. Check structure, names, ids and labels, validate condition references and operators, detect contradictions, and flag pages that a conservative forward pass proves unreachable.
- Add `validateAnswers` to validate visible pages and report answers for hidden or unknown questions. Page validation trims text for required checks and reports `tooLong` when text exceeds its limit.
- Evaluate visibility with two levels of `all`/`any` matching. Applying answers clears hidden-page answers before evaluating dependent pages; navigation follows the visible pages in document order.
- Keep evaluation tolerant of repeated ids by using the first occurrence. Cache indexes per immutable questionnaire identity.
- Remove the Node engine restriction. The ES2022 build runs on modern runtimes, including Bun and Deno, with zero runtime dependencies.
- Mark the package as side-effect-free for bundlers and exclude source and declaration maps from releases.
- Build and typecheck with TypeScript 7.1 beta using `7.1.0-beta || >=7.1.0-rc <8`. Widen the range to `^7.1.0` once 7.1 is stable. TypeScript is a development dependency only; consumers keep their own compiler version.
- Update the test runner to Vitest 5.
