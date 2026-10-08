# Project state (checkpoint 2026-10-08)

## Phase
Stage 7 (hardening) for the first release candidate. Stages 0–6 are implemented for MVP scope. **Not deployed.** Launch is blocked on people, not on engineering (see TASK_BACKLOG "Launch blockers").

## Status
| Area | Status |
|---|---|
| Stage 0 research and feasibility | COMPLETE (method-limited: re-verify RG-01) |
| Foundation: schema, migrations, auth, roles, CI | COMPLETE |
| Provider data and verification: self-listing, claims, submissions, verification, disputes, freshness, import gate | COMPLETE |
| Marketplace UX: home, search, profile, compare, landing pages, admin, provider dashboard | COMPLETE |
| Matching and leads: assessment, matching, consent, routing, outbox, erasure, retention | COMPLETE |
| SEO/AEO plumbing | COMPLETE (technical only; no indexing claimed) |
| Commercial systems | COMPLETE in test mode; live billing BLOCKED (OPS-02) |
| Hardening: adversarial review, fixes | IN PROGRESS (review follow-ups open) |
| Production readiness: Dockerfile, health, runbook, backups | IN PROGRESS (hosting BLOCKED, OPS-01) |
| Real supply and real content | BLOCKED (BIZ-04, CT-01) |

## Where things are
- Repo: `DipurajThapa/uae-tax-marketplace`, PR #1 (draft) from `claude/fervent-newton-l7gdzb` into `main`.
- Local DBs: `marketplace_dev` (demo), `marketplace_test`, `marketplace_e2e`.

## Next executable task
1. Get PR #1 CI green on GitHub (the latest push carries the fixes; see EVIDENCE_LOG CI history).
2. Review follow-ups in order: M9 (email verification for self-registration), L6 (dedupe response leaks another buyer's ref), L3 (map flash messages to codes), L8 (custom error page), L9 (note: 0002 migration needs a default on non-empty DBs).
3. Then ENG-07 (individual professionals UI) and ENG-09 (guide editor), since content and people are needed before launch.

## How to resume
`cat docs/PROJECT_STATE.md docs/TASK_BACKLOG.md`, then `npm ci && npm run db:migrate && npm run db:seed -- --demo && npm run check`.
