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
| LG-07 | Counsel: may the legal trade name and trademark contain "Tax" for a directory/platform licence (activity fit, regulator approval), and does the brand plus descriptor avoid implied FTA/MoF affiliation? (`docs/research/brand-name-options-2026-10.md`) | Counsel | BLOCKED | Written opinion |
| BIZ-01 | Brand name and domain: **Taxdar** chosen 2026-10-08 (D-022); app rebranded | Owner | IN PROGRESS | Check taxdar.ae / taxdar.com at a registrar; trade-mark search (MoE, WIPO; classes 35, 42); DET trade-name check; native Arabic review; counsel on LG-07; domain purchase needs approval |
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
| ENG-16 | Optional MFA for provider accounts | COMPLETE | `/provider/security`; integration "ENG-16" + E2E |
| ENG-13 | MFA for staff accounts | COMPLETE | RFC 6238 vectors, integration, E2E |
| ENG-14 | Off-host encrypted backups + scheduled restore drill in CI | BLOCKED (OPS-01) | drill passes monthly |
| ENG-15 | Nonce-based CSP (remove script `unsafe-inline`) | COMPLETE | E2E "ENG-15": zero CSP violations |
| ENG-17 | Consent of named professionals before public display (PIA risk 1) | NOT STARTED | person gets a consent email; profile shows them only after consent; withdrawal hides them |
| ENG-18 | Retention for removed professionals: scrub name, title and bio after 24 months with no open dispute (PIA risk 4) | COMPLETE | integration "ENG-18" |
| ENG-19 | Provider-set monthly capacity instead of a plan cap (pricing note; paid status must not change eligibility) | BLOCKED (owner confirms D6) | matching uses the provider's capacity; billing charges overage |
| ENG-20 | Private staging access gate | COMPLETE | unit test + manual check on a production build (401/200/503) |

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

## Review follow-ups (second adversarial review 2026-10-08, PR #3 features)
| ID | Finding | Status | Evidence / note |
|---|---|---|---|
| RV2-H1 | A demo firm's person could be verified (the trigger only checked the person's flag) | COMPLETE | Migration 0007 backfills `professionals.is_synthetic` from the firm; trigger checks person OR firm; `addProfessional` copies the firm's flag. Test "H1" |
| RV2-M1 | MFA enrolment secret shared across sessions; confirm allowed after MFA was on | COMPLETE | Pending secret lives on the session; confirm locks the user and requires no factor yet; other sessions end. Test "M1" |
| RV2-M2 | Publish ran the gate outside the transaction (TOCTOU) | COMPLETE | Gate runs on the locked row; publish carries the version the admin saw. Test "M2" |
| RV2-M3 | Review not tied to content; any https URL counted as Tier 1 | COMPLETE | Separate "record review" stores a content hash and who recorded it; Tier 1 limited to official domains. Tests "M3", E2E ENG-09 |
| RV2-M4 | Renaming a person with a pending registration moved the badge | COMPLETE | Rename blocked while pending/verified/disputed; submission stores the name; approval refuses a mismatch. Test "M4" |
| RV2-M5 | Individual registrations could not be reported; hard delete lost history; duplicates across firms | COMPLETE | Reports resolve the firm through the person; soft delete (`removed_at`); reviewers see the same number held elsewhere. Tests "M5" |
| RV2-M6 | Prefetch requests and look-alike paths skipped the CSP | COMPLETE | Proxy matcher has no `missing` clause; exclusions anchored. E2E ENG-15 |
| RV2-L1 | Session stage defaulted to "full" | COMPLETE | Default `'mfa'`; existing staff sessions deleted by the migration. Test "L1" |
| RV2-L2 | Match search not rate-limited (inflates provider insights) | COMPLETE | 30 searches per IP per hour; index for insights queries |
| RV2-L3 | Published guides stayed live after the review expired | COMPLETE | Gate re-applied on read with an injected clock. Test "L3" |
| RV2-L4 | Rolled-over dates (2026-02-31) accepted | COMPLETE | `parseIsoDate` shared by forms and schemas. Test in articles |
| RV2-L5 | Session not rotated after MFA; lockout counted successes; enroll page could 500 | COMPLETE | `rotateSession`; failures-only limits per user+IP (5/15 min) and per user (20/h); enroll page signs out if MFA is already on. Tests "L5" |
| RV2-L6 | No UI for MFA reset; target not validated | COMPLETE | `/admin/staff` (admin-only, identity-confirmed checkbox); reset only for staff accounts. Test in mfa |
| RV2-L6b | Provider accounts have no MFA | COMPLETE | ENG-16: optional TOTP; turning it off needs a current code; admins can reset it at `/admin/staff` |
