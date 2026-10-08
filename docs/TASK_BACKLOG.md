# Task backlog

Status keys: COMPLETE (implemented + independently verified) · IN PROGRESS · BLOCKED (external dependency named) · NOT STARTED · DEFERRED.
Evidence for COMPLETE items: `EVIDENCE_LOG.md`.

## Launch blockers needing people (engineering cannot close these)
| ID | Item | Owner | Status | Unblock action |
|---|---|---|---|---|
| LG-01 | Counsel: may the platform store TAAN/name/status for opted-in agents and display "verified against FTA register on [date]"? (ledger Q1–2) | Counsel | BLOCKED | Written opinion |
| LG-02 | Counsel: media/e-media licence for a directory with paid promoted listings (Decree-Law 55/2023, NMA) | Counsel | BLOCKED | Written opinion; licence if needed |
| LG-03 | Counsel: PDPL status, consent text (`enquiry-v1-draft`, `listing-v1-draft`), cross-border hosting basis, controller roles | Counsel | BLOCKED | Approve texts → bump versions |
| LG-04 | Counsel: do subscription/per-lead/sponsored fees create conduct risk for FTA agents (Decision 1/2024)? | Counsel | BLOCKED | Opinion; adjust plans |
| LG-05 | Counsel: listing non-registered consultants next to registered agents (Tax Procedures law) | Counsel | BLOCKED | Opinion |
| LG-06 | Privacy notice and terms are DRAFTS (`/privacy`, `/terms`) | Counsel | BLOCKED | Approved text |
| BIZ-01 | Brand name and domain (working name "TaxPro Directory UAE") | Owner | BLOCKED | Decide; purchase needs approval |
| BIZ-02 | Real prices, caps, refund policy (D-007 placeholders) | Owner | BLOCKED | Validate with 10+ provider interviews |
| BIZ-03 | Ask the FTA and MoF for permission or a data feed for register data | Owner | BLOCKED | Letter (outreach approval) |
| BIZ-04 | Real supply: onboard first providers via self-listing (outreach needs approval) | Owner | BLOCKED | Approve outreach plan |
| OPS-01 | Hosting platform + DB region (PDPL), backups storage, secrets store | Owner | BLOCKED | Decide; billable |
| OPS-02 | Payment provider account (Stripe or a UAE PSP) in test mode, then live | Owner | BLOCKED | Account + keys; live needs approval |
| OPS-03 | Transactional email provider + sending domain (SPF/DKIM/DMARC) | Owner | BLOCKED | Account; processor approval |
| RG-01 | Re-run the regulatory ledger from an open network; archive captures of every cited page | Owner/Research | BLOCKED (sandbox network) | Network access to *.gov.ae |
| CT-01 | First guides: reviewer-written, Tier-1 sourced (e.g. the three registration types, the e-invoicing timeline) | Reviewer | BLOCKED | Named reviewer with credential |

## Engineering backlog
| ID | Item | Status | Acceptance |
|---|---|---|---|
| ENG-01 | Data model, migrations, DB invariants | COMPLETE | integrity tests pass |
| ENG-02 | Search, profile, compare, landing pages, SEO plumbing | COMPLETE | E2E 1 + SEO test |
| ENG-03 | Needs assessment, matching, consented enquiry, routing, outbox | COMPLETE | E2E 2/3/7, integration |
| ENG-04 | Batch `capacityRemaining` / candidate loading for >1,000 listings | COMPLETE | p95 242 ms at 5,000 listings (`npm run bench:matching`) |
| ENG-05 | Live payment adapter (Stripe Billing or UAE PSP) behind the `BillingProvider` interface, with signed webhooks | BLOCKED (OPS-02) | test-mode checkout E2E |
| ENG-06 | SMTP/API mail transport | BLOCKED (OPS-03) | outbox sends; bounces handled |
| ENG-07 | Individual professionals: add people + FTA_TAX_AGENT submissions in provider UI | COMPLETE | integration "ENG-07" + E2E |
| ENG-08 | Self-service password reset (email link) | COMPLETE | integration test "password reset" |
| ENG-09 | Admin article editor (guides CMS UI; gate exists in `articles.ts`) | COMPLETE | integration "ENG-09" + E2E |
| ENG-10 | Provider dashboard analytics (paid feature) | COMPLETE (dashboard); monthly email waits on OPS-03 | integration "ENG-10" + E2E |
| ENG-11 | Lighthouse CI budget in CI | COMPLETE | 5 pages, scores 0.98–0.99, LCP ≤ 2.2 s (mobile, simulated) |
| ENG-12 | Arabic UI (RTL) | DEFERRED | — |
| ENG-16 | Optional MFA for provider accounts | NOT STARTED | providers can enrol TOTP from their dashboard |
| ENG-13 | MFA for staff accounts | COMPLETE | RFC 6238 vectors, integration, E2E |
| ENG-14 | Off-host encrypted backups + scheduled restore drill in CI | BLOCKED (OPS-01) | drill passes monthly |
| ENG-15 | Nonce-based CSP (remove script `unsafe-inline`) | COMPLETE | E2E "ENG-15": zero CSP violations |

Items from the adversarial review are added below when it reports (see `EVIDENCE_LOG.md`).

## Review follow-ups (adversarial review 2026-10-08)
| ID | Finding | Status | Evidence / note |
|---|---|---|---|
| RV-M9 | Self-registered providers are "claimed" without email verification | COMPLETE | `users.email_verified_at`; a verify link goes out at registration; unverified accounts never match or receive mail; token purposes are separate. Test "M9" |
| RV-M10 | Consent recorded under a draft version; store full text | BLOCKED (LG-03) | Needs counsel-approved text |
| RV-L2 | Test subscriptions do not renew | COMPLETE | `renewTestSubscriptions` in the hourly worker. Test "L2". Leads are still counted by calendar month (D-007) |
| RV-L3 | `?error=`/`?notice=` show arbitrary text | COMPLETE | HMAC-signed flash messages (`src/lib/flash.ts`). Unit + E2E "L3" |
| RV-L4 | Logout over GET | COMPLETE | POST form with an Origin check; GET is a no-op. E2E "L4" |
| RV-L5 | Registration reveals existing accounts and draft slugs | COMPLETE | Neutral wording; only published slugs are linked. Test "L5" |
| RV-L6 | Duplicate check reveals another buyer's reference | COMPLETE | Duplicate response carries no reference. Integration dedupe test |
| RV-L8 | No custom error page | COMPLETE | `app/error.tsx`, `app/global-error.tsx` |
| RV-L9 | Migration 0002 adds NOT NULL without a default | COMPLETE | Fills existing rows, then drops the default (edited pre-launch; no production DB exists) |
| RV-L10a | `//host` markdown links treated as internal | COMPLETE | Unit test |
| RV-L10b | Demo badge missing on compare | COMPLETE | — |
| RV-L10c | Sponsored block ignores some filters | COMPLETE | Hidden when keyword, type, language, zone or verification filters are active |
| RV-L10d | CSP allows `'unsafe-inline'` scripts | COMPLETE | ENG-15 |
