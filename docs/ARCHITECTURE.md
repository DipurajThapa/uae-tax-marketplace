# Architecture

## Stack
Next.js 16 (App Router, server components and server actions) · TypeScript strict · Drizzle ORM · PostgreSQL 16 · Zod · Vitest · Playwright + axe. A single deployable web app plus one worker process. There is no Redis: the outbox, rate limits and jobs use Postgres (`SKIP LOCKED`), which keeps the infrastructure to one database.

## Layout
```
src/db/schema.ts           tables, enums (Drizzle)       drizzle/*.sql  forward-only migrations (+ 0001 integrity rules)
src/lib/                   all business logic; pages never write to the DB directly except read-only queries
  taxonomy.ts              services, credential types, emirates/zones, industries, languages (labels, no regulatory numbers)
  assessment.ts            adaptive questionnaire as data; same definition drives UI and server validation
  matching.ts              PURE eligibility + explainable scoring (no IO/clock/random)
  providers.ts             public queries (visibility rule), candidates, promotions, facets
  enquiry.ts               submit (validate → spam → rate limit → re-match → dedupe → lock → consent+enquiry+recipients+charges+outbox), withdraw/erase, provider access, retention
  notify.ts                transactional outbox, templates, retry/backoff/dead-letter, token redaction
  verification.ts          verify/revoke, stale sweep, disputes, submission review
  claims.ts                claim flow, set-password tokens, provider self-registration
  importer.ts              CSV staging → validation → duplicate detection → commit as draft/unclaimed (source-terms gate)
  billing.ts               plans, effective plan, capacity, lead charges, test-mode billing provider, revenue summary
  promotions.ts, profile.ts, articles.ts (publication gate), seo.ts, session.ts (auth), audit.ts, ratelimit.ts, spam.ts, analytics.ts, consent.ts, crypto.ts, validators.ts
src/app/                   public pages, /match wizard, /provider dashboard, /admin back-office
scripts/                   migrate, seed (--demo), worker, lint-copy, backup/restore/restore-drill, reset (local only)
tests/unit, tests/integration (real Postgres), e2e (Playwright against `next start`)
```

## Data model (main tables)
- **organizations** (listing, kind, emirate, claim state, listing status, `is_synthetic`, `source_id`, `normalized_name` for duplicate detection) → organization_services / jurisdictions / industries; **professionals**.
- **credentials**: type, registration number, status (unverified → pending → verified → expired/disputed/revoked), method, evidence, verifiedBy, recheckDueAt. DB checks: one subject; "verified" needs method ≠ self_declared, reviewer, timestamp and evidence; synthetic subjects cannot be verified (trigger).
- **claims**, **credential_submissions**, **disputes** (freeze, then restore or revoke), **password_tokens** (hashed, single use, 72 h).
- **consents** (text version + hash + named recipients), **enquiries** (assessment JSON, dedupe key, manage-token hash; erasure check constraint), **enquiry_recipients** (score + reasons, status lifecycle).
- **notifications** (outbox), **plans**, **subscriptions**, **lead_charges** (included vs overage, waivable), **promotions**.
- **data_sources** (terms review gate), **import_batches/rows**, **articles** (publication gate), **analytics_events** (whitelisted, non-personal props), **audit_log** (append-only trigger), **rate_limit_hits**, **users/sessions**.

## Key flows
1. **Discovery:** `/providers` (filters; verified first, then name; sponsored block shown separately) → `/providers/[slug]` (credentials with method and date, JSON-LD only for verified credentials) → `/compare`.
2. **Matching:** `/match` client wizard → `findMatchesAction` → `loadCandidates` (published, visible, offers a requested service, capacity from plan) → `matchProviders` (eligibility: claimed, accepting, capacity, verified credential for regulated services; score 0–100 with reasons) → buyer selects ≤3 → consent text generated with recipient names → `submitEnquiry` re-matches server-side.
3. **Lead routing:** one transaction locks the chosen providers (sorted, `FOR NO KEY UPDATE`), writes the consent, enquiry, recipients and lead charges (cap enforced under the lock), and queues the provider notification (no buyer PII) and buyer receipt (manage link). The worker sends via the outbox with backoff and dead-letter; one-time tokens are redacted after sending.
4. **Supply:** self-registration → draft listing + pending submission → reviewer (≠ submitter) verifies → admin publishes. Unclaimed listings (admin import from a reviewed source) → claim → reviewer approves → set-password link.
5. **Freshness:** the hourly sweep expires overdue verifications (badge and regulated-service eligibility disappear); disputes freeze credentials immediately.

## Security
Session cookie (httpOnly, SameSite=Lax, Secure in production), SHA-256-hashed session ids, scrypt passwords, role checks in layouts AND in every server action, organisation scoping in lib functions, UUID guards, CSP and security headers (`next.config.ts`), http(s)-only URL validation, safe markdown renderer, LIKE-escaping, keyed hashes for IPs, DB-level invariants. Server actions get Next's built-in Origin check (CSRF).

## SEO / AEO
Server-rendered HTML for every public page (verified with JS disabled). Canonicals, a sitemap of only indexable pages, robots blocked until `ALLOW_INDEXING=true`, and `robotsFor()` fails closed. Landing pages per service, emirate and service×emirate are noindexed below 3 real providers (thin-content guard). JSON-LD: WebSite+SearchAction, AccountingService with hasCredential (verified only), BreadcrumbList, ItemList, Article with reviewedBy and citations.
