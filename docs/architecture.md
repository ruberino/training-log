# Treningslogg — architecture

Status: accepted design, not yet implemented.
Date: 2026-09-05.
Decisions referenced as `ADR-NNNN` live in `docs/adr/`.

## 1. Purpose

Treningslogg lets a household member register the weight they lift for an exercise, from time to time, in a few seconds on a phone.
The home screen always answers the question "where am I at?" for every exercise: latest weight, when it was registered, and how it moved since last time.

This is deliberately much simpler than the existing `sissel` app.
There are no workout sessions, no sets, no plans, no exercise library and no AI features.

### In scope (MVP)

- Log in with the shared household password.
- Create, rename and archive exercises.
- Register an entry: exercise, date, weight in kg or repetitions depending on the exercise, optional note.
- Exercises track either weight (the default) or repetitions, so bodyweight exercises such as pull-ups fit (ADR-0011).
- See a status list: every active exercise with latest weight, date and delta versus the previous entry.
- See an exercise page: line chart of weight over time and an editable list of entries.
- Installable on a phone home screen (PWA manifest), mobile-first layout.

### Out of scope (MVP)

- Multiple users or per-person data (ADR-0005).
- Offline editing and background sync.
- Body-weight tracking (planned phase 2, task T15).
- Import from or export to other apps.
- Native mobile apps.

## 2. Usage scenarios

1. Quick registration at the gym.
   Open the app from the home screen, tap "Registrer", pick "Benkpress", the weight field is prefilled with the last weight (80), tap "+2,5" once, tap "Lagre".
   Total time under ten seconds.
2. Check status before a workout.
   Open the app, the status list shows "Benkpress 82,5 kg, 3 dager siden, +2,5" and "Knebøy 100 kg, 12 dager siden, ±0".
3. Review progress.
   Tap "Knebøy", see the chart for the last six months, notice a plateau, fix a typo in an old entry.

## 3. Stack

| Layer | Choice | Version floor | Decision |
| --- | --- | --- | --- |
| Language | TypeScript, strict mode | 5.x | ADR-0002 |
| Runtime | Node.js | 22 LTS | ADR-0002 |
| Frontend | React, Vite, React Router, TanStack Query, Tailwind CSS, Recharts | React 19, Vite 7, Router 7, Query 5, Tailwind 4, Recharts 3 | ADR-0002 |
| Backend | Fastify with `@fastify/cookie`, `@fastify/static`, `@fastify/rate-limit` | Fastify 5 | ADR-0002 |
| Validation | zod, schemas shared between client and server | 4.x | ADR-0009 |
| Database | SQLite via `better-sqlite3`, Drizzle ORM, `drizzle-kit` migrations | Drizzle 0.4x | ADR-0004 |
| Backup | Litestream replication to S3-compatible storage | 0.3.x | ADR-0004, ADR-0007 |
| Logging | pino (the Fastify built-in logger) | 9.x | ADR-0008 |
| Tests | Vitest, React Testing Library, Fastify `inject` | Vitest 3 | ADR-0010 |
| Lint/format | ESLint flat config, typescript-eslint, Prettier | ESLint 9 | ADR-0002 |
| Packaging | Single npm package, `npm` as package manager | — | ADR-0002 |
| Deploy | Docker image on Render (free plan), `render.yaml` | — | ADR-0007 |

Confirmed with Ruben 2026-09-06, superseding the narrower reading of "version floor" used for T01–T03: the versions in the table are floors, not targets.
Pin exact versions in `package.json` and take the newest stable release on npm for every dependency, including a newer major, unless one of these stops it:

- a peer dependency range of another pinned package excludes it;
- it needs a different Node.js major than the Dockerfile uses, which is an ADR decision, so ask;
- `lint`, `typecheck`, `test` and `build` cannot pass with configuration changes only, or the upgrade contradicts a task or an ADR, so ask;
- the release is a pre-release, or its release notes call it unstable.

