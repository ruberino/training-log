# ADR-0007: One Docker container on Render with Litestream replication to S3

- Status: Accepted
- Date: 2026-09-05

## Context

`sissel` and `shopper` both deploy as one Docker container on the Render free plan.
The free plan has an ephemeral disk, so a SQLite file is lost on every deploy and restart unless it is replicated.
Both existing apps solve this with Litestream, which restores from S3 on boot and replicates continuously.
The operator already has the S3-compatible bucket and the habit.

## Decision

- One Docker image built from a multi-stage `Dockerfile`: build the client, copy the Litestream binary from `litestream/litestream:0.3.13`, and run the server with `node:22-alpine`.
- The container sets `NODE_ENV=production`, `PORT=8080`, `TZ=Europe/Oslo`, `DATABASE_PATH=/data/training-log.db`.
- `start.sh` restores the database with `litestream restore -if-replica-exists` when `LITESTREAM_BUCKET` is set and the file is missing, then runs `exec litestream replicate -exec "npm start"`.
  Without `LITESTREAM_BUCKET` it runs `exec npm start` so local Docker works without S3.
- `litestream.yml` defines one database with one S3 replica configured through `LITESTREAM_*` environment variables, `force-path-style: true`.
- `render.yaml` declares one `web` service, `runtime: docker`, `plan: free`, `healthCheckPath: /api/health`, with secrets as `sync: false`.
- Migrations run inside the app at startup (ADR-0004), after the restore and before listening.
- A restore drill (delete the local file, restart, verify data) is part of the deployment task and must be repeated after any change to `start.sh` or `litestream.yml`.

## Consequences

- Same operational model as the two existing apps; one mental model for the operator.
- Deploys on the free plan lose nothing as long as replication is healthy; monitor Litestream logs.
- Cold starts on the free plan are slow; accepted for a household app.
- Only one instance may run at a time, which Render guarantees for a single web service.
- If the bucket credentials are wrong, the app still starts without replication; `start.sh` must log this loudly and the health endpoint should expose `replication: 'off'` so it is visible.

## Alternatives considered

- Render persistent disk on a paid plan: simpler, but costs money for a tiny app and still needs backups.
- Fly.io with a volume: `shopper` has a `fly.toml`, but Render is where the current apps live.
- Managed Postgres: more robust for multi-instance, unnecessary here and adds a paid service.
- Home server: no public HTTPS without extra setup, and availability depends on the home network.
