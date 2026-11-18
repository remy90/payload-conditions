# Payload conditions engine

Framework-free questionnaire evaluation with zero runtime dependencies. Version 1.0.0 ships ESM and TypeScript declarations.

```sh
pnpm add @remy90/payload-conditions-engine
```

## Consumer example

Convert a saved Payload document once and retain the resulting questionnaire while the respondent answers it.

```ts
import { applyAnswer, nextPageId, type Answers } from '@remy90/payload-conditions-engine'
import { fromPayloadQuestionnaire, type StoredQuestionnaire } from '@remy90/payload-conditions-engine/payload'

const doc: StoredQuestionnaire = {
  id: 'survey',
  title: 'Getting started',
  pages: [
    {
      id: 'start',
      blockType: 'standardPage',
      questionAnswerPair: [{
        id: 'continue',
        question: 'Continue?',
        answer: [{
          blockType: 'booleanOptions',
          booleanOptions: { trueId: 'yes', trueOption: 'Yes', falseId: 'no', falseOption: 'No' },
        }],
      }],
    },
    {
      id: 'details',
      blockType: 'standardPage',
      conditionGroups: [{
        id: 'group',
        conditions: [{ id: 'condition', questionId: 'continue', operator: 'is', answerId: 'yes' }],
      }],
    },
  ],
}

const questionnaire = fromPayloadQuestionnaire(doc)
let answers: Answers = new Map()
const result = applyAnswer(questionnaire, answers, 'continue', ['yes'])
answers = result.answers
const destination = nextPageId(questionnaire, result.visiblePageIds, 'start') // 'details'
```

Persist `result.answers` after each change so cleared answers stay cleared.

## API

Import evaluation functions and domain types from `@remy90/payload-conditions-engine`.

```ts
const operators = ['is', 'isNot', 'includes', 'excludes'] as const
const matchModes = ['all', 'any'] as const

type Operator = (typeof operators)[number]
type Match = (typeof matchModes)[number]
type Option = { id: string; label: string }
type Answer =
  | { type: 'boolean'; trueOption: Option; falseOption: Option }
  | { type: 'multipleChoice'; allowMultipleSelection: boolean; options: Option[] }
  | { type: 'inputText'; prompt: string }
type Question = { id: string; text: string; optional: boolean; answer: Answer }
type Condition = { questionId: string; operator: Operator; answerId: string }
type ConditionGroup = { match: Match; conditions: Condition[] }
type Page = { id: string; skippable: boolean; questions: Question[]; match: Match; conditionGroups: ConditionGroup[] }
type Questionnaire = { id: string; title: string; pages: Page[] }
type Answers = ReadonlyMap<string, readonly string[]>
type AnswerIssue = { questionId: string; issue: 'required' | 'unknownOption' | 'tooManySelections' }

function operatorsFor(answer: Answer): readonly Operator[]
function evaluatePage(questionnaire: Questionnaire, pageId: string, answers: Answers): boolean
function resolveVisibility(questionnaire: Questionnaire, answers: Answers): {
  visiblePageIds: ReadonlySet<string>; answers: Answers
}
function applyAnswer(questionnaire: Questionnaire, answers: Answers, questionId: string, values: readonly string[]): {
  visiblePageIds: ReadonlySet<string>; answers: Answers
}
function nextPageId(questionnaire: Questionnaire, visiblePageIds: ReadonlySet<string>, currentPageId?: string): string | undefined
function previousPageId(questionnaire: Questionnaire, visiblePageIds: ReadonlySet<string>, currentPageId?: string): string | undefined
function validatePageAnswers(questionnaire: Questionnaire, pageId: string, answers: Answers): AnswerIssue[]
```

Each question's answer map entry holds selected option ids, or `[text]` for input text. Use unique page and question ids throughout a questionnaire.

`operatorsFor` returns `is`/`isNot` for boolean and single-select answers, `includes`/`excludes` for multi-select answers, and an empty array for input text. These choices guide authoring. Evaluation accepts all four operators for either choice type.

