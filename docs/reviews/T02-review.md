# Review follow-up: T02 — Treningslogg

Review of commit `6d0a277` (T02), now on `main`, 2026-09-06.
Verdict: approved with required follow-up.
The skeleton matches T02 and ADR-0008 in structure, but the error handler mishandles one common case, one workaround is misdiagnosed, and user-facing messages break a convention.
T05 does not start before every required item below is merged into `main`.

Order of work:

1. Finish and commit T04 if it is still open.
2. Make the docs commit from `docs/reviews/T01-review.md` F0, extended with the two verbatim clarifications in F1 and F3 below; that F0 commit is still open.
3. Do F1 to F6 below as separate commits: on the T04 branch before its fast-forward merge if T04 is still open, otherwise on a branch `fix/T02-T03-review` off `main`.
4. Run the four scripts plus `npm run format:check`, then fast-forward merge into `main`.
5. Do `docs/reviews/T01-review.md` F5 (dependency upgrade) on its own `chore/` branch.
6. Then T05.

The rules in `AGENTS.md` apply.
Verbatim text marked for the docs commit goes in exactly as written; make no other change to `docs/architecture.md`, `AGENTS.md` or any ADR.

## What was verified

`npm run lint`, `npm run typecheck` and `npm run build` exit 0 at `6d0a277` in a clean checkout, and all 13 tests pass on a warm module cache.
Every T02 acceptance criterion holds: health returns 200 with the package version; `/api/nope` returns the `NOT_FOUND` shape with `x-request-id` equal to the body's `requestId`; a thrown `Error` returns `500 INTERNAL` with a generic message and no stack; a missing `APP_PASSWORD` makes `loadConfig` throw naming the variable.
In production mode `/` and deep links such as `/exercises/12` serve `index.html`, `@fastify/static` is registered only in production, dotenv is loaded only in `index.ts`, redaction and `trustProxy` are set, a `ZodError` becomes `400 VALIDATION_ERROR` with `details` and a Norwegian message, and incoming `request-id` headers are ignored.

## F1 — Required: a malformed JSON body returns 500 INTERNAL and is logged as a server error

Reproduced at `6d0a277`: `POST` to any route with `content-type: application/json` and the body `{bad json` returns `500 {"error":{"code":"INTERNAL",…}}` and logs at `error`.
Fastify's content-type parser rejects the body with an error that carries `statusCode: 400`.
The handler ignores `statusCode` on anything that is not an `AppError`, so a client mistake is reported and logged as a server failure.
The same happens for 413 (body too large), 415 (unsupported media type) and, from T04 on, 429 from `@fastify/rate-limit`.

Architect clarification for `docs/architecture.md` section 7, "Error handling"; add this bullet verbatim in the F0 docs commit, after the "Anything else" bullet:

```md
- Errors raised by Fastify or its plugins that carry a 4xx `statusCode` keep that status: 429 maps to `RATE_LIMITED` with the message `For mange forsøk. Prøv igjen om et minutt.`, every other 4xx maps to `VALIDATION_ERROR` with the message `Ugyldig forespørsel`; the original error is logged at `warn` with `requestId`.
```

Steps:

1. In `setErrorHandler`, after the `AppError` branch, add one branch for errors with a numeric `statusCode` between 400 and 499 that implements the bullet above.
   If T04 already added a 429 branch, fold it into this one so Fastify 4xx errors have a single branch.
2. Add tests to `test/server/errors.test.ts`: malformed JSON body returns `400 VALIDATION_ERROR` with `x-request-id` equal to the body's `requestId`; `content-type: application/xml` returns `415 VALIDATION_ERROR`.
3. Keep the "boom" test green: a thrown `Error` without `statusCode` still returns `500 INTERNAL`.

Acceptance: the three tests pass.

## F2 — Required: remove `pool: 'forks'` and its comment from `vitest.config.ts`

The comment and the commit body claim that "Fastify's `app.inject()` hangs under Vitest's default worker_threads pool".
Vitest 3's default pool is already `forks`, so the line changes nothing, and the comment names a cause that was never verified.
What actually happens: on a cold module cache the first `app.inject()` test exceeds the 5 s default timeout.
Reproduced on a fresh `node_modules`: 5 s timeout on the first run, 160 ms on the second, identical with `--pool=threads` and `--pool=forks`.

