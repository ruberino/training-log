# Treningslogg — implementation tasks

Ordered tasks for implementing `docs/architecture.md` under the decisions in `docs/adr/`.
Each task is sized for one pull request and written so a smaller model can implement it without further design work.

## Rules for the implementer

The rules and the conventions that apply to every task live in `AGENTS.md` at the repository root.
Read it, then `docs/architecture.md` and every ADR, before starting a task.

## Task overview

| Task | Title | Depends on |
| --- | --- | --- |
| T01 | Scaffold the package, tooling and CI skeleton | — |
| T02 | Server skeleton: config, app factory, logging, health, errors, static serving | T01 |
| T03 | Database: Drizzle schema, migrations, startup migrate, test helper | T02 |
| T04 | Auth: login, logout, me, cookie guard, rate limit | T03 |
| T05 | Exercises API | T04 |
| T06 | Entries API and status aggregation | T05 |
| T07 | Client shell: router, query client, API client, login, auth guard | T01 |
| T08 | Status page | T06, T07 |
| T09 | Register page | T08 |
| T10 | Exercise page with chart and entry editing | T09 |
| T11 | Exercises management page | T10 |
| T12 | PWA manifest, icons and mobile polish | T11 |
| T13 | Docker, Litestream, Render, restore drill and release checklist | T06, T12 |
| T14 | CI pipeline | T01 |
| T15 | Phase 2: body-weight log | T13 |

T07 can be developed in parallel with T02–T06.

---

## T01 — Scaffold the package, tooling and CI skeleton

Goal: an empty but fully wired repository where `npm run dev`, `lint`, `typecheck`, `test` and `build` all run.

Files: `package.json`, `tsconfig.json`, `tsconfig.server.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `.env.example`, `README.md`, `src/client/index.html`, `src/client/main.tsx`, `src/client/App.tsx`, `src/client/styles.css`, `src/server/index.ts` (placeholder), `src/shared/dates.ts`, `test/shared/dates.test.ts`.

Steps:

1. Initialise the git repository and `package.json` (`"private": true`, `"type": "module"`, Node engine `>=22`).
2. Add dependencies: `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `recharts`, `fastify`, `@fastify/cookie`, `@fastify/static`, `@fastify/rate-limit`, `better-sqlite3`, `drizzle-orm`, `zod`, `pino`, `dotenv`, `tsx`.
   `tsx` is a regular dependency, not a dev dependency, because the production image installs with `npm ci --omit=dev` and starts the server with `tsx` (ADR-0002, T13).
   Dev dependencies: `typescript`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite`, `drizzle-kit`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `prettier`, `concurrently`, `@types/node`, `@types/react`, `@types/react-dom`, `@types/better-sqlite3`.
3. Add the scripts from `architecture.md` section 11.
4. `vite.config.ts`: `root: 'src/client'`, `build.outDir: '../../dist/client'`, `emptyOutDir: true`, React and Tailwind plugins, dev server proxy `/api` to `http://localhost:3000`.
   `vitest.config.ts` at the repository root, separate from the Vite config so tests are not scoped to `src/client`: React plugin, `environment: 'node'` as the default, `include: ['test/**/*.test.{ts,tsx}']`, and a `setupFiles` entry for `@testing-library/jest-dom`.
   Every file under `test/client/` starts with `/** @vitest-environment jsdom */`.
   Do not use `environmentMatchGlobs`; it was removed in Vitest 4.
5. `tsconfig.json`: strict, `moduleResolution: bundler`, `jsx: react-jsx`, includes `src/client`, `src/shared`, `test/client`, `test/shared`.
   `tsconfig.server.json`: strict, Node types, includes `src/server`, `src/shared`, `test/server`, `test/helpers`, `test/shared`.
6. ESLint flat config: typescript-eslint recommended, react-hooks, `no-console: 'error'` for `src/**`, ignore `dist` and `drizzle`.
7. `src/shared/dates.ts` with `todayLocalIso(): string` (client use) and `isIsoDate(s: string): boolean` (regex `^\d{4}-\d{2}-\d{2}$` and a real calendar check), with unit tests.
8. Minimal `App.tsx` that renders the text "Treningslogg".
9. `.env.example` listing every variable from `architecture.md` section 9 with comments.
10. `README.md`: what the app is, how to run locally, links to the docs.