### Evaluation semantics

- A condition can reference a boolean or multiple-choice question on an earlier page. Its answer must contain at least one value. Unknown questions, unknown operators, unsupported answer types, same-page references and later-page references evaluate false.
- `is` and `includes` test membership of `answerId`. `isNot` and `excludes` require a non-empty answer that lacks `answerId`. Conditions evaluate the supplied values; use validation to detect unknown option ids.
- A group combines its conditions with `all` or `any`. The page applies its own `all` or `any` mode to the groups. Empty groups are ignored. A page with no remaining groups is visible, including a page with no questions.
- An unknown page id passed to `evaluatePage` returns false. This function evaluates against the supplied answers directly.

### Visibility and updates

`resolveVisibility` makes one forward pass in page order. It clears answers for every question on a hidden page before evaluating later pages. In an A → B → C dependency chain, hiding B removes its answer before C's condition runs. The returned answer map has the same reference as the input when nothing was cleared.

`applyAnswer` copies the answer map and the submitted values, then resolves visibility. Empty values delete the question's entry. An unknown question is ignored while visibility still resolves. All functions preserve their inputs.

### Navigation

Both navigation functions follow questionnaire order through the supplied visible ids and return `undefined` at an edge.

- `nextPageId` with an omitted or unknown current page returns the first visible page. A hidden current page uses its position and returns the next visible page after it.
- `previousPageId` with an omitted or unknown current page returns `undefined`. A hidden current page returns the nearest visible page before its position.

### Validation

`validatePageAnswers` returns an empty array for an unknown page. Callers choose which visible pages to validate; the function also accepts hidden page ids. For a known page it validates questions in their stored order:

- `required`: no value contains non-whitespace content on a required question on a non-skippable page. Whitespace-only text counts as unanswered.
- `unknownOption`: at least one submitted choice id is absent from the question's options.
- `tooManySelections`: a boolean or single-select question has more than one submitted value. Duplicate selections count towards this limit.

`optional` on a question and `skippable` on a page suppress only `required`. A question may report several issues, in the order `required`, `unknownOption`, `tooManySelections`. Each issue occurs at most once per question. Text format checks belong to the consumer.

## Payload adapter

Import `fromPayloadQuestionnaire(doc: StoredQuestionnaire): Questionnaire` from `@remy90/payload-conditions-engine/payload`. This entry point also exports `StoredQuestionnaire`, `StoredStandardPage`, `StoredQuestionAnswerPair`, `StoredAnswer`, `StoredBooleanOptions`, `StoredMultipleChoice`, `StoredInputText`, `StoredOption`, `StoredConditionGroup`, `StoredCondition`, `StoredUnknownBlock` and `StoredId`.

Stored fields are optional and nullable. Numeric ids become strings, including `0`. The adapter accepts unknown block types and skips them. Pages, questions, options, condition groups and condition rows without ids are skipped. A condition row with an id and a missing `questionId`, `operator` or `answerId` remains in its group and evaluates false. A group whose conditions were all skipped is ignored.

Missing match modes default to `all`; boolean flags default to false. Missing text becomes an empty string. Questions use the first supported answer block; a boolean block needs both option ids. Questions with no usable answer block are skipped. A missing questionnaire id becomes an empty string. The adapter leaves its input document untouched.

## Performance

A `WeakMap` caches an index per questionnaire identity, with constant-time lookup of questions and page positions. Keep questionnaires immutable and create a new questionnaire identity after editing the definition. The adapter returns a new definition each time it runs.

The forward pass visits pages and their conditions once, plus the questions on hidden pages. Clearing lazily copies the answer map once. Lists of up to eight answer values use a plain membership loop; longer lists get a `Set` shared for that evaluation call. Evaluation hot paths use no array `find` or `includes` scans.

The test suite times cold indexing, cached evaluation and dependency clearing with 200 pages, ten questions per page and five conditions per question on each dependent page. Each operation must complete in under 25 ms in the best of five runs.
