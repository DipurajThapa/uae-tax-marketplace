# UAE tax & compliance marketplace (working name: TaxPro Directory UAE)

A two-sided marketplace that helps UAE businesses find Corporate Tax, VAT and e-invoicing professionals, check their registrations, and send one consented enquiry to providers they choose.

**Status: pre-launch release candidate, not deployed.** See `docs/PROJECT_STATE.md`.

## Quick start

```bash
# Postgres 16 running locally with user app/app
cp .env.example .env.local
npm ci
npm run db:migrate
npm run db:seed -- --demo        # reference data + synthetic "(Demo)" providers + dev logins
npm run dev                      # http://localhost:3000
npm run worker                   # outbox, credential freshness, retention (separate process)
```

Dev logins after `--demo`: `admin@example.invalid` / `admin-password-dev`, `reviewer@example.invalid` / `admin-password-dev`, `provider01@example.invalid` / `provider-password-dev`.

## Checks

```bash
npm run check       # typecheck + ESLint + copy lint + unit/integration tests (needs marketplace_test DB)
npm run test:e2e    # Playwright against a production build (needs marketplace_e2e DB and `npm run build`)
```

## Docs
- `docs/PRODUCT_GOAL.md`: mission, outcomes, non-negotiables
- `docs/ARCHITECTURE.md`: system design and data model
- `docs/PROJECT_STATE.md`: where things stand and what is next
- `docs/TASK_BACKLOG.md`: prioritised work with acceptance criteria
- `docs/DECISIONS.md`, `docs/EVIDENCE_LOG.md`, `docs/RISKS_AND_LEARNINGS.md`, `docs/RUNBOOK.md`, `docs/TOOL_REGISTRY.md`
- `docs/research/stage0-regulatory-ledger.md`: regulatory research (method-limited; see its header)
