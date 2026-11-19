# Local questionnaire demo

Payload 3.94, Next 16 and SQLite. Use this app for a screen recording on localhost. Auto-login and a checked-in fallback secret make it unsuitable for deployment. The server binds to 127.0.0.1.

## Run

Use Node 24.22.3 (pinned in `.node-version`) and pnpm 10.34.9. Node 26.13.0 falls outside Payload 3.94's supported range, which starts at 26.13.1 for Node 26.

From the workspace root:

```sh
mise x node@24 pnpm@10.34.9 -- pnpm install
mise x node@24 pnpm@10.34.9 -- pnpm dev:seed
mise x node@24 pnpm@10.34.9 -- pnpm dev
```

With the supported Node version active and Corepack enabled, the equivalent commands are `pnpm install`, `pnpm dev:seed` and `pnpm dev`.

Open http://localhost:3000 for the questionnaire list, then choose **Plan a trip**. The initial seed links to http://localhost:3000/q/1. Open http://localhost:3000/admin to edit it. Auto-login uses `demo@example.com` / `demo`.

Stop the server with Ctrl-C. To reset the content, stop it and rerun `pnpm seed` (an alias for the same seed workflow as `pnpm dev:seed`). The seed updates the questionnaire by title, keeps its document id, publishes it, and reads it back to verify page, question and option ids along with condition references. SQLite lives at `dev/demo.db` and stays out of Git. To start with an empty database, remove `dev/demo.db` and any `dev/demo.db-*` files while the server is stopped, then seed again.

After changing plugin component registrations, regenerate the committed import map:

```sh
mise x node@24 pnpm@10.34.9 -- pnpm --filter dev payload generate:importmap
```

## Recording script

Use a 1920 × 1080 browser window at 100% zoom. Keep two tabs open: the admin and the respondent.

### Authoring

1. In the admin, choose **Questionnaires → Plan a trip**.
2. Scroll to **Children → Condition groups**. Its selects read **Are you travelling with children? / is / Yes**.
3. Open **Car seats → Condition groups**. The page matches **All** groups. Group 1 matches children **is Yes**. Group 2 matches **Any**, combining travel **is Car** with age groups **includes Under 2**.
4. Open the second group's question select to show the available earlier questions. Keep the seeded values selected. Click **Publish changes** if you changed them.
5. Point out **Accessibility**, which uses **How are you travelling? / is not / Car**, and its skippable checkbox.

Payload mounts some nested fields as they enter the viewport. Scroll to a condition group to see its selects.

### Responding: Plane

1. On the respondent tab, choose **No**, then **Plane**. Watch Flight and Accessibility enter the progress strip.
2. Click **Next**, choose **Yes** for extra baggage, then enter **Window, please**.
3. Click **Next**. Leave Accessibility unanswered and continue to show that it is skippable.
4. Add a note on **Anything else?**, then click **Finish** for the summary.
5. Click **Restart**.

### Responding: Car with children

1. Choose **Yes**, then **Car**. The strip shows About you, Children, Car seats and Anything else.
2. Continue to Children. Select **Under 2** and **2 to 11**.
3. Continue to Car seats, choose **Yes**, then finish through Anything else.
4. Use **Back** to return to About you. Change children to **No**. Children and Car seats leave the strip; their answers disappear from Logic.
5. Choose **Yes** again and continue. The age checkboxes are empty.

### Show the dependency chain

Restart. Choose **Yes** and **Plane**, then select **Under 2** on Children. Car seats now appears through the second group's age condition. Go Back and choose **No**: Children disappears, its ages clear, and Car seats disappears. Choose **Yes** again to show that Car seats stays hidden until Under 2 is answered again.

The Logic panel opens by default. Click its heading to collapse it, or append `?logic=0` to start collapsed. It shows the current answers and condition results computed by the engine. Scroll within it to inspect the Car seats groups.

## Verification

From the workspace root:

```sh
mise x node@24 pnpm@10.34.9 -- sh -c 'pnpm build && pnpm typecheck && pnpm test'
mise x node@24 pnpm@10.34.9 -- pnpm --filter dev test
mise x node@24 pnpm@10.34.9 -- pnpm --filter dev typecheck
mise x node@24 pnpm@10.34.9 -- pnpm --filter dev build
mise x node@24 pnpm@10.34.9 -- pnpm --filter dev start
```

Root build, typecheck and test target only `packages/*`. The private `dev` workspace is excluded from publishing. Keep its `@types/node` version aligned with the plugin's development dependency so pnpm shares one instance of Payload UI and its form contexts.

The tested receiver boundary is `src/receiver/useQuestionnaire.ts`. It imports React and the public engine API. Answer inputs and Embla live in `src/demo-ui/`; the server routes load published documents through Payload's Local API. Answers stay in memory and reset on refresh or Restart. Dragging is disabled, inactive slides are inert, and reduced-motion preferences turn off animated navigation.

Browser walkthrough screenshots are stored outside Git in `/tmp/demo-shots/`:
`admin-conditions.png`, `plane-about.png`, `plane-flight.png`, `plane-finish.png`, `car-children.png`, `car-finish.png`, `car-dependencies-cleared.png`, `chain-enabled.png` and `chain-cleared.png`. Validation captures are `children-required.png`, `car-seats-required.png` and `flight-required.png`.
