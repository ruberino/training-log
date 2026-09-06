# Review follow-up: T15 — Treningslogg

Review of PR #5, commit `5dff5a0` on `task/T15-body-weight`, 2026-09-06.
Verdict: approved for merge after F1 and F2; merge with `gh pr merge --rebase --delete-branch` once CI is green on the fix commits.

## What was verified

All five scripts exit 0 in a clean worktree at `5dff5a0`; CI is green on both jobs; the PR description states intent, changes, risk and tests.
The table and the migration match section 6; the unique constraint is a unique index, which is what drizzle emits and is equivalent.
`db.test.ts` proves the check constraint and the unique date.
`GET` orders by date descending, `PUT` creates or replaces and `note: null` clears the note, `DELETE` answers 204 and 404, every endpoint has its 401 test, the `:date` parameter goes through `dateSchema`, unknown fields are rejected.
`TrendChart` takes `points` and `allowDecimals`; `ExercisePage` computes its own points and its tests pass unchanged.
`BodyWeightPage` defaults the date to today with `max`, prefills weight and note when a date with an entry is picked, deletes behind a two-step confirmation and surfaces errors through `apiErrorMessage` and the toast; seven tests.
The fourth tab is there and `App.test.tsx` covers it.

## F1 — Required before merge: the screenshots named in the PR are not in the PR

`docs/reviews/screenshots/T15/` exists only untracked in the working tree.
Nothing under `docs/reviews/screenshots/` has ever been committed in this repository, so the T12 walk is missing from the history as well.
Evidence a PR points at must be in the PR.

Steps: one `docs:` commit adding `docs/reviews/screenshots/T15/*.png` and `docs/reviews/screenshots/T12/*.png`; `.dockerignore` already excludes the folder.
Check that the screenshots show demo data only.

## F2 — Required before merge: the upsert is two statements where SQLite has one

Select-then-insert-or-update is not atomic; two `PUT`s for a new date at the same moment make the second fail on the unique index with a 500 instead of the documented 200.
Drizzle has the primitive: `insert(bodyWeight).values({ … }).onConflictDoUpdate({ target: bodyWeight.date, set: { weightKg, note } }).returning().get()`.
`created_at` is not in `set`, so it stays from the first insert.
The existing tests cover create, update and note clearing, so the change is safe; `DELETE` keeps its select for the 404.

## Recommendations, no action now

- On load the date is today but the form is not prefilled from today's entry, so a second save the same day replaces it without a hint; prefill from today once the list arrives, or show `Erstatter registreringen for i dag`.
- `<p>` inside the row `<button>` is not valid HTML, a button allows phrasing content only; use `<span className="block">`.
- Local `main` is at `517b289` while `origin/main` is at `3e35121`; run `git pull --ff-only` on `main` after every merge so branch diffs stay meaningful.

## Done

F1 and F2 as two commits on the T15 branch, push, wait for CI, then merge and send the merge commit hash.
