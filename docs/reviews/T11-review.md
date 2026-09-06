# Review follow-up: T11 — Treningslogg

Review of commit `c2cca70` (T11) on `task/T11-exercises-page`, 2026-09-06.
Verdict: approved for fast-forward merge, no follow-up items.

## What was verified

All five scripts exit 0 on the branch; 168 tests pass; nothing under `src/client` imports from `src/server`.
`ExercisesPage` has the `Aktive` section and a collapsed `Arkiverte (n)` section from one `useExercises(true)` fetch, the add form with the `Vekt` or `Repetisjoner` choice defaulting to `Vekt`, inline rename, archive and restore, and the metric as a read-only badge once the exercise has an entry or an editable toggle while it has none.
Every mutation surfaces its error through `apiErrorMessage` and the toast, so a duplicate name shows `Øvelsen finnes allerede` and the typed value stays.
`useExercises(includeArchived)` is keyed `['exercises', { includeArchived }]`, which the existing `['exercises']` invalidations still cover by prefix.
Seven tests cover both sections, adding with `reps`, the conflict message keeping the input, the badge lock, the editable choice, archive and restore.

## Recommendation, no action now

The page filters `data` into active and archived three times per render; compute the two lists once when the file is next touched.

## Done

Fast-forward merge now.
