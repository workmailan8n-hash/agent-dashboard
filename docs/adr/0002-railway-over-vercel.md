# ADR-0002: Railway over Vercel for hosting

**Status:** accepted
**Date:** 2026-03-01

## Context

Agent Dashboard needs:
- Long-lived WebSocket server for live agent state sync
- Filesystem watcher on `~/.claude/projects/*.jsonl` (local-to-cloud bridge)
- Background scheduler (cron-style sprint runs)
- Preview environments per PR

Vercel excels at serverless Next.js + edge functions but serverless is a poor fit for WebSockets and long-running processes.

## Decision

Host on Railway. Push `main` → auto-deploy. PRs open preview environments via Railway PR Environments + TG approve/skip/revert flow.

## Consequences

**Positive:**
- WebSockets work without workarounds
- Preview URLs per PR — breaking spring doesn't hit prod
- Background scheduler runs as a normal long-lived process
- Similar UX to Vercel (git-push deploy)

**Negative:**
- Railway cold-start a bit slower than Vercel edge
- No built-in CDN for static assets (not an issue — single canvas app)
- Separate billing and dashboard from the rest of the stack

## Related

- `sprint-staging` branch workflow: see `feedback_notion_sync.md` and `project_sprint_preview_flow.md` in memory
- `GITHUB_TOKEN` must be set in Railway Variables for TG approve buttons to work
