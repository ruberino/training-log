# Restore drill — Treningslogg

Date: 2026-09-06 (host local time; container logs are UTC).
Run against a local MinIO via `docker-compose.drill.yml`, not the real bucket.

## Sequence and result

1. `docker compose -f docker-compose.drill.yml up --build -d` — MinIO healthy, `createbucket` created `local/training-log-drill`, app started with `LITESTREAM_BUCKET=training-log-drill` pointed at `http://minio:9000`.
2. Logged in (`drill-password-123`), created exercise `Drill markloft` (id 1, metric `weight`), registered two entries: 80 kg on 2026-09-01, 85 kg on 2026-09-06.
3. Confirmed Litestream wrote a snapshot and WAL segments to the MinIO replica after each write (`msg="wal segment written"` in the app logs).
4. `docker compose -f docker-compose.drill.yml down`, then `docker volume rm training-log_app-data` — deletes the app's local SQLite file entirely, simulating Render's ephemeral disk. The MinIO volume (the replica) was left in place.
5. `docker compose -f docker-compose.drill.yml up -d` on the now-empty app volume.

## Evidence

Restore ran before the app started listening:

```
time=2026-09-06T17:26:39.476Z level=INFO msg="restoring snapshot" db=/data/training-log.db replica=s3 generation=0e7a07f5ec3ffefd index=0 path=/data/training-log.db.tmp
time=2026-09-06T17:26:39.484Z level=INFO msg="restoring wal files" db=/data/training-log.db replica=s3 generation=0e7a07f5ec3ffefd index_min=0 index_max=0
time=2026-09-06T17:26:39.506Z level=INFO msg="downloaded wal" db=/data/training-log.db replica=s3 generation=0e7a07f5ec3ffefd index=0 elapsed=21.301714ms
time=2026-09-06T17:26:39.512Z level=INFO msg="applied wal" db=/data/training-log.db replica=s3 generation=0e7a07f5ec3ffefd index=0 elapsed=6.310347ms
time=2026-09-06T17:26:39.512Z level=INFO msg="renaming database from temporary location" db=/data/training-log.db replica=s3
time=2026-09-06T17:26:39.545Z level=INFO msg=litestream version=v0.3.13
time=2026-09-06T17:26:39.545Z level=INFO msg="initialized db" path=/data/training-log.db
time=2026-09-06T17:26:39.545Z level=INFO msg="replicating to" name=s3 type=s3 sync-interval=1s bucket=training-log-drill path="" region="" endpoint=http://minio:9000
```

`GET /api/health` after restart:

```json
{ "status": "ok", "version": "0.1.0", "replication": "on" }
```

`GET /api/exercises?includeArchived=true` after restart — both entries and the correct delta survived:

```json
[
  {
    "id": 1,
    "name": "Drill markloft",
    "metric": "weight",
    "archivedAt": null,
    "latest": { "id": 2, "exerciseId": 1, "date": "2026-09-06", "weightKg": 85, "reps": null, "note": "drill entry 2", "createdAt": "2026-09-06T17:26:09.815Z" },
    "previous": { "id": 1, "exerciseId": 1, "date": "2026-09-01", "weightKg": 80, "reps": null, "note": "drill entry 1", "createdAt": "2026-09-06T17:26:09.770Z" },
    "delta": 5
  }
]
```

**Row count recovered: 1 exercise, 2 entries.** Exactly what was created before the drill, nothing more, nothing less.

## Outcome

Restore works as designed. `docker compose -f docker-compose.drill.yml down -v` removed both volumes afterward; nothing left running.
