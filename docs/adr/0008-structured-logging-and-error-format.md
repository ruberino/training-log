# ADR-0008: Structured logging with pino and one error format

- Status: Accepted
- Date: 2026-09-05

## Context

Errors must be triage-ready: found via logs, with a stack and enough ids to act on.
Fastify ships pino, which writes structured JSON lines that Render captures.
Smaller models tend to sprinkle `console.log`, swallow errors or return inconsistent error bodies unless the rules are explicit.

## Decision

- Fastify is created with `logger: { level: config.logLevel, redact: ['req.headers.cookie', 'req.headers.authorization'] }`.
- Inside handlers use `request.log`; elsewhere use `app.log` or a child logger with a `module` field.
- `console.*` is forbidden in `src/` and enforced with the ESLint `no-console` rule set to `error`.
- Errors are thrown as real `Error` objects.
  `src/server/lib/errors.ts` defines `AppError` with `statusCode` and `code`, and subclasses `NotFoundError`, `ConflictError`, `UnauthorizedError`, `ValidationError`.
- One `setErrorHandler` maps errors to the body `{ error: { code, message, details?, requestId } }`.
  zod errors become `400 VALIDATION_ERROR` with `details = issues`.
  `AppError` uses its own status and code.
  Everything else becomes `500 INTERNAL` with a generic message, and the full error is logged at `error` level with `err` and `requestId`.
- Log lines that concern an entity include its id (`exerciseId`, `entryId`).
- Config validation failure at startup logs the zod issues and exits with code 1.
- Never log secrets: password, cookie values, `SESSION_SECRET`.

## Consequences

- Every 500 in production has a log line with a stack and a request id that the client also received.
- The client can rely on one error shape and show `message` for 4xx and a generic text for 5xx.
- Slightly more boilerplate in route handlers; the shared helpers keep it small.

## Alternatives considered

- `console.log` with plain text: unstructured, no levels, no redaction.
- winston: works, but pino is already integrated with Fastify and faster.
- Returning Fastify default error bodies: shape varies between validation and runtime errors, which complicates the client.
