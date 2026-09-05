# Architecture Decision Records

One decision per file, numbered in the order they were made.
An accepted ADR is never edited except to change its status.
To change a decision, write a new ADR that supersedes the old one and link both ways.

| ADR | Title | Status |
| --- | --- | --- |
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-single-package-react-fastify-typescript.md) | Single TypeScript package with React + Vite frontend and Fastify backend | Accepted |
| [0003](0003-snapshot-log-data-model.md) | Snapshot log data model instead of workout sessions | Accepted |
| [0004](0004-sqlite-drizzle-migrations-at-startup.md) | SQLite with Drizzle ORM and migrations applied at startup | Accepted |
| [0005](0005-shared-household-password-cookie.md) | Shared household password with a signed cookie, no user accounts | Accepted |
| [0006](0006-mobile-first-installable-web-app.md) | Mobile-first installable web app instead of a native app | Accepted |
| [0007](0007-docker-on-render-with-litestream.md) | One Docker container on Render with Litestream replication to S3 | Accepted |
| [0008](0008-structured-logging-and-error-format.md) | Structured logging with pino and one error format | Accepted |
| [0009](0009-zod-schemas-shared-between-client-and-server.md) | zod schemas shared between client and server | Accepted |
| [0010](0010-testing-strategy.md) | Testing strategy: Vitest, in-memory SQLite, Fastify inject, no browser e2e in MVP | Accepted |
| [0011](0011-exercises-track-weight-or-reps.md) | Exercises track either weight or repetitions (extends ADR-0003) | Accepted |

## Template

```markdown
# ADR-NNNN: Title

- Status: Proposed | Accepted | Superseded by ADR-MMMM
- Date: YYYY-MM-DD

## Context

What situation forces a decision, and which constraints matter.

## Decision

What we decided, stated so that an implementer can act on it without asking.

## Consequences

What becomes easier, what becomes harder, what we must remember.

## Alternatives considered

Each alternative and the reason it lost.
```
