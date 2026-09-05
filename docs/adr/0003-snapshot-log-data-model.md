# ADR-0003: Snapshot log data model instead of workout sessions

- Status: Accepted
- Date: 2026-09-05

## Context

The user wants to "register exercises and weight from time to time to see where I am at any time", and wants it simple and easy to use.
The existing `sissel` app already models full workouts with sessions and sets, and it is more work to use than this need requires.
The question is whether an entry is a snapshot ("today I lifted 80 kg in bench press") or part of a structured workout.

## Decision

An entry is a snapshot: `exercise`, `date`, `weight_kg`, optional `reps`, optional `note`.
There is no session, set or program concept.
"Where am I at" for an exercise is defined as the latest entry by `(date, id)`, and progress is the delta to the previous entry.
Several entries per exercise per day are allowed and simply appear as separate points.

Dates are civil dates stored as `YYYY-MM-DD` text.
Timestamps (`created_at`, `archived_at`) are ISO 8601 UTC text.
Weight is kilograms stored as `REAL` with at most two decimals accepted from the API.

## Consequences

- Registration is one form with one required number, which is the whole point of the app.
- Charts and status are trivial queries over one table.
- Volume or intensity analysis (sets × reps × weight) is not possible; that is what `sissel` is for.
- If sessions are ever needed, a `session_id` column can be added to `entries` without breaking existing data.

## Alternatives considered

- Sessions with sets like `sissel`: richer data, more taps per registration, and it duplicates an app that already exists.
- Free-text log: easiest to build, but no chart or delta without parsing.
- Storing timestamps instead of dates for entries: a gym visit is a day-level event for this use, and civil dates avoid time zone bugs across phone and server.
