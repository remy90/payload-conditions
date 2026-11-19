# Payload conditions engine

Evaluate questionnaire conditions and validate respondent answers. Version 0.3.0 ships ESM and has no Payload or React runtime dependency.

## Install

```sh
pnpm add @remy90/payload-conditions-engine@^0.3.0
```

Use the matching `@remy90/payload-conditions-plugin@^0.3.0` to author questionnaires in Payload:

```ts
import { questionnairePlugin } from '@remy90/payload-conditions-plugin'

// In your Payload config:
plugins: [questionnairePlugin()]
```

## Load a stored questionnaire

```ts
import { fromPayloadQuestionnaire } from '@remy90/payload-conditions-engine/payload'
import { applyAnswer, resolveVisibility, validateAnswers } from '@remy90/payload-conditions-engine'

const questionnaire = fromPayloadQuestionnaire(document)
const initial = resolveVisibility(questionnaire, new Map())
const next = applyAnswer(questionnaire, initial.answers, 'travel', ['plane'])
const issues = validateAnswers(questionnaire, next.answers)
```

The plugin stores documents in `questionnaires`. `pages` contains `page` blocks with `id`, `blockName`, `skippable`, `questions`, `match` and `conditionGroups`. Each question has `{ id, name, label, required, answer }`. `required` defaults to true. The `answer` blocks field contains exactly one supported block:

| `blockType` | Stored fields |
| --- | --- |
| `yesNo` | `id`, `yesId`, `yesLabel`, `noId`, `noLabel` |
| `choice` | `id`, `hasMany` (default false), `options: [{ id, label }]` |
| `text` | `id`, `placeholder`, `maxLength` (default 2000) |

A condition group stores `{ id, match, conditions }`. Conditions store `{ id, questionId, operator, answerId }`. References use row ids and Yes / No option ids. A question's `name` is a stable key for consumers; conditions reference its `id`.

The adapter returns `{ id, title, pages }`. Domain pages use `title` for `blockName`. Domain answers use `{ type: 'yesNo', yes, no }`, `{ type: 'choice', hasMany, options }` or `{ type: 'text', placeholder?, maxLength }`; each option is `{ id, label }`.

Stored fields accept null and missing values. Numeric ids become strings. The adapter skips unknown blocks and rows without ids. Questions use their first supported answer block; Yes / No needs both option ids. Id-bearing incomplete conditions remain as failing conditions. Empty condition groups are omitted. Missing match modes default to `all`, `required` to true, and `skippable` and `hasMany` to false. A missing questionnaire id becomes an empty string.

## Conditions

`operators` is `['equals', 'not_equals', 'in', 'not_in']`; `matchModes` is `['all', 'any']`.

| Operator | Editor label | Sources |
| --- | --- | --- |
| `equals` | is | Yes / No, single choice |
| `not_equals` | is not | Yes / No, single choice |
| `in` | includes | Multiple choice with `hasMany: true` |
| `not_in` | excludes | Multiple choice with `hasMany: true` |

`operatorsFor(answer)` returns the supported operators. Free text cannot control visibility. Conditions require a question on an earlier page. Missing answers fail every operator, including negative operators. `equals` and `not_equals` require exactly one value. A negative operator can match a stale option id, so check definitions before accepting externally authored data.

A group's `match` combines conditions. A page's `match` combines groups. Empty groups are ignored during evaluation, and a page with no remaining groups is visible. An unknown page id evaluates false.

## API

All functions preserve their inputs. `Answers` is `ReadonlyMap<string, readonly string[]>`; text uses one string value. Keep questionnaire definitions immutable. The engine caches its index by questionnaire identity.

- `checkQuestionnaire(questionnaire): QuestionnaireIssue[]` checks a definition before publishing.
- `evaluatePage(questionnaire, pageId, answers): boolean` evaluates a page directly against the supplied answers.
- `resolveVisibility(questionnaire, answers)` returns `{ visiblePageIds, answers }`. It walks pages in order and clears hidden answers before evaluating later dependencies. It preserves the answer map reference when nothing is cleared.
- `applyAnswer(questionnaire, answers, questionId, values)` copies values, updates the answer and resolves visibility. Empty values delete an answer. Unknown question ids are ignored.
- `nextPageId(questionnaire, visiblePageIds, currentPageId?)` returns the next visible id. Omit the current id to start at the first visible page.
- `previousPageId(questionnaire, visiblePageIds, currentPageId?)` returns the preceding visible id. Navigation returns `undefined` at an edge; a hidden current page uses its position in the definition.
- `validatePageAnswers(questionnaire, pageId, answers): AnswerIssue[]` validates a page, including a hidden page if requested. An unknown page returns no issues.
- `validateAnswers(questionnaire, answers): AnswerIssue[]` validates every visible page and reports submitted answers for unknown or hidden questions. Drop empty-array entries before calling it. Issues for visible questions include `pageId`.

`AnswerIssue.issue` is `required`, `unknownOption`, `tooManySelections`, `tooLong`, `unknownQuestion` or `hiddenQuestion`. Required answers need trimmed, nonempty content. `required: false` and `skippable: true` suppress the required check. Choice ids must exist and single-choice answers accept at most one value. Text values longer than `maxLength` report `tooLong`; callers retain control over trimming stored responses. A question can produce several issues.

The root exports the types `Questionnaire`, `Page`, `Question`, `Answer`, `Option`, `Condition`, `ConditionGroup`, `Operator`, `Match`, `Answers`, `AnswerIssue`, `QuestionnaireIssue` and `QuestionnaireIssueCode`, plus `questionnaireIssueCodes`.

The `/payload` entry exports `fromPayloadQuestionnaire` and `StoredQuestionnaire`, `StoredPage`, `StoredQuestion`, `StoredAnswer`, `StoredYesNo`, `StoredChoice`, `StoredText`, `StoredOption`, `StoredConditionGroup`, `StoredCondition`, `StoredUnknownBlock` and `StoredId`.

## Definition validation

`QuestionnaireIssue` contains `code` and `message`, with row ids such as `pageId`, `questionId`, `optionId`, `groupId` and `conditionId` where available. The codes are:

| Codes | Meaning |
| --- | --- |
| `noPages`, `emptyPage`, `emptyGroup` | Missing required rows |
| `duplicateId`, `duplicateName`, `invalidName` | Invalid identity or question name |
| `blankText`, `duplicateOptionLabel` | Blank labels or repeated option labels |
| `unknownQuestion`, `samePageQuestion`, `laterQuestion`, `unsupportedSource` | Invalid condition source |
| `unknownAnswer`, `operatorMismatch` | Invalid answer reference or operator |
| `contradiction`, `unreachablePage` | Conditions cannot match, or a page cannot become visible |

Names match `^[a-z][a-z0-9_]*$` and must be unique across the questionnaire. Option labels must be unique within a question; Yes and No labels must differ. The plugin also enforces field limits: title 200, question label 500, option labels 200, placeholder 200, name 64 and page title 120 characters. Free text `maxLength` must be an integer from 1 to 10000. Collections require pages and questions; groups require conditions, and choices require at least two options. See the plugin README for Payload's draft and publish gates.

## Upgrading to 0.3

Use collection `questionnaires`, block `page`, array `questions` and answer blocks `yesNo`, `choice`, `text`. Operators are `equals`, `not_equals`, `in`, `not_in`. Replace old `question`/`optional` fields with `label`/`required`, add question names, and replace `allowMultipleSelection` with `hasMany`. There is no data migration. The briefly published 1.0.0 engine release is deprecated; use 0.3.0.