Acceptance criteria:

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all exit 0.
- `npm run dev:client` shows "Treningslogg" on `http://localhost:5173`.
- `.gitignore` excludes `node_modules`, `dist`, `data/`, `.env`, and keeps the existing `.semgrep/` entry.

Tests: `test/shared/dates.test.ts` covering valid dates, invalid format, and invalid calendar dates such as `2026-02-30`.

---

## T02 — Server skeleton: config, app factory, logging, health, errors, static serving

Goal: a Fastify server that starts from validated config, answers `GET /api/health`, maps errors to the documented shape, and serves the SPA in production.

Files: `src/server/config.ts`, `src/server/app.ts`, `src/server/index.ts`, `src/server/lib/errors.ts`, `src/server/routes/health.ts`, `test/server/health.test.ts`, `test/server/errors.test.ts`, `test/server/config.test.ts`, `test/helpers/createTestApp.ts`.

Steps:

1. `config.ts`: zod schema for the environment table in `architecture.md` section 9, `loadConfig(env = process.env): Config`.
   On failure log the issues with pino and `process.exit(1)` from `index.ts` only, not from `config.ts`, so tests can assert the thrown error.
2. `errors.ts`: `AppError` (`statusCode`, `code`), `NotFoundError`, `ConflictError`, `UnauthorizedError`, plus `toErrorResponse(error, requestId)`.
3. `app.ts`: `buildApp(options: { config: Config; databasePath?: string })` returning a Fastify instance with logger and redaction from ADR-0008, `trustProxy: config.nodeEnv === 'production'` so `request.ip` is the real client address behind the Render proxy, `x-request-id` reply header, `setErrorHandler` per ADR-0008, `setNotFoundHandler` that returns `404 NOT_FOUND` JSON for `/api/*` and `index.html` for other GET requests in production.
4. Register `@fastify/static` for `dist/client` only when `config.nodeEnv === 'production'`.
5. `routes/health.ts`: `GET /api/health` returning `{ status: 'ok', version }` where version is read from `package.json` once at startup.
6. `index.ts`: `import 'dotenv/config'` as the first line so a local `.env` is loaded in development (Render supplies real environment variables in production and the import is a no-op without a file); then load config, build app, listen on `config.host:config.port`, log the URL, handle `SIGTERM` with `app.close()`.
   Only `index.ts` loads dotenv; `app.ts` and tests never read `.env`.
7. `test/helpers/createTestApp.ts`: builds an app with a test config (`APP_PASSWORD=test-password-123`, a 32+ char `SESSION_SECRET`, `NODE_ENV=test`) and `databasePath: ':memory:'`; for now the database option is unused.

Acceptance criteria:

- `curl localhost:3000/api/health` returns `200 {"status":"ok","version":"..."}`.
- An unknown `/api/nope` returns `404 {"error":{"code":"NOT_FOUND",...,"requestId":"..."}}` and the same id in `x-request-id`.
- A route that throws `new Error('boom')` (add a test-only route in the test file) returns `500 INTERNAL` with a generic message and no stack in the body.
- Missing `APP_PASSWORD` makes `loadConfig` throw with a message naming the variable.
- `npm run dev:server` starts without a database yet.

Tests: health 200, not-found shape, internal error shape and logging, config validation success and failure.

---

## T03 — Database: Drizzle schema, migrations, startup migrate, test helper

Goal: the two MVP tables exist through Drizzle, migrations are generated and applied at startup, and tests get an in-memory database.

Files: `src/server/db/schema.ts`, `src/server/db/client.ts`, `src/server/db/migrate.ts`, `drizzle.config.ts`, `drizzle/0000_initial.sql` (generated), `test/server/db.test.ts`, updates to `app.ts` and `createTestApp.ts`.

Steps:

