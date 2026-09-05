# ADR-0004: SQLite with Drizzle ORM and migrations applied at startup

- Status: Accepted
- Date: 2026-09-05

## Context

Data volume is one household and a few hundred rows a year.
The existing apps use SQLite, with Prisma (`sissel`) and raw `better-sqlite3` (`shopper`).
Prisma needs a generated client and an engine step in the Docker build, and its migrate tooling required special baselining logic in the `sissel` start script.
Raw SQL strings everywhere are easy to get subtly wrong and give no compile-time types.

## Decision

- SQLite through `better-sqlite3`, opened with `journal_mode = WAL` and `foreign_keys = ON`.
- Drizzle ORM for typed queries and `drizzle-kit generate` for SQL migrations, which are committed under `drizzle/`.
- Migrations are applied by the application itself at startup through `migrate()` from `drizzle-orm/better-sqlite3/migrator`, before the HTTP server starts listening.
- Tests open `:memory:` databases and run the same migrations.
- Schema changes happen only by editing `src/server/db/schema.ts` and generating a new migration; hand-written migrations are allowed only for data fixes and must be reviewed.

## Consequences

- No engine binaries, no `prisma generate`, a smaller Docker image and a simpler `start.sh`.
- Types flow from the schema definition into queries and into the API layer.
- A failed migration stops the process before it serves traffic, which is the right failure mode.
- Litestream (ADR-0007) works unchanged because WAL mode is what it expects.
- SQLite has one writer at a time; irrelevant at this scale but rules out horizontal scaling, which is not a goal.

## Alternatives considered

- Prisma: familiar from `sissel`, but heavier build and runtime, and the migration baselining logic was a source of operational complexity.
- Raw `better-sqlite3`: fewer dependencies, but no types and no migration tooling.
- Postgres on Render: overkill for the data size, another service to pay for and back up.
- Running migrations in `start.sh` before the server: an extra process and a second place to configure the database path; in-process is simpler and testable.
