# ADR-0010: Testing strategy — Vitest, in-memory SQLite, Fastify inject, no browser e2e in MVP

- Status: Accepted
- Date: 2026-09-05

## Context

The app is small, but it will be modified by agents that need a fast, reliable signal that a change did not break anything.
Tests that need a running browser or a real network are slow and flaky, and flakiness erodes trust quickly.
Never delete, skip or weaken a valid test to make a change pass.

## Decision

- Vitest is the single test runner for server and client code.
- Server API tests build the app with `buildApp({ databasePath: ':memory:' })`, run migrations, and call endpoints with `app.inject()`.
  Every endpoint has at least one happy-path test and one test per documented error code.
- Pure functions (normalisation, status aggregation, date helpers) have unit tests with plain inputs.
- Client component tests use React Testing Library with jsdom and mock the API layer at the `fetchJson` boundary, never at the network level.
- No Playwright or browser e2e in the MVP; a manual release checklist covers the end-to-end flows.
- CI runs `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` on every pull request and must be green before merge.
- A bug fix starts with a failing test that reproduces the bug.

## Consequences

- The full suite runs in seconds with no external services.
- Auth, validation and error mapping are tested at the HTTP boundary, which is where the contract lives.
- Visual regressions are not caught automatically; the manual checklist and picky review cover that.
- Adding Playwright later is possible without changing the existing tests.

## Alternatives considered

- Jest: works, but Vitest shares the Vite config and is faster with ESM and TypeScript.
- Real SQLite files in a temp directory: slower and needs cleanup; `:memory:` runs the same migrations.
- Playwright from the start: valuable, but the cost in flakiness and setup outweighs the benefit for an app with five screens.
