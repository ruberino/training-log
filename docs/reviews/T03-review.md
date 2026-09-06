# Review follow-up: T03 — Treningslogg

Review of commit `82cc366` (T03), now on `main`, 2026-09-06.
Verdict: approved.
Schema, generated SQL, database client, migrator and tests match `docs/architecture.md` section 6, ADR-0004 and every T03 acceptance criterion.
Two required items remain; do them in the same round as `docs/reviews/T02-review.md`, before T05.

## What was verified

`schema.ts` matches section 6 column by column, including both check constraints, the unique `name_normalized`, the cascade and the `entries_exercise_date` index with descending `date` and `id`.
`drizzle/0000_initial.sql` is the generated output of that schema.
`openDatabase` creates the parent directory, skips WAL for `:memory:` and turns foreign keys on.
`runMigrations` resolves the folder from the module path, so it works from any working directory.
`buildApp` opens, migrates, decorates `db` and closes the connection in `onClose`.
`test/server/db.test.ts` covers tables after migrate, idempotent migrate, the metric default and check, the weight check at -1, 0 and null, cascade delete and the foreign key.
The commit subject uses the `feat:` form.

## F1 — Required: a database failure at startup is one log line, not a raw stack

`buildApp` now opens the database and runs migrations, and `src/server/index.ts` calls it outside any `try`.
An unwritable `DATABASE_PATH` or a failing migration crashes the process with a raw stack on stderr.
ADR-0008 wants startup failures as one structured line with the error, the way `loadConfig` failures already are.

Steps: wrap the `buildApp` call in `index.ts` in `try`/`catch`; on failure `bootLogger.error({ err: error }, 'Failed to build the app')` and `process.exit(1)`.

Acceptance, run by hand and pasted into the commit body: `DATABASE_PATH=./package.json/x.db npm start` prints exactly one JSON line at level 50 and exits with code 1.

## F2 — Required: `npm ci` exits 0 on a fresh clone

See `docs/reviews/environment.md` E1 for the facts.
On this machine `npm ci` with the npm bundled in Node 24 fails on `better-sqlite3`, and the reason given for the Docker dev sandbox, that `better-sqlite3` has to be built for Linux, is wrong; the package ships a Windows prebuild that the host loads fine.

Steps:

1. Add `"npm": ">=12"` next to `"node"` in `engines`.
2. In `README.md`, under "Running locally", state: "Requires Node.js 22 or later and npm 12 or later (`npm install -g npm@12`)."
3. In the "Docker dev sandbox" section of `README.md`, remove the sentence about `better-sqlite3` needing a Linux build; the ports are the remaining reason.
4. Change the `command` in `docker-compose.dev.yml` to install npm 12 before `npm ci`: `sh -c "npm install -g npm@12 && (test -d node_modules/fastify || npm ci); npm run dev"`.

Acceptance: `rm -rf node_modules && npm ci` exits 0 with npm 12, and `node -e "new (require('better-sqlite3'))(':memory:')"` prints nothing.

## Done

With the T02 follow-up round: all four scripts plus `npm run format:check` exit 0, commit bodies carry the summaries, fast-forward merge into `main`.
