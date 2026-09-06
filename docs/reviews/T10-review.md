# Review follow-up: T10 — Treningslogg

Review of commit `a29c501` (T10) on `task/T10-exercise-page`, 2026-09-06.
Verdict: approved for fast-forward merge after F1 and F2.

## What was verified

All five scripts exit 0 on the branch; 158 tests pass; nothing under `src/client` imports from `src/server`.
`TrendChart` plots the metric value by date with the range buttons `3 mnd`, `1 år` (default) and `Alt` through `diffDays`, shows `For få registreringer for graf` below two points in range, pads the Y domain around the data instead of starting at zero, and renders without animation; three tests.
`EntryList` edits a row inline with the same fields and submit rule as the register form, deletes behind a two-step confirmation, and shows an empty state; six tests.
`ExercisePage` has the header with the latest value, rename and archive or restore actions, the chart, the list and the `Registrer` link with `?exerciseId=`.
`useExercise`, `useUpdateExercise`, `useUpdateEntry` and `useDeleteEntry` invalidate `['exercises']` and `['exercise', id]`; `exerciseDetailSchema` matches `GET /api/exercises/:id`.
The `fetchJson` fix is a real bug found by driving the app: `Content-Type: application/json` on a bodiless `DELETE` made Fastify answer 400; the earlier review called that header harmless and was wrong; the two regression tests settle it.
The `ResizeObserver` stub and fixed element size in the test setup are what Recharts needs under jsdom; test-only, acceptable.
The commit that first landed on `main` by mistake was moved to the branch and `main` reset before anything was merged; create the branch first next time.

## F1 — Required before merge: the edit form's date cannot be in the future

Section 8: "Date input defaults to today in the phone local time and cannot be in the future."
The inline edit form's date input has no `max`.

Steps: add `max={todayLocalIso()}` to the date input in `EntryList`.
Test: the rendered edit form's date input has `max` equal to `todayLocalIso()`.

## F2 — Required before merge: mutation errors reach the user

ADR-0008 says the client shows `message` for a 4xx.
On the exercise page, rename to an existing name (409), an entry update the server rejects (400) and a failed delete all resolve silently; the edit form even closes as if saved.

Steps:

1. In `ExercisePage`, give every mutation an `onError` that shows the `ApiRequestError` message through `useToast`, or `Noe gikk galt` for anything else.
2. Keep the inline edit form open when the update fails: call `onUpdate` with a callback or return the mutation promise so `EntryRow` only leaves edit mode on success.

Tests, in a new `test/client/ExercisePage.test.tsx` with mocked `fetchJson`: renaming to a name the server answers with `409 CONFLICT` and the message `Øvelsen finnes allerede` shows that message in the toast (`role="status"`); a rejected entry update shows its message and the row stays in edit mode.

## Done

F1 and F2 as one `fix:` commit on the T10 branch, then fast-forward merge and send the hash.
