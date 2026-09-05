# ADR-0002: Single TypeScript package with React + Vite frontend and Fastify backend

- Status: Accepted
- Date: 2026-09-05

## Context

The household already runs two apps on the same pattern: `sissel` (React + Vite + Fastify + Prisma + SQLite, pnpm workspace with two packages) and `shopper` (React + Vite + Express + better-sqlite3, two nested packages).
Both work, but the two-package layout doubles the amount of configuration, dependency updates and build steps.
The new app is small and will be implemented by smaller models, which do best with well-known libraries and few moving parts.
Quality, simplicity and long-term maintainability matter more than development cost.

## Decision

- One npm package at the repository root with `src/client`, `src/server` and `src/shared`.
- Frontend: React 19, Vite 7, React Router 7, TanStack Query 5, Tailwind CSS 4, Recharts 3.
- Backend: Fastify 5 with `@fastify/cookie`, `@fastify/static` and `@fastify/rate-limit`.
- TypeScript strict mode everywhere, two tsconfig files: `tsconfig.json` for client and shared (DOM types) and `tsconfig.server.json` for server and shared (Node types).
- The server runs with `tsx` in development and production, matching `sissel`; there is no separate server build step, and `tsx` is therefore a regular dependency that survives `npm ci --omit=dev`.
- `npm` is the package manager; no workspaces.
- ESLint 9 flat config with typescript-eslint, plus Prettier.
- The production server serves the built SPA from `dist/client` and the API from `/api` on the same origin.

## Consequences

- One `package.json`, one lockfile, one CI pipeline, one Docker build.
- `src/shared` gives end-to-end types and validation schemas without a publishing step.
- Client and server dependency trees mix in one `node_modules`; acceptable at this size.
- `tsx` in production adds a small startup cost and a runtime dependency; accepted for simplicity and parity with `sissel`.
- Vite must be configured with `root: 'src/client'` and `build.outDir: '../../dist/client'`.

## Alternatives considered

- Two packages in a pnpm workspace like `sissel`: known to work, but twice the configuration for no benefit at this size.
- Next.js full-stack: one framework, but server/client component rules and caching semantics are a frequent source of mistakes for smaller models.
- Server-rendered HTML with HTMX: simplest possible, but a weaker phone experience for chart interaction and quick numeric entry.
- Prisma instead of Drizzle: covered in ADR-0004.
