# Specs

Feature specs for Agent Dashboard live here, one file per feature (e.g. `wall-editor.md`, `sprint-preview-flow.md`).

## Convention

Per [`c:/AI/CLAUDE.md`](../../CLAUDE.md) rule **A6**, non-trivial work starts with a short spec using stable identifiers so future sessions can reference specific decisions without re-reading code:

- **REQ-N** — requirement (what / why)
- **TASK-N** — implementation step (how)
- **SVC-N** — service / module boundary

Skip the spec for: bug fixes, isolated changes, refactors <50 LOC.

## Conflict-check

After major changes, verify code still matches the spec. If it diverged, update the spec — never silently abandon it.

## Background

See [memory/feedback_fullspec_approach.md](../../../Users/frost/.claude/projects/c--AI/memory/feedback_fullspec_approach.md) for the full rationale and examples.

## Index

Living plans (not yet moved here) currently live in Claude memory:

- `memory/project_wall_editor.md` — wall editor feature
- `memory/project_sprint_preview_flow.md` — sprint flow
- `memory/project_bottom_zone_redesign.md` — 4 walled rooms
