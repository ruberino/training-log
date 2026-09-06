# Treningslogg — agent instructions

Read `docs/architecture.md` and every file in `docs/adr/` before starting any task.
`docs/tasks.md` holds the ordered tasks with acceptance criteria.
The architecture and the ADRs are normative; a task that disagrees with them is a question, not a licence.

## Working a task

- One task per branch and pull request, branch named like `task/T05-exercises-api`.
- Ask one precise question, with the options you see, when the task is ambiguous, a library behaves differently than the docs describe, a decision is needed that no ADR covers, an unrelated test fails, or an acceptance criterion cannot be met.
- Stay inside the task.
  Anything else you notice goes into the PR description as a follow-up.
- Done means `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` pass locally, with the summary pasted into the PR.
- The repository has no remote yet, so finish a task by fast-forward merging its branch into `main`; rebase onto `main` first when `main` has moved.
  Write what would have been the PR description in the body of the branch's last commit.

## Conventions that apply to every task

- UI text is Norwegian bokmål, including every `message` in an error body, because the client displays it; code, comments, commits and PRs are English.
- Dates cross the API and the database as `YYYY-MM-DD` strings; weight is kilograms as a JSON number, or null on repetition-based exercises.
- Log through `request.log` or `app.log` (pino).
  Throw the `AppError` subclasses from `src/server/lib/errors.ts` and let the single error handler map them.
- Request and response shapes are the zod schemas in `src/shared/schemas.ts`, imported by both client and server.
- Every API test file has one test that its endpoint returns `401` without the cookie.
- New dependencies are pinned to an exact version, the newest that satisfies the floor in `docs/architecture.md` section 3.
