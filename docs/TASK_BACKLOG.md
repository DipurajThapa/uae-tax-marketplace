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
| ENG-04 | Batch `capacityRemaining` / candidate loading for >1,000 listings | NOT STARTED | p95 match < 300 ms at 5k listings |
| ENG-05 | Live payment adapter (Stripe Billing or UAE PSP) behind the `BillingProvider` interface, with signed webhooks | BLOCKED (OPS-02) | test-mode checkout E2E |
| ENG-06 | SMTP/API mail transport | BLOCKED (OPS-03) | outbox sends; bounces handled |
| ENG-07 | Individual professionals: add people + FTA_TAX_AGENT submissions in provider UI | NOT STARTED | provider adds a person; reviewer verifies |
| ENG-08 | Self-service password reset (email link) | NOT STARTED | E2E reset flow |
| ENG-09 | Admin article editor (guides CMS UI; gate exists in `articles.ts`) | NOT STARTED | publish blocked without reviewer + Tier-1 source |
| ENG-10 | Provider monthly lead-quality report email + dashboard analytics (paid feature) | NOT STARTED | report renders from data |
| ENG-11 | Lighthouse CI budget in CI | NOT STARTED | LCP < 2.5 s mobile on key pages |
| ENG-12 | Arabic UI (RTL) | DEFERRED | — |
| ENG-13 | MFA for staff accounts | NOT STARTED | TOTP for admin/reviewer |
| ENG-14 | Off-host encrypted backups + scheduled restore drill in CI | BLOCKED (OPS-01) | drill passes monthly |

Items from the adversarial review are added below when it reports (see `EVIDENCE_LOG.md`).

## Review follow-ups (adversarial review 2026-10-08)
| ID | Finding | Status | Acceptance |
|---|---|---|---|
| RV-M9 | Self-registered providers are "claimed" without email verification | NOT STARTED | Account email confirmed before any lead routing |
| RV-M10 | Consent recorded under a draft version; store full text | BLOCKED (LG-03) | Final text version stored verbatim |
| RV-L2 | Test subscriptions do not renew; periods vs calendar months | NOT STARTED | Renewal job; period-aligned counting |
| RV-L3 | `?error=`/`?notice=` show arbitrary text (escaped, so no XSS) | NOT STARTED | Messages selected by code |
| RV-L4 | Logout over GET | NOT STARTED | POST form |
| RV-L5 | Registration reveals existing accounts and draft slugs | NOT STARTED | Generic message, emailed instructions |
| RV-L6 | Duplicate check reveals another buyer's reference | NOT STARTED | Duplicate response shows no ref |
| RV-L8 | No custom error page | NOT STARTED | Branded 500 page |
| RV-L9 | Migration 0002 adds NOT NULL without a default | NOT STARTED | Safe on non-empty DBs (pre-launch, no data yet) |
| RV-L10 | `//host` markdown links; CSP `unsafe-inline`; demo badge on compare; sponsored ignore some filters | NOT STARTED | Each fixed or accepted |
