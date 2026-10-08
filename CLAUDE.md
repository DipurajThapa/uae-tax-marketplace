# Repo rules (UAE tax & compliance marketplace)

Read `docs/PROJECT_STATE.md` first; it has the current phase and the next executable task.

- Never fabricate providers, credentials, reviews, metrics or test results. Synthetic data lives only behind `is_synthetic = true`, is labelled "(Demo)", and can never hold a verified credential (DB trigger).
- A credential shows as verified only after a named reviewer checks it, by official register lookup or document review. The DB rejects "verified" without method, reviewer and evidence.
- Never bulk-import an official register (FTA tax agents, MoF e-invoicing providers). Their terms prohibit reuse without written consent (`docs/research/stage0-regulatory-ledger.md`). Check registrations one at a time.
- Buyer contact data goes only to the providers the buyer selected, after versioned consent. Provider emails never contain buyer contact details.
- Paid status and promotions never change eligibility, search order or match scores. Sponsored placements are always labelled.
- No public deployment, live payments, real outreach, domain purchase or indexing (`ALLOW_INDEXING`) without the owner's approval. Billing stays in the internal test ledger.
- Never state a tax rate, threshold, deadline or penalty in code or copy. Regulatory content goes in reviewer-signed guides with a Tier-1 source (`src/lib/articles.ts` enforces it).
- Forbidden copy (enforced by `npm run lint:copy`): "guaranteed", "recommended for you", "best for you", "you should", savings promises, implied FTA/MoF endorsement.
- All mutations go through `src/lib/*`, which writes audit rows. Pages and actions re-check the role or organisation on every call.
- Before pushing: `npm run check` (typecheck, ESLint, copy lint, unit and integration tests) and `npm run test:e2e`.
- When unsure about a legal point, add it to `docs/TASK_BACKLOG.md` under "Counsel" and do not guess.
