# ADR-0011: Exercises track either weight or repetitions

- Status: Accepted
- Date: 2026-09-05
- Extends ADR-0003

## Context

ADR-0003 made an entry a snapshot with a required weight above zero.
Bodyweight exercises such as pull-ups, dips and push-ups have no weight to register; progress there is repetitions, sometimes with extra load on top of bodyweight.
With weight required, these exercises could not be logged at all, or would be logged with invented weights.

## Decision

- Every exercise has a `metric`, `weight` (default) or `reps`, chosen when the exercise is created and changeable only while it has no entries.
- For `weight` exercises an entry requires `weight_kg > 0`; `reps` stays optional.
- For `reps` exercises an entry requires `reps`; `weight_kg` is optional extra load, `null` or `0` meaning bodyweight only.
- `weight_kg` becomes nullable in the database with the check `weight_kg IS NULL OR (weight_kg >= 0 AND weight_kg < 1000)`; the per-metric rule is enforced by the API.
- Status, delta and the trend chart use the metric value: kilograms for `weight`, repetitions for `reps`.
- The API field `deltaKg` is replaced by `delta`, in the unit of the metric, and `ExerciseSummary` carries `metric`.

## Consequences

- Bodyweight exercises fit the snapshot model without a second concept.
- The register form, status card and chart each branch on one field.
- Time-based exercises (plank seconds) are still not modelled; register seconds as reps if needed, or extend `metric` in a later ADR.
- Locking `metric` once entries exist keeps every stored entry valid without data migration.

## Alternatives considered

- Allow `weight_kg = 0` with no metric concept: status would show "0 kg" and deltas would be meaningless for those exercises.
- Optional weight and optional reps with no rule: entries with neither value become possible and status has nothing to show.
- A separate bodyweight-exercise entity: duplicates the exercise table for one flag.