Steps:

1. Delete the `pool` line and its comment.
2. Add `testTimeout: 15000` under `test`, with the comment "First Fastify boot on a cold module cache can exceed 5 s on Windows."

A workaround comment states the reproduction and the verified cause, so the next reader can tell whether it still applies.

Acceptance: `npm test` passes twice in a row.

## F3 — Required: user-facing error messages are Norwegian

ADR-0008 says the client shows `message` for every 4xx.
The defaults in `src/server/lib/errors.ts` are English (`Not found`, `Unauthorized`, `Invalid request`, `Internal server error`) while the `ZodError` branch says `Ugyldig forespørsel`.

Steps:

1. Defaults: `NotFoundError` → `Finnes ikke`, `UnauthorizedError` → `Ikke innlogget`, `ValidationError` → `Ugyldig forespørsel`, the `INTERNAL` body → `Noe gikk galt`.
   `ConflictError` keeps no default; every caller passes a Norwegian message.
2. Update the not-found test to assert the message `Finnes ikke`.
3. In the F0 docs commit, replace the `AGENTS.md` bullet that starts with "UI text is Norwegian bokmål" with:

```md
- UI text is Norwegian bokmål, including every `message` in an error body, because the client displays it; code, comments, commits and PRs are English.
```

Acceptance: `grep -n "'[A-Z][a-z]* [a-z ]*'" src/server/lib/errors.ts` prints no English default messages, and the tests pass.

## F4 — Required: request ids that survive a restart

Fastify's default request id is `req-1`, `req-2`, … per process.
After a Render restart the same ids appear again, so a `requestId` from a user report matches several log lines.

Steps: pass `genReqId: () => randomUUID()` (from `node:crypto`) in the Fastify options.
Leave `requestIdHeader` at its default; incoming `request-id` and `x-request-id` headers are already ignored.

Acceptance: a test shows two health requests get different ids matching `/^[0-9a-f-]{36}$/`.

## F5 — Required: assert the log line, and keep test output quiet

The test named "logs the real error" asserts nothing about logging, and every test prints request logs to stdout.

Steps:

1. Add `logStream?: DestinationStream` (type from `pino`) to `BuildAppOptions`; when given, pass it as `stream` in the Fastify `logger` options.
2. Change `createTestApp` to `createTestApp(options?: { env?: Record<string, string>; logSink?: object[] })`.
   With `logSink`, write each JSON log line parsed into the array through a `Writable`; without it, write to a `Writable` that discards.
3. In the `INTERNAL` test, assert one line with `level` 50, `err.message` `boom` and `requestId` equal to the body's.
4. In the F1 malformed-JSON test, assert one line with `level` 40.

Acceptance: `npm test` prints no request log lines, and the two assertions pass.

## F6 — Recommended: SPA fallback only for HTML navigations, and production behaviour under test

Reproduced at `6d0a277` in production mode: `GET /assets/missing.js` returns `200` with `index.html`.
A missing asset must be a 404 so a broken deploy is visible.

Steps:

1. Add `clientDir?: string` to `BuildAppOptions`, default `dist/client`, used for both `@fastify/static` and the fallback.
2. In the not-found handler, serve `index.html` only for `GET` requests whose `accept` header includes `text/html`; everything else gets the JSON `NOT_FOUND` shape.
3. Add `test/fixtures/client/index.html` (a few lines) and a production-mode test: `/` and `/exercises/12` with `accept: text/html` return the fixture, `/assets/missing.js` returns 404, `/api/nope` returns JSON.

Acceptance: the test passes, and `npm run build && NODE_ENV=production npm start` still serves the real client.

## F7 — Process

The T02 commit also changed `docker-compose.dev.yml`, which no task names.
A task commit contains the files the task names; everything else is its own `chore:` commit, as you did afterwards for the T01 follow-up.

## Done

All four scripts plus `npm run format:check` exit 0.
The body of each commit carries the script summary and anything you noticed but did not change.
Then fast-forward merge into `main`.