In those cases take the newest release that does work and record the reason in the commit body, one line per package.
Dependencies shared with the sibling app are pinned to the same version in both repositories.

## 4. System overview

```
Phone browser (PWA)
   |  HTTPS
   v
Render web service (one Docker container)
   Fastify process
     /            -> static files from dist/client (React SPA)
     /api/*       -> JSON API (auth cookie required, except /api/auth/login and /api/health)
     better-sqlite3 -> /data/training-log.db  (WAL mode)
   Litestream process (same container) -> S3 bucket (continuous replication)
```

One process serves both the SPA and the API, so there is no CORS and one deployable unit.
Litestream restores the database from S3 on container start if the local file is missing, then replicates continuously (ADR-0007).

## 5. Repository layout

```
training-log/
  docs/
    architecture.md          this file
    adr/                     decision records
    tasks.md                 implementation tasks
  src/
    shared/                  code imported by both client and server (no Node or DOM APIs)
      schemas.ts             zod schemas and inferred types for API payloads
      dates.ts               civil date helpers (YYYY-MM-DD strings), diffDays()
      normalize.ts           normalizeName(), used by the server for uniqueness and the client's ExerciseSelect for the create option
    server/
      index.ts               reads config, builds app, listens
      app.ts                 buildApp(options): registers plugins, routes, error handler, static serving
      config.ts              zod-validated environment -> Config object
      db/
        schema.ts            Drizzle table definitions
        client.ts            openDatabase(path): better-sqlite3 + drizzle, sets WAL and foreign_keys
        migrate.ts           runMigrations(db): applies ./drizzle SQL migrations
      plugins/
        auth.ts              cookie auth: login/logout/me routes and the onRequest guard
      routes/
        health.ts            GET /api/health
        exercises.ts         /api/exercises*
        entries.ts           /api/entries*
      lib/
        errors.ts            AppError classes and the error -> HTTP mapping
    client/
      index.html             Vite entry
      main.tsx               React root, router, QueryClientProvider
      App.tsx                route table and AppShell
      api/
        client.ts            fetchJson(): typed fetch wrapper, throws ApiError, redirects to /login on 401
        queries.ts           TanStack Query hooks per endpoint
      pages/
        LoginPage.tsx
        StatusPage.tsx        route /
        RegisterPage.tsx      route /register
        ExercisePage.tsx      route /exercises/:id
        ExercisesPage.tsx     route /exercises
      components/
        AppShell.tsx          bottom navigation and page container
        ExerciseStatusCard.tsx
        WeightInput.tsx
        ExerciseSelect.tsx
        TrendChart.tsx
        EntryList.tsx
        Toast.tsx
      styles.css             Tailwind entry
      public/                manifest.webmanifest, icons
  drizzle/                   generated SQL migrations, committed
  test/
    server/                  API tests using buildApp() + inject against an in-memory database
    client/                  component tests
    helpers/                 createTestApp(), fixtures
  Dockerfile
  docker-compose.yml
  litestream.yml
  render.yaml
  start.sh
  drizzle.config.ts
  vite.config.ts
  vitest.config.ts           separate from the Vite config so tests are not scoped to src/client
  tsconfig.json              base, used by the client and shared code
  tsconfig.server.json       server and shared code, Node types
  eslint.config.js
  .env.example
  package.json
  README.md
```

Rules for the layout:

- `src/shared` must not import from `src/server` or `src/client`.
- `src/client` must never import from `src/server`.
- Server code reaches the database only through Drizzle, never through raw SQL strings except inside migrations.

## 6. Domain model

Two tables in the MVP.
Identifiers are integer autoincrement.
Timestamps are ISO 8601 UTC strings, dates are civil dates as `YYYY-MM-DD` strings (ADR-0003).

