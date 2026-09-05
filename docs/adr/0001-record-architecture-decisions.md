# ADR-0001: Record architecture decisions

- Status: Accepted
- Date: 2026-09-05

## Context

The app will be implemented largely by AI coding agents, possibly smaller models, one task at a time.
An agent that only sees the code cannot tell which choices were deliberate and which were accidental.
Without written decisions, each task risks re-deciding the stack, the auth model or the data model.

## Decision

We record every architecturally significant decision as an ADR in `docs/adr/`, using the template in `docs/adr/README.md`.
A decision is significant when it is expensive to reverse or when it constrains several tasks.
Accepted ADRs are immutable except for their status line.
Changing a decision means writing a new ADR that supersedes the old one.

Implementers must read all ADRs before starting a task and must stop and ask when a task requires a decision no ADR covers.

## Consequences

- Reviewers can check a PR against the ADRs instead of re-arguing choices.
- Small models get an explicit list of constraints instead of having to infer them.
- Writing an ADR costs a few minutes per decision, which is cheap compared to a re-implementation.

## Alternatives considered

- Only `architecture.md`: it describes the result but not the reasoning, so agents cannot judge when a deviation is acceptable.
- Decisions in PR descriptions: scattered and not discoverable from the repository.
