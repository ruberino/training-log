# Review follow-up: T05 — Treningslogg

Review of commit `f25302a` (T05), now on `main`, 2026-09-06.
Verdict: approved with two small items.
The exercises API matches `docs/architecture.md` section 7 and every T05 acceptance criterion, and the tests cover each bullet plus the required 401 case.

## What was verified

All five scripts (`lint`, `typecheck`, `test`, `build`, `format:check`) exit 0 in the tree that contains `f25302a` plus the T02 to T04 follow-up round (68 tests at the time of checking; the earlier figure of 80 in this file was measured in the wrong repository and is withdrawn).
`normalizeName` does NFKC, trim, lower-case and whitespace collapse, with tests for fullwidth and combining characters.
Create defaults `metric` to `weight`, trims the name, rejects duplicates after normalisation with `409 CONFLICT` and a Norwegian message.
The list hides archived exercises unless `includeArchived=true`; detail returns `entries: []`; patch renames with uniqueness, toggles `archived_at`, and refuses a `metric` change once entries exist.
Every response is checked against `exerciseSummarySchema` in the tests.

## F1 — Required: validation tests for the exercise schemas

Section 7 says bodies are validated with zod and unknown properties are rejected; `createExerciseSchema` and `updateExerciseSchema` are strict but no test proves it.

Tests to add to `test/server/exercises.test.ts`:

1. `POST` with a 61-character name returns `400 VALIDATION_ERROR` with `details[0].path` equal to `['name']`.
2. `POST` with `{ name: 'Knebøy', colour: 'red' }` returns 400.
3. `PATCH` with `{ metric: 'time' }` returns 400.
4. `GET /api/exercises/abc` returns 400.
5. `GET /api/exercises?includeArchived=maybe` returns 400.

Acceptance: the five tests pass.

## F2 — Recommended: one place that knows the driver's error class

`routes/exercises.ts` imports `better-sqlite3` to recognise `SQLITE_CONSTRAINT_UNIQUE`.
Every later route module (entries, and the Kvitteringer routes) needs the same check, so the driver import belongs in one place.

Steps: export `isUniqueViolation(error: unknown): boolean` from `src/server/db/client.ts`, use it in `exercises.ts`, and leave `better-sqlite3` imported only under `src/server/db/`.

Acceptance: `grep -rl "from 'better-sqlite3'" src/server` lists only files under `src/server/db/`.

## Done

With the T02 to T04 follow-up round: the five scripts exit 0, commit bodies carry the summaries, fast-forward merge into `main`.