```sql
CREATE TABLE exercises (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  name_normalized TEXT NOT NULL UNIQUE,
  metric          TEXT NOT NULL DEFAULT 'weight' CHECK (metric IN ('weight','reps')),
  created_at      TEXT NOT NULL,
  archived_at     TEXT
);

CREATE TABLE entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  weight_kg   REAL CHECK (weight_kg IS NULL OR (weight_kg >= 0 AND weight_kg < 1000)),
  reps        INTEGER CHECK (reps IS NULL OR (reps > 0 AND reps < 1000)),
  note        TEXT,
  created_at  TEXT NOT NULL
);

CREATE INDEX entries_exercise_date ON entries (exercise_id, date DESC, id DESC);
```

Definitions:

- `name_normalized` is `normalizeName(name)`: Unicode NFKC, trimmed, lower-cased, internal whitespace collapsed to one space.
  It gives case-insensitive uniqueness so "Benkpress" and "benkpress " are the same exercise.
- An exercise is archived by setting `archived_at`.
  Archived exercises are hidden from the status list and the register picker, but their entries are kept and still shown on the exercise page.
- `metric` says what an exercise tracks: `weight` (default) or `reps` (ADR-0011).
  For a `weight` exercise an entry must have `weight_kg > 0`; `reps` is optional.
  For a `reps` exercise an entry must have `reps`; `weight_kg` is optional extra load, `null` or `0` meaning bodyweight only.
  `metric` can be changed only while the exercise has no entries.
- The latest entry of an exercise is the entry with the greatest `(date, id)`.
  The previous entry is the next one in that order.
  Delta is computed on the metric value, `weight_kg` for `weight` exercises and `reps` for `reps` exercises: `latest - previous`, or `null` when there is no previous entry.
- Several entries on the same date are allowed.

Phase 2 (task T15) adds:

```sql
CREATE TABLE body_weight (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       TEXT NOT NULL UNIQUE,
  weight_kg  REAL NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  note       TEXT,
  created_at TEXT NOT NULL
);
```

## 7. API contract

All endpoints are under `/api`, speak JSON, and use camelCase property names.
Every endpoint except `POST /api/auth/login` and `GET /api/health` requires the auth cookie (ADR-0005).
Request bodies are validated with the zod schemas in `src/shared/schemas.ts`.
Unknown properties are rejected.

### Shared shapes

```ts
type Entry = {
  id: number;
  exerciseId: number;
  date: string;          // YYYY-MM-DD
  weightKg: number | null; // 0 <= x < 1000, at most 2 decimals; null only on reps exercises
  reps: number | null;
  note: string | null;   // max 500 chars
  createdAt: string;     // ISO UTC
};

type ExerciseSummary = {
  id: number;
  name: string;
  metric: 'weight' | 'reps';
  archivedAt: string | null;
  latest: Entry | null;
  previous: Entry | null;
  delta: number | null;  // kg for weight exercises, reps for reps exercises
};

type ExerciseDetail = ExerciseSummary & {
  entries: Entry[];      // ordered by date DESC, id DESC
};

type ApiError = {
  error: {
    code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED' | 'INTERNAL';
    message: string;
    details?: unknown;   // zod issues for VALIDATION_ERROR
    requestId: string;
  };
};
```

### Endpoints

