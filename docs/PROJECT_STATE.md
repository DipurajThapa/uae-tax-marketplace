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
| Hardening: adversarial review, fixes | COMPLETE except M10 (counsel) and nonce CSP (ENG-15) |
| Production readiness: Dockerfile, health, runbook, backups | IN PROGRESS (hosting BLOCKED, OPS-01) |
| Real supply and real content | BLOCKED (BIZ-04, CT-01) |

## Where things are
- Repo: `DipurajThapa/uae-tax-marketplace`. `main` contains PR #1 (merged). The review follow-ups are on `claude/fervent-newton-l7gdzb` in a new PR.
- Local DBs: `marketplace_dev` (demo), `marketplace_test`, `marketplace_e2e`.

## Next executable task
1. Merge the follow-ups PR once CI is green.
2. ENG-15 nonce-based CSP; ENG-07 individual professionals UI; ENG-09 guide editor.
3. Everything else waits on owner or counsel items (TASK_BACKLOG "Launch blockers").

## How to resume
`cat docs/PROJECT_STATE.md docs/TASK_BACKLOG.md`, then `npm ci && npm run db:migrate && npm run db:seed -- --demo && npm run check`.
