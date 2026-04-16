# Feature specs

Lightweight spec files for in-progress features. Each spec uses REQ/TASK/SVC identifiers (see `feedback_fullspec_approach.md` in memory).

## Active specs

_(empty — add one per feature in progress)_

## Template

```md
# <Feature name>

## Requirements
- REQ-1: <what success looks like>
- REQ-2: ...

## Design
- SVC-N: <service/module>
- Data model, contracts, key decisions

## Tasks
- TASK-1: <concrete step>
- TASK-2: ...

## Status
- started: YYYY-MM-DD
- conflict-check: last run YYYY-MM-DD
```

## When to write a spec

- Non-trivial feature (>50 lines, touches multiple files)
- Skip for: bug fixes, cosmetic changes, refactors of ≤50 lines

## When to retire a spec

Move to `docs/specs/archive/<name>.md` once feature shipped. Keep for context.
