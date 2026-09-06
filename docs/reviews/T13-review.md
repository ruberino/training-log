# Review follow-up: T13 — Treningslogg

Review of commits `1b4ae88` (docs) and `9dccb85` (T13) on `task/T13-docker-render`, 2026-09-06.
Verdict: approved for fast-forward merge; the Render deploy stays pending until Ruben has created the service.

## What was verified

All five scripts exit 0 on the branch; 174 tests pass.
The `Dockerfile` follows `docs/reviews/T13-plan.md` and ADR-0007: three stages on `node:22-alpine`, `npm install -g npm@12` in both npm stages, the Litestream binary copied from `litestream/litestream:0.3.13`, `npm ci --omit=dev` followed by the `require.resolve('tsx')` check, `src`, `drizzle`, `dist/client`, `litestream.yml` and `start.sh` copied, the documented `ENV`, `/data` owned by `node`, `USER node`, `EXPOSE 8080`, no `HEALTHCHECK`.
`start.sh` and `litestream.yml` are the plan's text; `docker-compose.yml` has port 8080, the named `/data` volume and `env_file: .env`; `docker-compose.drill.yml` brings up MinIO, creates the bucket and runs the app against it; `render.yaml` declares the free web service with the health check and six `sync: false` secrets.
`GET /api/health` reports `replication: 'on' | 'off'` from `LITESTREAM_BUCKET`, with the section 7 row updated in its own docs commit first and tests for both values.
The empty-string `LITESTREAM_BUCKET` from an `env_file` is treated as unset, with a regression test; without that fix the documented no-replication `.env` would have kept the container from booting, so this was a real find.
`docs/reviews/T13-drill.md` records a full drill against MinIO on 2026-09-06: two entries written, the app volume deleted, Litestream restored before the app listened, `replication: 'on'`, one exercise and two entries back with the correct delta.
The README deploy section and `docs/release-checklist.md` are in place, and the pre-commit hook kept both commits off `main`.

## Pending, Ruben's step

Creating the Render service from `render.yaml` and entering `APP_PASSWORD`, `SESSION_SECRET` and the four `LITESTREAM_*` values.
Ruben confirmed his other household apps run in Frankfurt; `region: frankfurt` was added to `render.yaml` and merged as `99f123b`, so the service will deploy there.
He also confirmed he does not want a GitHub repository created yet (T14 proceeds without one, unverified until a remote exists).
Record the outcome here once the health check passes on Render, together with the phone installation checks from T12, which the Render URL makes possible.

## Done

Fast-forward merge now.
