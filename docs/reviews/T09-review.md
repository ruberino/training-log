# Review follow-up: T09 — Treningslogg

Review of commit `a34ba96` (T09) on `task/T09-register-page`, 2026-09-06.
Verdict: approved for fast-forward merge after F1.

## What was verified

All five scripts exit 0 on the branch; 144 tests pass; nothing under `src/client` imports from `src/server`.
`WeightInput` accepts comma and dot, reports `null` for text that is not a number, steps by 2,5 from the current value or from 0, never goes below 0, has `inputmode="decimal"` and labelled buttons; five tests.
`ExerciseSelect` keeps the server order, filters on the normalised name, offers `Opprett «…»` only without an exact normalised match, creates with `metric: 'weight'` and selects the result; five tests.
`RegisterPage` preselects from `?exerciseId=`, prefills weight and reps from the latest entry, orders and labels the fields by metric with `Ekstra vekt (valgfritt)` on reps exercises, defaults the date to today with `max` today, disables submit until the metric value is valid, sends `weightKg: null` when the weight is empty on a reps exercise, shows the server message on a 400, invalidates `['exercises']` and `['exercise', id]`, and returns to `/` with the toast `Lagret`; five tests cover prefill, payloads, the date cap and the preselect.
Moving `normalizeName` to `src/shared/normalize.ts` is right: the client needs the same normalisation as the server for the create option.
The mid-render conditional `setState` for the preselect is React's documented pattern and satisfies the hooks rule; acceptable.

## F1 — Required before merge: test the submit rule and the 400 message

Step 3 says submit is disabled until the exercise and its metric value are set, and that a 400 shows the server message under the form; neither has a test.

Tests to add to `test/client/RegisterPage.test.tsx`:

1. On a weight exercise, `Lagre` is disabled with an empty weight and with `0`, and enabled once `82,5` is typed.
2. On a reps exercise, `Lagre` is disabled with empty reps and enabled once `10` is typed.
3. A mocked `ApiRequestError(400, { code: 'VALIDATION_ERROR', message: 'Vekt må være større enn 0 for denne øvelsen', … })` renders that message in the alert.

Acceptance: the three tests pass.

## Process

`docs/architecture.md` was edited in this task to move `normalize.ts` in the layout and mention `diffDays`.
The change is correct and stays, but the architecture is normative: send the proposed wording to the foreman first, then apply it as its own `docs:` commit once approved.

## Done

F1 as a `test:` commit on the T09 branch, then fast-forward merge and send the hash.
