# ADR-0009: zod schemas shared between client and server

- Status: Accepted
- Date: 2026-09-05

## Context

The API is small but every endpoint has a request shape with constraints (weight range, date format, name length).
Duplicating those rules on both sides leads to drift.
Fastify has its own JSON Schema validation, but that gives no TypeScript types on the client without extra tooling.

## Decision

- All request and response shapes are defined once as zod schemas in `src/shared/schemas.ts`, with inferred types exported next to them.
- Schemas are strict: unknown keys are rejected with `.strict()`.
- The server parses `body`, `params` and `query` with these schemas in a small helper before the handler body runs; failures become `400 VALIDATION_ERROR` (ADR-0008).
- The client uses the inferred types for request payloads and optionally parses responses in development to catch contract drift.
- Domain rules that need the database (uniqueness, existence) are not in zod; they live in the route handlers and throw `ConflictError` or `NotFoundError`.

## Consequences

- One definition per shape, typed end to end, no code generation.
- `src/shared` must stay free of Node and DOM APIs so it bundles on both sides.
- zod adds a few kilobytes to the client bundle; acceptable.

## Alternatives considered

- Fastify JSON Schema with `@fastify/type-provider-typebox`: typed on the server, but sharing with the client is clumsier than importing a module.
- OpenAPI with generated clients: heavy tooling for a five-endpoint API.
- No shared validation: the drift risk is exactly what this ADR prevents.
