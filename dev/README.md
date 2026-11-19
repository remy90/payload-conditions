# Local questionnaire demo

Payload 3.94, Next 16 and SQLite. Use this app for a screen recording on localhost. Prefilled credentials and a checked-in fallback secret make it unsuitable for deployment. The server binds to 127.0.0.1.

## Run

Use Node 26.13.1 (pinned in the root and dev `.node-version` files) and pnpm 10.34.9. Tools such as mise and fnm pick up the pinned Node version.

From the workspace root:

```sh
pnpm install
pnpm dev:seed
pnpm dev
```

Open http://localhost:3000 for the questionnaire list, then choose **Plan a trip**. The initial seed links to http://localhost:3000/q/1. Open http://localhost:3000/admin to edit it. The login form prefills `demo@example.com` / `demo`; click **Log in** once to create an admin session. Draft previews require that session. Use `localhost:3000` for both the editor and frontend so the preview messages and session cookie share an origin.

Stop the server with Ctrl-C. To reset the content, stop it and rerun `pnpm seed` (an alias for the same seed workflow as `pnpm dev:seed`). The seed updates the questionnaire by title, keeps its document id, publishes it, and reads it back to verify page, question and option ids along with condition references. SQLite lives at `dev/demo.db` and stays out of Git. To start with an empty database, remove `dev/demo.db` and any `dev/demo.db-*` files while the server is stopped, then seed again.

After changing plugin component registrations, regenerate the committed import map:

```sh
pnpm --filter dev payload generate:importmap
```

## Recording script

Use a 1920 × 1080 browser window at 100% zoom. Keep two tabs open: the admin and the respondent.

### Authoring

1. In the admin, choose **Questionnaires → Plan a trip**.
2. Under **Pages**, open **About you**. Its header shows the page number, editable title and counts. Expand **Questions** to show the **Yes / No** answer and its **Optional** checkbox. **Free text** answers use a **Placeholder** for the empty answer box.
3. Scroll to **Children → Condition groups**. The **Question** and **Answer** selects read **Are you travelling with children? / is / Yes**.
4. Open **Car seats → Condition groups**. **Show this page when** is **All groups match**. Group 1 uses **All conditions are true**, with children **is Yes**. Group 2's **This group matches when** is **Any condition is true**, combining travel **is Car** with age groups **includes Under 2**.
5. Open the second group's question select to show the available earlier questions. Keep the seeded values selected. Click **Publish changes** if you changed them.
6. Point out **Accessibility**, which uses **How are you travelling? / is not / Car**, and its skippable checkbox.

Payload mounts some nested fields as they enter the viewport. Scroll to a condition group to see its selects.

### Live Preview

1. Log in and open **Questionnaires → Plan a trip**, then toggle **Live Preview** (the eye icon).
2. In the iframe, choose **No**, then **Plane**. Flight and Accessibility enter the progress strip. Click **Next** to open Flight.
3. In the editor, expand **Flight → Condition groups → Group 1 → Conditions**. Change its answer from **Plane** to **Train**, leaving **How are you travelling? / is** selected.
4. Watch Flight leave the iframe's progress strip without saving. The respondent returns to About you with No and Plane still selected. Choose **Train** to make Flight appear again.
5. Restore the condition to **Plane** before continuing the recording. Exit Live Preview to return to the full-width editor. The panel's size menu also offers Mobile (375 × 667) and Desktop (1440 × 900).

The **Preview** button opens `/q/<id>?preview=1` in a new tab. It loads the latest saved draft for a signed-in admin. Requests without a valid session receive the published questionnaire. Unsaved edits arrive through Live Preview while that panel is open. Ordinary `/q/<id>` visits stay published-only.

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
pnpm build && pnpm typecheck && pnpm test
pnpm --filter dev test
pnpm --filter dev typecheck
pnpm --filter dev build
pnpm --filter dev start
```

Root build, typecheck and test target only `packages/*`. The private `dev` workspace is excluded from publishing. The app and plugin use matching Node 26 types so pnpm resolves a single Payload UI instance. The plugin's published API follows Payload's supported Node range.

Terminology screenshots use `/tmp/demo-shots/terms-admin.png` and `/tmp/demo-shots/terms-conditions.png` at 1920 × 1080.

Admin tidy screenshots use `/tmp/demo-shots/tidy-*.png`, including the desktop and 800px layouts, mobile respondent, Preview tab and Live Preview before/after captures.

The tested receiver boundary is `src/receiver/useQuestionnaire.ts`. It imports React and the public engine API. Answer inputs and Embla live in `src/demo-ui/`; the server routes load published documents through Payload's Local API, with authenticated draft access for preview requests. Answers stay in memory and reset on refresh or Restart. Dragging is disabled, inactive slides are inert, and reduced-motion preferences turn off animated navigation.

Browser walkthrough screenshots are stored outside Git in `/tmp/demo-shots/`:
`admin-conditions.png`, `plane-about.png`, `plane-flight.png`, `plane-finish.png`, `car-children.png`, `car-finish.png`, `car-dependencies-cleared.png`, `chain-enabled.png` and `chain-cleared.png`. Validation captures are `children-required.png`, `car-seats-required.png` and `flight-required.png`.
