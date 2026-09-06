# Treningslogg

A small web app for a household to log the weight or repetitions they lift for an exercise, over time.
The home screen always answers "where am I at?": the latest value per exercise, when it was registered, and the delta since last time.

See `docs/architecture.md` for the full design and `docs/adr/` for the decisions behind it.
`docs/tasks.md` holds the ordered implementation tasks.

## Running locally

Requires Node.js 22 or later and npm 12 or later (`npm install -g npm@12`; on a Node older than 22.22.2 or 24.15 run `npx npm@12 ci` instead, or update Node).

```bash
npm install
cp .env.example .env
# edit .env and set APP_PASSWORD and SESSION_SECRET
npm run dev
```

This runs the Fastify API on `http://localhost:3000` and the Vite dev server on `http://localhost:5173`, with `/api` proxied to the Fastify process.
`npm install` also installs a git hook that refuses commits on `main`.

## Scripts

| Script                 | What it does                                                         |
| ---------------------- | -------------------------------------------------------------------- |
| `npm run dev`          | Runs the server and the client dev servers together.                 |
| `npm run build`        | Builds the client into `dist/client`.                                |
| `npm start`            | Runs the server; serves the built client when `NODE_ENV=production`. |
| `npm test`             | Runs the test suite with Vitest.                                     |
| `npm run typecheck`    | Type-checks the client/shared and server/shared code separately.     |
| `npm run lint`         | Lints the codebase with ESLint.                                      |
| `npm run format`       | Formats the codebase with Prettier.                                  |
| `npm run format:check` | Checks formatting with Prettier, without writing changes.            |
| `npm run db:generate`  | Generates a Drizzle SQL migration from `src/server/db/schema.ts`.    |

## Docker dev sandbox

`docker-compose.dev.yml` runs `npm run dev` inside a `node:22` container instead of on the host.
It exists because the host's own `3000`/`5173` are already in use by other projects on this machine.
It is not the production image; see "Deploy" below for that.

```bash
docker compose -f docker-compose.dev.yml up
```

The API is reachable at `http://localhost:28300` and the client at `http://localhost:28173`.
Neither `tsx`'s nor Vite's file watcher reliably sees host-side edits through the bind mount on Windows, so after changing any source file (client or server), restart the container:

```bash
docker compose -f docker-compose.dev.yml restart app
```

Changing `docker-compose.dev.yml` itself needs `up -d` (recreate), not just `restart`, since `restart` reuses the existing container's environment.

## Deploy

`Dockerfile` builds the production image: a multi-stage build compiles the client, copies the Litestream binary from `litestream/litestream:0.3.13`, and runs on `node:22-alpine`.
See `docs/architecture.md` section 11 and ADR-0007 for the full design.

Run the production image locally:

```bash
cp .env.example .env
# edit .env and set APP_PASSWORD, SESSION_SECRET, and (optionally) the LITESTREAM_* variables
docker compose up --build
```

The app is reachable at `http://localhost:8080`, and `/api/health` returns 200.
Without `LITESTREAM_BUCKET` set, the container starts and logs a warning that data is lost on restart; with it set, `start.sh` restores from the replica on boot and replicates continuously.

### Restore drill

Repeat this after any change to `start.sh` or `litestream.yml` (ADR-0007).
It runs against a local MinIO started from `docker-compose.drill.yml`, never against the real bucket.

```bash
docker compose -f docker-compose.drill.yml up --build -d
# log in, add an exercise, register a couple of entries
docker compose -f docker-compose.drill.yml down
docker volume rm training-log_app-data
docker compose -f docker-compose.drill.yml up -d
# check http://localhost:8080/api/health and that the entries are back
docker compose -f docker-compose.drill.yml down -v
```

See `docs/reviews/T13-drill.md` for the last recorded run.

### Render

`render.yaml` declares one `web` service, `runtime: docker`, `plan: free`, `healthCheckPath: /api/health`.
Creating the service and setting `APP_PASSWORD`, `SESSION_SECRET` and the four `LITESTREAM_*` secrets is a manual step in the Render dashboard; the blueprint marks them `sync: false` for exactly that reason.
