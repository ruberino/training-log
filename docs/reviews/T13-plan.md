# T13 plan — Treningslogg

Foreman's answer to the plan sent before T13 started, 2026-09-06.
The normative text is `docs/architecture.md` section 11 and ADR-0007; where the proposed plan differed, the documents win.
Build exactly this.

## Dockerfile: three stages, `node:22-alpine`

1. `build`: `node:22-alpine`, `npm install -g npm@12`, copy `package*.json`, `npm ci`, copy the source, `npm run build`.
2. `litestream`: `FROM litestream/litestream:0.3.13` as the source of the binary; no release tarball.
3. `runtime`: `node:22-alpine`, `npm install -g npm@12`, copy `package*.json`, `npm ci --omit=dev`, then `RUN node -e "require.resolve('tsx')"` so a missing runtime dependency fails the build; copy `src`, `drizzle`, `dist/client` from `build` and the binary from `litestream`; `ENV NODE_ENV=production PORT=8080 TZ=Europe/Oslo DATABASE_PATH=/data/training-log.db`; `mkdir /data` owned by the `node` user; `USER node`; `EXPOSE 8080`; `CMD ["./start.sh"]`.

Why alpine and not slim: `better-sqlite3` 13 ships `prebuilds/linuxmusl-x64.node`, so nothing is compiled, and the `node:22-alpine` image is at 22.23.x, which npm 12 accepts.
A `HEALTHCHECK` instruction is not needed; Render uses `healthCheckPath`.
`.dockerignore` excludes `node_modules`, `dist`, `data`, `.env`, `docs/reviews/screenshots`, `test`.

## start.sh, exactly ADR-0007

```sh
#!/bin/sh
set -eu
if [ -n "${LITESTREAM_BUCKET:-}" ]; then
  if [ ! -f "$DATABASE_PATH" ]; then
    litestream restore -if-replica-exists -config /app/litestream.yml "$DATABASE_PATH"
  fi
  exec litestream replicate -config /app/litestream.yml -exec "npm start"
fi
echo "WARNING: LITESTREAM_BUCKET is not set; running without replication, data is lost on restart" >&2
exec npm start
```

Migrations run inside the app after the restore, as today.

## litestream.yml

One database at `$DATABASE_PATH` with one S3 replica built from `LITESTREAM_BUCKET`, `LITESTREAM_ENDPOINT`, `LITESTREAM_ACCESS_KEY_ID`, `LITESTREAM_SECRET_ACCESS_KEY`, `force-path-style: true`.
The bucket is Ruben's existing S3-compatible bucket; Render provides no object storage and the free plan has no persistent disk, so neither appears in the plan.

## Health reports replication

ADR-0007 asks the health endpoint to expose `replication: 'off'` when the bucket is not configured.
Add an optional `LITESTREAM_BUCKET` to `config.ts` and `replication: 'on' | 'off'` to `GET /api/health`, with a test for each value.
This is a docs-backed addition to the health shape; land the one-line change to the section 7 health row as its own `docs:` commit first.

## docker-compose.yml and the restore drill

`docker-compose.yml`: one service, port 8080, named volume for `/data`, `env_file: .env`.

Run the drill against a local MinIO started from a separate `docker-compose.drill.yml`, not against the real bucket: same S3 protocol, `force-path-style: true` is what MinIO needs, no credentials of Ruben's involved and no cost.
Sequence: `up --build` with the drill env, log in and register two entries, `down`, delete the `/data` volume, `up` again, verify `/api/health` returns 200 and `GET /api/exercises` shows the entries.
Paste the drill output in the commit body and record the date and the row count in `docs/reviews/T13-drill.md`.

## render.yaml and the Render deploy

`render.yaml` per ADR-0007: one `web` service, `runtime: docker`, `plan: free`, `healthCheckPath: /api/health`, secrets `sync: false`.
Creating the service and entering `APP_PASSWORD`, `SESSION_SECRET` and the four `LITESTREAM_*` values is Ruben's step; ask him, do not invent values, and record the deploy as pending until he confirms the health check passes.

## docs/release-checklist.md

The list from T13 step 6, plus "confirm `replication: 'on'` in `/api/health` after deploy".

## Gate

Send the commit hashes before merging, as always; the drill evidence file and the pending Render step are part of the review.