1. `schema.ts`: `exercises` and `entries` exactly as in `architecture.md` section 6, including the check constraints and the `entries_exercise_date` index, using Drizzle `sqliteTable`.
2. `client.ts`: `openDatabase(path)` creates the parent directory when needed, opens `better-sqlite3`, runs `PRAGMA journal_mode = WAL` (skip for `:memory:`) and `PRAGMA foreign_keys = ON`, returns `{ sqlite, db }`.
3. `migrate.ts`: `runMigrations(db)` calling the Drizzle migrator with `migrationsFolder` resolved relative to the repository root, so it works from `tsx` in any working directory.
4. `drizzle.config.ts` pointing at the schema and `./drizzle`; run `npm run db:generate` and commit the SQL.
5. `buildApp` opens the database at `options.databasePath ?? config.databasePath`, runs migrations, decorates the app with `db`, and closes the connection in an `onClose` hook.
6. `createTestApp` now uses `:memory:`.

Acceptance criteria:

- Starting the server on an empty `data/` directory creates the file and both tables.
- Running the server twice does not re-apply migrations or fail.
- Inserting an entry with `weight_kg = -1` fails with a constraint error; `weight_kg = 0` and `NULL` are accepted at the database level (the per-metric rule is enforced by the API in T06).
- Inserting an exercise with `metric = 'sets'` fails with a constraint error; omitting `metric` stores `weight`.
- Deleting an exercise cascades to its entries.

Tests: tables exist after migrate, check constraint enforced, cascade delete, foreign key enforced (insert entry with unknown exercise fails).

---

## T04 — Auth: login, logout, me, cookie guard, rate limit

Goal: the API is closed except for login and health, following ADR-0005 exactly.

Files: `src/server/plugins/auth.ts`, `src/shared/schemas.ts` (add `loginSchema`), `test/server/auth.test.ts`, `test/helpers/login.ts`.

Steps:

1. Register `@fastify/cookie` and `@fastify/rate-limit` (global: false).
2. `POST /api/auth/login`: parse `{ password }` with zod, compare per ADR-0005, set the cookie, reply `204`.
   Apply the rate limit `max: 5, timeWindow: '1 minute'` to this route only.
3. `POST /api/auth/logout`: clear the cookie, `204`.
4. `GET /api/auth/me`: `200 { authenticated: true }` when the guard passes.
5. `onRequest` hook: for URLs starting with `/api/` except the two exempt paths, verify the cookie or throw `UnauthorizedError`.
6. `test/helpers/login.ts`: `loginCookie(app)` returns the `Cookie` header value for tests.

Acceptance criteria:

- Wrong password gives `401 UNAUTHORIZED`; the sixth attempt within a minute gives `429 RATE_LIMITED`.
- With a production config and `x-forwarded-for` headers, two different forwarded addresses get independent rate-limit counters (proves `trustProxy` is on); with a development config the header is ignored.
- Correct password gives `204` and a `Set-Cookie` header with `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=31536000`, and `Secure` only when `NODE_ENV=production`.
- `GET /api/auth/me` without cookie gives `401`, with a tampered cookie gives `401`, with the real cookie gives `200`.
- `GET /api/health` still works without a cookie.
- Changing `SESSION_SECRET` invalidates an existing cookie.

Tests: each bullet above.

---

## T05 — Exercises API

Goal: `GET`, `POST`, `GET /:id`, `PATCH /:id` for exercises as specified in `architecture.md` section 7, without the `latest`/`previous` aggregation (returned as `null` until T06).

Files: `src/server/routes/exercises.ts`, `src/server/lib/normalize.ts`, `src/shared/schemas.ts` (`createExerciseSchema`, `updateExerciseSchema`, `exerciseSummarySchema`), `test/server/exercises.test.ts`, `test/server/normalize.test.ts`.

Steps:

1. `normalizeName(name)`: NFKC, trim, lower-case, collapse whitespace.
2. `POST /api/exercises`: validate name (1–60 chars after trim) and optional `metric` (`weight` or `reps`, default `weight`), compute `name_normalized`, insert, `201`; catch the unique violation and throw `ConflictError('Øvelsen finnes allerede')`.
3. `GET /api/exercises`: active only unless `includeArchived=true`; sort by name for now (T06 changes the sort).
4. `GET /api/exercises/:id`: `404` when missing; `entries: []` for now.
5. `PATCH /api/exercises/:id`: rename with uniqueness check; `metric` may change only while the exercise has no entries, otherwise throw `ConflictError('Kan ikke endre type på en øvelse med registreringer')`; `archived: true|false` sets or clears `archived_at`.

Acceptance criteria:

- Creating "Benkpress" then "benkpress " returns `409`.
- Archived exercises are absent from the default list and present with `includeArchived=true`.
- Renaming to another existing name returns `409`; renaming to its own name with different casing succeeds.
- Every response matches `exerciseSummarySchema`.
- Creating without `metric` returns `metric: 'weight'`; creating with `metric: 'reps'` returns `reps`.
- Changing `metric` on an exercise that has an entry (insert one directly through Drizzle in the test) returns `409`; changing it on an exercise without entries succeeds.

Tests: normalisation cases (NFKC, whitespace, casing), all endpoint behaviours above, auth required (one test that a request without cookie gets 401).

---

## T06 — Entries API and status aggregation

Goal: full entries CRUD and the `latest`, `previous`, `delta` fields on exercises, plus the documented list sort order.

Files: `src/server/routes/entries.ts`, `src/server/lib/status.ts`, `src/shared/schemas.ts` (`createEntrySchema`, `updateEntrySchema`, `entrySchema`, `listEntriesQuerySchema`), `test/server/entries.test.ts`, `test/server/status.test.ts`, updates to `routes/exercises.ts`.

Steps:

1. Schemas: `weightKg` number `>= 0`, `< 1000`, at most two decimals checked float-safely as `Math.abs(x * 100 - Math.round(x * 100)) < 1e-6`, optional or null; `reps` integer 1–999 or null; `note` max 500 chars or null; `date` must satisfy `isIsoDate`.
   The per-metric rule from `architecture.md` section 6 is checked in the handler after loading the exercise: `weight` requires `weightKg > 0`, `reps` requires `reps`; a violation is a `400 VALIDATION_ERROR` with a Norwegian message.
2. `status.ts`: pure function `summarise(entries: Entry[], metric: 'weight' | 'reps'): { latest, previous, delta }` where entries are sorted by `(date DESC, id DESC)`; `delta` is computed on `weightKg` for `weight` and on `reps` for `reps`, rounded to two decimals.
3. `POST /api/entries`: `404` when the exercise does not exist; insert; `201`.
4. `GET /api/entries?exerciseId=&from=&to=`: ordered `date DESC, id DESC`, optional inclusive range.
5. `PATCH /api/entries/:id` (re-check the per-metric rule on the merged entry) and `DELETE /api/entries/:id`.
6. Exercises: compute `latest`/`previous`/`delta` per exercise with at most two queries for the list (one for exercises, one for the two newest entries per exercise using a window function `ROW_NUMBER() OVER (PARTITION BY exercise_id ORDER BY date DESC, id DESC)` via Drizzle `sql`), and sort by latest date descending with exercises without entries last, then by name.

Acceptance criteria:

- `weightKg: 82.567` gives `400 VALIDATION_ERROR`; `82.5` and `1.15` succeed (`1.15 * 100` is not an integer in floating point, so a naive check would wrongly reject it).
- Two entries on the same date: the one created last is `latest`.
- `delta` is `null` with one entry, `2.5` for 80 then 82.5 on a weight exercise, and `2` for 8 then 10 reps on a reps exercise.
- On a weight exercise `weightKg: 0` or a missing `weightKg` gives `400`; on a reps exercise a missing `reps` gives `400` while `weightKg` may be omitted, `null` or `0`.
- Deleting the latest entry makes the previous one latest.
- The list is ordered as documented.
- Listing exercises runs at most two SQL statements regardless of the number of exercises; assert by counting statements with the `better-sqlite3` `verbose` option on the test database instead of measuring time.

