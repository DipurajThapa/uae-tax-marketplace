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
| Hardening: adversarial review, fixes | COMPLETE except M10 (counsel); second review fixed, provider MFA accepted as R-11 |
| Production readiness: Dockerfile, health, runbook, backups | IN PROGRESS (hosting BLOCKED, OPS-01) |
| Real supply and real content | BLOCKED (BIZ-04, CT-01) |

## Where things are
- Repo `DipurajThapa/uae-tax-marketplace`: PRs #1 and #2 merged; PR #3 (ENG-15/13/07/09/10/04/11) open on `claude/fervent-newton-l7gdzb`.
- Local DBs: `marketplace_dev` (demo), `marketplace_test`, `marketplace_e2e`, `marketplace_bench`.

## Next executable task
1. Get PR #3 green and merged (second-review fixes included).
2. Engineering left without owner input: ENG-16 (optional provider MFA).
3. Everything else is blocked on the owner or counsel: see `docs/OWNER_QUESTIONS.md`.

## How to resume
`cat docs/PROJECT_STATE.md docs/TASK_BACKLOG.md`, then `npm ci && npm run db:migrate && npm run db:seed -- --demo && npm run check`.