| Method and path | Body | Response | Notes |
| --- | --- | --- | --- |
| `GET /api/health` | — | `200 { status: 'ok', version }` | No auth. Used by the Render health check. Must not touch the network. |
| `POST /api/auth/login` | `{ password }` | `204` and sets cookie | `401` on wrong password. Rate limited to 5 per minute per IP, `429` beyond. |
| `POST /api/auth/logout` | — | `204` and clears cookie | |
| `GET /api/auth/me` | — | `200 { authenticated: true }` | `401` when cookie missing or invalid. |
| `GET /api/exercises` | query `includeArchived=true` optional | `200 ExerciseSummary[]` | Sorted by latest entry date descending, exercises without entries last, then by name. |
| `POST /api/exercises` | `{ name, metric? }` | `201 ExerciseSummary` | `409 CONFLICT` if `name_normalized` exists, including archived ones. Name 1–60 chars after trim. `metric` defaults to `weight`. |
| `GET /api/exercises/:id` | — | `200 ExerciseDetail` | `404` when missing. |
| `PATCH /api/exercises/:id` | `{ name?, metric?, archived? }` | `200 ExerciseSummary` | `archived: true` sets `archived_at` to now, `false` clears it. Renaming checks uniqueness. Changing `metric` on an exercise with entries returns `409 CONFLICT`. |
| `GET /api/entries` | query `exerciseId` required, `from`, `to` optional dates | `200 Entry[]` | Ordered by date DESC, id DESC. |
| `POST /api/entries` | `{ exerciseId, date, weightKg?, reps?, note? }` | `201 Entry` | `404` when exercise missing. `weight` exercises require `weightKg > 0`; `reps` exercises require `reps` and accept `weightKg` omitted, `null` or `0`. Violations are `400 VALIDATION_ERROR`. Registering on an archived exercise is allowed. |
| `PATCH /api/entries/:id` | any subset of `{ date, weightKg, reps, note }` | `200 Entry` | `weightKg: null`, `reps: null` and `note: null` clear the field. The metric rule is re-checked on the merged entry. |
| `DELETE /api/entries/:id` | — | `204` | `404` when missing. |

### Error handling

- zod failure on body, params or query: `400 VALIDATION_ERROR` with `details` set to `error.issues`.
- Thrown `AppError` subclasses map to their status: `NotFoundError` 404, `ConflictError` 409, `UnauthorizedError` 401.
- Anything else: `500 INTERNAL`, generic message, full error logged with `requestId` (ADR-0008).
- Errors raised by Fastify or its plugins that carry a 4xx `statusCode` keep that status: 429 maps to `RATE_LIMITED` with the message `For mange forsøk. Prøv igjen om et minutt.`, every other 4xx maps to `VALIDATION_ERROR` with the message `Ugyldig forespørsel`; the original error is logged at `warn` with `requestId`.
- `requestId` is the Fastify `request.id`, also returned in the `x-request-id` header.

## 8. Frontend

### Routes

| Route | Page | Content |
| --- | --- | --- |
| `/login` | LoginPage | Password field and submit. On success go to `/`. |
| `/` | StatusPage | List of `ExerciseStatusCard`, one per active exercise. Floating "Registrer" button. Empty state explains how to add the first exercise. |
| `/register?exerciseId=` | RegisterPage | `ExerciseSelect`, then the metric field first (`WeightInput` for weight exercises, reps for reps exercises) prefilled from the latest entry, the other field optional, date (default today), note. Save returns to `/` with a toast. |
| `/exercises/:id` | ExercisePage | Header with name and latest weight, `TrendChart`, `EntryList` with inline edit and delete, rename and archive actions. |
| `/exercises` | ExercisesPage | Active and archived exercises, add new, rename, archive and unarchive. |

Bottom navigation has three tabs: Status (`/`), Registrer (`/register`), Øvelser (`/exercises`).

### Behaviour rules

- All UI text is Norwegian bokmål.
  Code, identifiers and comments are English.
- `WeightInput` is a numeric field with `inputmode="decimal"`, accepts comma or dot as decimal separator, and has −2,5 and +2,5 buttons.
- `ExerciseStatusCard` shows the metric value as the headline, `82,5 kg` for weight exercises and `12 reps` for reps exercises, with the delta in the same unit.
- On `RegisterPage` the primary field follows the metric: weight exercises show `WeightInput` first, prefilled from the latest entry, with reps optional; reps exercises show the reps field first, prefilled from the latest entry, with `WeightInput` labelled `Ekstra vekt (valgfritt)`.
- `ExerciseSelect` lists active exercises with the most recently registered first, filters as you type, and offers "Opprett «…»" when there is no match.
  Creating from the picker calls `POST /api/exercises` with `metric: 'weight'` and selects the new exercise.