Tests: `summarise` unit tests, all endpoint behaviours above, range query, 404 cases.

---

## T07 — Client shell: router, query client, API client, login, auth guard

Goal: the SPA skeleton with routing, data layer and login, ready for pages.

Files: `src/client/main.tsx`, `src/client/App.tsx`, `src/client/api/client.ts`, `src/client/api/queries.ts`, `src/client/pages/LoginPage.tsx`, `src/client/components/AppShell.tsx`, `src/client/components/Toast.tsx`, `test/client/LoginPage.test.tsx`, `test/client/apiClient.test.ts`.

Steps:

1. `fetchJson<T>(path, init)`: JSON headers, `credentials: 'same-origin'`, parses the error body into `ApiError` (`code`, `message`, `details`, `requestId`), throws it; on `401` outside `/login` it calls `onUnauthorized()` which clears the query cache and navigates to `/login`.
2. `queries.ts`: `useMe()`, `useLogin()`, `useLogout()`; later tasks add more hooks here.
3. `App.tsx`: routes from `architecture.md` section 8; a `RequireAuth` wrapper that renders a loading state while `useMe` is pending and redirects to `/login` on error.
4. `AppShell`: page container plus bottom navigation with three tabs and the active tab highlighted.
5. `LoginPage`: password input (`type=password`, `autocomplete=current-password`), submit, error text "Feil passord" on 401 and "Prøv igjen om litt" on 429.
6. `Toast`: minimal context with `showToast(text)` that disappears after 3 seconds.

Acceptance criteria:

- Visiting `/` without a cookie shows the login page; logging in shows the shell with three tabs.
- A 401 from any query navigates to `/login`.
- All texts are Norwegian.

Tests: `fetchJson` error parsing and `onUnauthorized` call; `LoginPage` shows the right error for 401 and 429 (mock `fetchJson`).

---

## T08 — Status page

Goal: the home screen listing every active exercise with latest weight, date and delta.

Files: `src/client/pages/StatusPage.tsx`, `src/client/components/ExerciseStatusCard.tsx`, `src/client/lib/format.ts`, `src/client/api/queries.ts` (`useExercises`), `test/client/StatusPage.test.tsx`, `test/client/format.test.ts`.

Steps:

1. `format.ts`: `formatKg(n)` → `"82,5 kg"` (one decimal max, Norwegian comma), `formatReps(n)` → `"12 reps"`, `formatDelta(n, metric)` → `"+2,5"`, `"−2,5"`, `"±0"` for weight and `"+2"`, `"−1"`, `"±0"` for reps, `formatRelativeDate(iso, today)` → `"i dag"`, `"i går"`, `"3 dager siden"`, `"12. aug."` when older than 30 days.
   Format numbers with `Intl.NumberFormat('nb-NO')`; its negative sign is the Unicode minus U+2212, and tests compare against that exact character.
2. `ExerciseStatusCard`: name, the metric value large (`formatKg` or `formatReps` chosen by `metric`), relative date, delta coloured green for positive, red for negative, grey for zero or null; the whole card links to `/exercises/:id`.
3. `StatusPage`: renders cards from `useExercises()`, a floating "Registrer" button linking to `/register`, an empty state with a link to `/exercises`, and a loading and error state.

Acceptance criteria:

- With three exercises the page shows three cards in the server order.
- Delta colours and formats follow the rules above.
- Empty state appears when there are no active exercises.
- A reps exercise shows `12 reps` as the headline and `+2` as the delta.

Tests: `format.ts` cases; `StatusPage` with mocked data for normal, empty and error states.

---

## T09 — Register page

Goal: registering an entry in as few taps as possible.

Files: `src/client/pages/RegisterPage.tsx`, `src/client/components/WeightInput.tsx`, `src/client/components/ExerciseSelect.tsx`, `src/client/api/queries.ts` (`useCreateEntry`, `useCreateExercise`), `test/client/WeightInput.test.tsx`, `test/client/ExerciseSelect.test.tsx`, `test/client/RegisterPage.test.tsx`.

Steps:

