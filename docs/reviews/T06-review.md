# Review follow-up: T06 — Treningslogg

Review of commit `4851978` (T06) on `task/T06-entries-api`, 2026-09-06.
Verdict: approved for fast-forward merge after F1; F2 is recommended and may follow later.

## What was verified

All five scripts exit 0 on the branch; 91 tests pass.
Schemas match T06 step 1: `weightKg` in `[0, 1000)` with the float-safe two-decimal check, `reps` integer 1–999, `note` at most 500 characters, `date` through `isIsoDate`, every object strict, `null` allowed to clear a field.
`summarise` is pure, sorts by `(date DESC, id DESC)`, rounds `delta` to two decimals and returns `null` when either value is missing; six unit tests cover empty, single, weight, reps, tie on date and input order.
`POST /api/entries` returns 404 for an unknown exercise and enforces the per-metric rule with Norwegian messages; `PATCH` re-checks the rule on the merged entry and clears fields with `null`; `DELETE` returns 204.
`GET /api/entries` orders by `date DESC, id DESC` with an inclusive range.
Listing exercises runs one exercises query plus one window-function query, asserted with the `better-sqlite3` `verbose` hook, and sorts by latest date descending, exercises without entries last, then by name.
Every T06 acceptance bullet has a test, including `82.567` rejected, `1.15` accepted, same-date tie, delta `2.5` and `2`, and deleting the latest entry.
The AGENTS.md convention holds: `entries.test.ts` has 401 tests for `POST` and `GET`.

## F1 — Required before merge: validation tests for the entry schemas

Section 7 says bodies are validated and unknown properties rejected; the entry schemas are strict but the boundaries are untested.

Tests to add to `test/server/entries.test.ts`, each expecting `400 VALIDATION_ERROR`:

1. `POST` with `date: '2026-02-30'`.
2. `POST` with `reps: 0` on a reps exercise.
3. `POST` with a 501-character `note`.
4. `POST` with an unknown property.
5. `PATCH` with an unknown property.
6. `GET /api/entries` without `exerciseId`.

Acceptance: the six tests pass.

## F2 — Recommended: one row mapper, no route-to-route import

`routes/exercises.ts` imports `toEntry` from `routes/entries.ts`, and `loadLatestEntriesByExercise` carries its own snake_case row type and mapping.
Alias the columns in the window query to the Drizzle select shape (`exercise_id AS exerciseId`, `weight_kg AS weightKg`, `created_at AS createdAt`) so the same mapper serves both, and move `toEntry` to `src/server/db/mappers.ts`.

Acceptance: `grep -rn "from './entries.ts'" src/server/routes` prints nothing, and the two-statement test still passes.

## Done

F1 on the T06 branch, then fast-forward merge; F2 as its own `refactor:` commit whenever the next server task touches these files.
