# Version 0.3 verification

Checked on Node 26.13.1 with pnpm 10.34.9. The frozen install resolved one `@payloadcms+ui@3.94.0` directory, so pruning was unnecessary. TypeScript in the dev workspace reports 7.1.0-beta.

The browser ran through agent-browser on `http://localhost:3013`. Port 3000 was occupied by an existing SSH listener, which was left running. Preview URLs used `DEMO_ORIGIN=http://localhost:3013`. The receiver now derives its Live Preview server URL from the browser origin.

## Browser results

All screenshots are outside Git under `/tmp/demo-shots/`.

| Check | Result | Screenshot |
| --- | --- | --- |
| Whitespace-only question blocks publish inline | Pass | `v03-whitespace.png` |
| Duplicate option label blocks publish inline | Pass | `v03-duplicate-option.png` |
| Empty condition group blocks publish inline | Pass | `v03-empty-group.png` |
| Contradiction blocks publish at its second operator | Pass | `v03-contradiction.png` |
| Page depending on an unreachable source blocks publish | Pass | `v03-unreachable.png` |
| Draft save with each of the five problems | Pass | `v03-whitespace-draft.png`, `v03-duplicate-option-draft.png`, `v03-empty-group-draft.png`, `v03-contradiction-draft.png`, `v03-unreachable-draft.png` |
| Blank name fills from question label on save | Pass | `v03-name.png` |
| Plane path reaches summary through Flight and skippable Accessibility | Pass | `v03-plane-flight.png`, `v03-plane-finish.png` |
| Car with children reaches summary; changing children to No clears dependent answers | Pass | `v03-car-children.png`, `v03-car-finish.png`, `v03-car-cleared.png` |
| Drag page by its header and keep the reordered titles on publish | Pass | `v03-header-drag.png` |
| Edit title in page header and publish | Pass | `v03-header-title.png` |
| `admin.disableBlockName` removes header title inputs | Pass | `v03-disable-block-name.png` |
| Unsaved Live Preview title edit appears in iframe | Pass | `v03-live-title.png` |
| Unsaved Flight condition change to Train hides Flight and keeps No / Plane answers | Pass | `v03-live-before.png`, `v03-live-after.png` |
| English admin labels, row labels and errors with no raw translation keys | Pass | `v03-contradiction.png`, `v03-header-title.png` |
| Page title with 121 characters reports beside header input | Pass | `v03-page-title.png` |

Validation drafts come from `DEMO_VALIDATION_FIXTURES=1 pnpm --filter dev seed`. Publish each draft in the admin, scroll to its errored field, then change its title and use Save Draft to repeat the draft check. The unreachable fixture has a contradictory Children page and a Flight page whose source question lives on Children. The name check cleared the name, edited the label and saved a draft; the saved name was `favourite_holiday_memory`.

For the header check, the last two pages were swapped while collapsed and the first page title became About your trip. Publishing kept both changes. The final database was reset and reseeded after verification.

## Payload integration checks

`src/payload.integration.test.ts` uses a temporary SQLite database and the real Payload Local API:

- Publish-on-create generates page, question, answer, option, group and condition row ids before the first collection `beforeChange` hook. A contradiction rejects at `pages.1.conditionGroups.0.conditions.1.operator`.
- Updating only `title` on a published questionnaire succeeds and keeps its pages and status.
- Both the current and version page tables have exactly one `block_name` column.

The receiver tests cover preview swaps, dependent-answer clearing, navigation and the renamed answer types. Explanation tests cover all four operators, including an unanswered negative condition.

## Plugin issues

None found.