1. `WeightInput`: controlled text input with `inputmode="decimal"`, accepts `82,5` and `82.5`, exposes a numeric value or `null` when invalid, has `−2,5` and `+2,5` buttons that step from the current value (or from 0), never goes below 0.
2. `ExerciseSelect`: list of active exercises ordered by latest entry date (the server order), filter field, "Opprett «{text}»" option when no exact normalised match; creating calls `useCreateExercise` and selects the result.
3. `RegisterPage`: reads `?exerciseId=` to preselect; when an exercise is selected, prefill weight with `latest.weightKg` and reps with `latest.reps`; the primary field follows `metric` as described in `architecture.md` section 8, with `WeightInput` labelled `Ekstra vekt (valgfritt)` on reps exercises; date input defaults to `todayLocalIso()` with `max` today; note field optional.
   Submit is disabled until the exercise and its metric value are set: a weight above zero for weight exercises, reps for reps exercises.
   On success: invalidate queries, `showToast('Lagret')`, navigate to `/`.
   On `400` show the server message under the form.
4. The bottom tab "Registrer" links to `/register`.

Acceptance criteria:

- Choosing an exercise with a previous entry prefills its last weight.
- Typing `82,5` submits `weightKg: 82.5`.
- Pressing `+2,5` twice on 80 gives 85.
- The date cannot be set in the future.
- Saving returns to `/` and the new value appears in the status list.
- For a reps exercise the reps field is prefilled from the latest entry and required, and saving with an empty weight sends `weightKg: null`.

Tests: `WeightInput` parsing and stepping; `ExerciseSelect` filtering and create option; `RegisterPage` prefill and submit payload with mocked hooks.

---

## T10 — Exercise page with chart and entry editing

Goal: see the history of one exercise and correct mistakes.

Files: `src/client/pages/ExercisePage.tsx`, `src/client/components/TrendChart.tsx`, `src/client/components/EntryList.tsx`, `src/client/api/queries.ts` (`useExercise`, `useUpdateEntry`, `useDeleteEntry`, `useUpdateExercise`), `test/client/EntryList.test.tsx`, `test/client/TrendChart.test.tsx`.

Steps:

1. `TrendChart`: Recharts `ResponsiveContainer` + `LineChart` of the metric value (`weightKg` or `reps`, chosen by the exercise `metric`) by `date`; range buttons `3 mnd`, `1 år`, `Alt` (default `1 år`); fewer than two points in range shows "For få registreringer for graf".
   Y axis starts near the minimum value, not at zero.
2. `EntryList`: rows with date, weight, reps, note; tap a row to edit inline (same fields as the register form); delete with confirmation.
3. `ExercisePage`: header with name and `formatKg(latest.weightKg)`, actions "Gi nytt navn" and "Arkiver"/"Gjenopprett", chart, list, and a "Registrer" button that links to `/register?exerciseId=:id`.

Acceptance criteria:

- Editing an entry updates the chart and the status page without reload.
- Deleting the only entry shows the empty chart text.
- Archiving hides the exercise from `/` but the page still works via URL.

Tests: `EntryList` edit and delete callbacks; `TrendChart` renders the placeholder text with one point and a chart with two.

---

## T11 — Exercises management page

Goal: manage the exercise list outside the register flow.

Files: `src/client/pages/ExercisesPage.tsx`, tests `test/client/ExercisesPage.test.tsx`.

Steps:

1. Two sections: "Aktive" and "Arkiverte" (collapsed by default).
2. Add form at the top (name plus a metric choice, `Vekt` or `Repetisjoner`, default `Vekt`), inline rename, archive and unarchive buttons; the metric is shown as a badge on each row and is editable only while the exercise has no entries.
3. Show `409` conflicts as "Øvelsen finnes allerede".

Acceptance criteria:

- Adding, renaming, archiving and restoring all work and update the status page.
- Duplicate names show the conflict message without clearing the input.
- Creating with `Repetisjoner` shows the reps badge, and the register page then treats the exercise as a reps exercise.

Tests: rendering of both sections and the conflict message with mocked hooks.

---