- The add form on `ExercisesPage` has a metric choice, `Vekt` or `Repetisjoner`, default `Vekt`; the metric is shown as a badge on each row and is editable only while the exercise has no entries.
- Date input defaults to today in the phone local time and cannot be in the future.
- Deleting an entry asks for confirmation.
- `TrendChart` is a Recharts `LineChart` of the metric value (`weightKg` or `reps`) by `date`, with range buttons 3 mnd, 1 år, Alt.
  With fewer than two entries it shows a text instead of a chart.
- Every mutation invalidates the `['exercises']` query and the affected `['exercise', id]` query.
- A `401` from any API call clears the query cache and navigates to `/login`.
- Layout is designed for a 360 px wide phone first and must stay usable at desktop width.
- Tap targets are at least 44 × 44 px.

### State

Server state lives in TanStack Query only.
Form state is local component state.
There is no global client store.

## 9. Cross-cutting rules

### Configuration

`src/server/config.ts` parses `process.env` with zod and exits with a clear message when invalid (ADR-0008).

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | no | `development` | `production` enables `Secure` cookies and serves the built client. |
| `PORT` | no | `3000` | Listen port. The Dockerfile sets `8080`. |
| `HOST` | no | `0.0.0.0` | Listen address. |
| `DATABASE_PATH` | no | `./data/training-log.db` | SQLite file. The Dockerfile sets `/data/training-log.db`. |
| `APP_PASSWORD` | yes | — | Shared household password, at least 8 characters. |
| `SESSION_SECRET` | yes | — | HMAC key for the auth cookie, at least 32 characters. Rotating it logs everyone out. |
| `LOG_LEVEL` | no | `info` | pino level. |
| `TZ` | no | `Europe/Oslo` | Set in the Dockerfile so log timestamps use the household time zone. The server never computes "today"; see Dates and units below. |
| `LITESTREAM_BUCKET`, `LITESTREAM_ENDPOINT`, `LITESTREAM_ACCESS_KEY_ID`, `LITESTREAM_SECRET_ACCESS_KEY` | no | — | Read by `start.sh` and `litestream.yml` only. Without `LITESTREAM_BUCKET` the app runs without replication. |

### Authentication (ADR-0005)

