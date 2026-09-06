# Review follow-up: T14 — Treningslogg

Review of commit `34de534` (T14) on `task/T14-ci-pipeline`, 2026-09-06.
Verdict: approved for fast-forward merge; the two acceptance criteria stay pending until a GitHub remote exists.

## What was verified

`.github/workflows/ci.yml` triggers on `pull_request` and on push to `main`, runs Node 22 with `npm install -g npm@12` before `npm ci`, then `lint`, `typecheck`, `test`, `build` and `format:check` in order, and a second job builds the Docker image without pushing.
Every step was run locally on the branch (174 tests, `docker build` succeeds), and the YAML was parsed with a library, not read by eye.
The commit body says plainly that the workflow has never run; Ruben deferred the GitHub repository, so "green on a README-only PR" and "a deliberate lint error fails it" cannot be checked yet.

## Pending, Ruben's step

Create the GitHub repository and push `main`; the first PR that touches only the README verifies the green run, and one throwaway branch with a lint error verifies the failure path.
Record both here when they happen.

**Done.** Ruben chose to create the repo now, under his personal account (`ruberino`, not the `rubenr_aboveit` org/enterprise account) — `github.com/ruberino/training-log`, private. `main` pushed; the push-triggered run (`34051915282`) was green on both jobs.
Both acceptance criteria then verified for real with throwaway PRs, closed without merging and branches deleted after:
- PR #1, README-only change: run `34052014652` green on both jobs (`pull_request` trigger).
- PR #2, a deliberately unused `const` added to `src/shared/dates.ts`: run `34052128003` failed exactly at `npm run lint` with the expected `@typescript-eslint/no-unused-vars` error; `typecheck`/`test`/`build`/`format:check` correctly skipped; `docker-build` (independent job) still passed.

Only informational finding: GitHub's own annotation that `actions/checkout@v4`/`actions/setup-node@v4` target Node 20, which the runner transparently upgrades to Node 24 for now. Not a failure; `@v5` of both actions would silence it whenever the workflow is next touched.

## State of the app

With T14 merged, every MVP task (T01 to T14) is on `main` and reviewed.
Open items are all Ruben's: the Render service, the phone installation checks, the GitHub repository.
T15 is phase 2 (body-weight log) and needs his go-ahead before it starts.

## Done

Fast-forward merge now.