## T12 — PWA manifest, icons and mobile polish

Goal: installable on iOS and Android with a proper icon, and a layout check on a 360 px viewport.

Files: `src/client/public/manifest.webmanifest`, `src/client/public/icons/*.png`, `src/client/index.html` (meta tags), small CSS adjustments.

Steps:

1. Manifest per ADR-0006; generate 192 and 512 px icons (a simple dumbbell glyph on the theme colour is fine) and an `apple-touch-icon`.
2. `index.html`: `viewport` with `viewport-fit=cover`, `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`.
3. Safe-area padding for the bottom navigation (`env(safe-area-inset-bottom)`).
4. Walk every page at 360 × 780 and at 1280 px width and fix overflow or tiny tap targets.

Acceptance criteria:

- On the production build served by the server, Chrome DevTools → Application → Manifest shows no errors or warnings.
- Chrome on Android offers "Installer app" for the served build, and iOS Safari "Legg til på Hjem-skjerm" installs an icon that opens standalone without browser chrome; record both checks with screenshots in the PR.
- No horizontal scroll on any page at 360 px.
- All buttons and rows are at least 44 px tall.

Tests: none automated beyond the build; document the manual check in the PR.

---

## T13 — Docker, Litestream, Render, restore drill and release checklist

Goal: the app runs in Docker locally and deploys to Render with replication, following ADR-0007.

Files: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `litestream.yml`, `start.sh`, `render.yaml`, `README.md` (deploy section), `docs/release-checklist.md`.

Steps:

1. `Dockerfile` exactly as described in `architecture.md` section 11 and ADR-0007.
   Use `npm ci --omit=dev` in the final stage and copy `src`, `drizzle`, `package.json`, `package-lock.json`, `dist/client`.
   `npm start` runs `tsx`, which is a regular dependency (T01); add `RUN node -e "require.resolve('tsx')"` after the install so a missing runtime dependency fails the build instead of the container start.
2. `start.sh` per ADR-0007, logging loudly when `LITESTREAM_BUCKET` is unset.
3. `docker-compose.yml`: one service on port 8080, named volume for `/data`, `env_file: .env`.
4. `render.yaml` per ADR-0007.
5. Restore drill, documented in the README: start with compose and a bucket, create data, stop, delete the volume, start again, verify the data is back.
6. `docs/release-checklist.md`: log in, add exercise, register entry, check status and chart, edit and delete entry, archive and restore exercise, install on a phone home screen.

Acceptance criteria:

- `docker compose up --build` serves the app on `http://localhost:8080` and `/api/health` returns 200.
- With Litestream configured, the restore drill recovers the data.
- Without Litestream configured, the container starts and logs a warning.
- The Render service deploys from `render.yaml` and passes its health check.

Tests: none automated; paste the drill output in the PR.

---

## T14 — CI pipeline

Goal: every pull request is checked automatically.

Files: `.github/workflows/ci.yml`.

Steps:

1. Trigger on `pull_request` and on push to `main`.
2. Node 22, `npm ci`, then `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
3. A second job builds the Docker image (no push) to catch Dockerfile breakage.

Acceptance criteria:

- The workflow is green on a PR that touches only the README.
- A deliberate lint error in a test branch makes the workflow fail (verify once, then revert).

---

## T15 — Phase 2: body-weight log

Goal: track body weight alongside exercise weights.

Files: schema and migration for `body_weight`, `src/server/routes/bodyWeight.ts`, client page `/vekt` with a chart and a quick add form, a fourth bottom tab, tests for the API and the page.

Steps:

1. Add the table from `architecture.md` section 6, generate a migration.
2. Endpoints: `GET /api/body-weight` (ordered by date DESC), `PUT /api/body-weight/:date` (upsert), `DELETE /api/body-weight/:date`.
3. Page with `WeightInput`, date default today, chart reusing `TrendChart`, list with delete.

Acceptance criteria:

- Saving twice on the same date updates the value instead of failing.
- The chart shows body weight over time with the same range buttons as exercises.

Tests: upsert behaviour, validation, page rendering.