- Login compares `password` to `APP_PASSWORD` with `crypto.timingSafeEqual` over SHA-256 digests of both values.
- The cookie is named `treningslogg_auth`.
  Its value is `hex(HMAC-SHA256(SESSION_SECRET, "treningslogg-v1"))`.
  Attributes: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` 365 days, `Secure` when `NODE_ENV=production`.
- The guard is an `onRequest` hook on every route under `/api` except `/api/auth/login` and `/api/health`.
  It recomputes the expected value and compares with `timingSafeEqual`.
- The guard runs before routing, so an unauthenticated request to an unknown `/api` path gets `401`, not `404`.
- Fastify is created with `trustProxy: true` in production, so `request.ip`, and therefore the login rate limit, uses the real client address behind the Render proxy instead of the proxy address shared by everyone.
- Static files are served without auth.
  The SPA calls `GET /api/auth/me` on load and redirects to `/login` on 401.

### Logging and errors (ADR-0008)

- Use the Fastify pino logger, `request.log` inside handlers and `app.log` elsewhere.
  `console.log` is forbidden and blocked by an ESLint rule.
- Log one line per request at `info` (Fastify default), errors at `error` with the `err` object so the stack is kept.
- Include ids that make the log line actionable: `requestId`, `exerciseId`, `entryId`.
- Never log the password or the cookie value.
  Redact `req.headers.cookie` and `req.headers.authorization` in the pino config.

### Validation (ADR-0009)

- Every request body, params and query is parsed with a zod schema before the handler runs.
- The same schemas type the client request payloads, so the client cannot send a shape the server rejects.
- Numbers from the UI are parsed on the client (comma to dot) and sent as JSON numbers.

### Dates and units

- Dates are civil dates, `YYYY-MM-DD` strings, never `Date` objects across the API.
- Weight is kilograms, stored as `REAL`, displayed with up to one decimal and Norwegian formatting ("82,5 kg").
- Reps are whole numbers, displayed as "12 reps".
- The server does not do time zone arithmetic.
  "Today" for defaults is computed on the client.

## 10. Testing strategy (ADR-0010)

| Level | Tool | What |
| --- | --- | --- |
| Server unit | Vitest | `normalizeName`, status aggregation (latest, previous, delta), config parsing. |
| Server API | Vitest + `app.inject()` | Every endpoint, happy path and each error code, against `openDatabase(':memory:')` with migrations applied. |
| Client component | Vitest + React Testing Library + jsdom | `WeightInput` parsing and buttons, `ExerciseSelect` filtering and create option, `StatusPage` rendering of deltas and empty state. |
| Build | `tsc --noEmit` for both tsconfigs, `eslint`, `vite build` | Run in CI on every PR. |

No browser end-to-end tests in the MVP.
The manual test checklist for a release is in `tasks.md` under T13.

## 11. Build, run, deploy

### Scripts

| Script | Command |
| --- | --- |
| `npm run dev` | Runs `dev:server` and `dev:client` concurrently. |
| `npm run dev:server` | `tsx watch src/server/index.ts` on port 3000. |
| `npm run dev:client` | `vite` on port 5173, proxying `/api` to `http://localhost:3000`. |
| `npm run build` | `vite build` to `dist/client`. |
| `npm start` | `tsx src/server/index.ts`, serves `dist/client` when `NODE_ENV=production`. |
| `npm test` | `vitest run`. |
| `npm run typecheck` | `tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.server.json`. |
| `npm run lint` | `eslint .` |
| `npm run format` | `prettier --write .` |
| `npm run db:generate` | `drizzle-kit generate` after editing `src/server/db/schema.ts`. |

Migrations are applied by the server itself at startup through `runMigrations(db)`, so there is no separate migrate step in production (ADR-0004).

### Docker and Render (ADR-0007)

- Multi-stage `Dockerfile`: stage 1 `node:22-alpine` runs `npm ci` and `npm run build`; stage 2 copies the Litestream binary from `litestream/litestream:0.3.13`; stage 3 `node:22-alpine` installs production dependencies, copies `src`, `drizzle` and `dist/client`, sets `NODE_ENV=production`, `PORT=8080`, `TZ=Europe/Oslo`, `DATABASE_PATH=/data/training-log.db`, and runs `start.sh`.
- `start.sh`: if `LITESTREAM_BUCKET` is set and `/data/training-log.db` is missing, run `litestream restore -if-replica-exists`; then `exec litestream replicate -exec "npm start"`; without a bucket, `exec npm start`.
- `render.yaml`: one `web` service, `runtime: docker`, `plan: free`, `healthCheckPath: /api/health`, secrets marked `sync: false`.
- `docker-compose.yml` runs the same image locally on port 8080 with a named volume for `/data`.

The Render free plan has an ephemeral disk, which is why Litestream is not optional in production (ADR-0007).

## 12. Non-functional requirements

- Registering an entry takes at most three taps after choosing the exercise, plus typing the weight when the prefilled value is wrong.
- API responses under 100 ms on the Render free plan for a database with 10 000 entries.
- Data volume is tiny: one household, a few hundred entries a year.
- Cold start on the Render free plan is accepted; the SPA shows a loading state while `GET /api/auth/me` is pending.
- Backups: Litestream replication lag under 10 seconds; restore is tested as part of T13.

## 13. Future work

- Body-weight log (T15).
- Personal records highlight and per-exercise goals.
- Export to CSV.
- Offline queue for registrations.
