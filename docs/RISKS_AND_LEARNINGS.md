# Risks and learnings

## Open risks
| # | Risk | Severity | Owner | Mitigation / status |
|---|---|---|---|---|
| R-01 | **Supply cold start**: no lawful bulk source of real tax agents (FTA and MoF terms restrict reuse) | High (commercial) | Owner | Self-listing + claims; request FTA/MoF permission or a data feed (BIZ-03); targeted onboarding of firms (needs outreach approval) |
| R-02 | **Media licensing** may apply to a directory selling promoted listings (Decree-Law 55/2023; regulator now the NMA) | High (legal) | Counsel | Launch blocker LG-02; promotions can be switched off without code (no active rows) |
| R-03 | **PDPL** Executive Regulations status unclear; hosting region undecided | High (legal) | Counsel/Owner | Consent-first design, 12-month retention, erase link; LG-03, OPS-01 |
| R-04 | Whether platform fees create conduct risk for FTA agents (Professional Standards, FTA Decision 1/2024) | Medium | Counsel | Flat subscription/lead fees, never success-based; LG-04 |
| R-05 | Research could not open any *.gov.ae page (sandbox network); findings rest on search excerpts | Medium | Owner | Re-run the ledger from an open network and archive captures (RG-01) |
| R-06 | Listing non-registered "tax consultants" next to registered agents could mislead | Medium | Product | Firm type and each registration status are always shown; regulated services require verification to match; LG-05 asks counsel |
| R-07 | Manual verification workload scales with supply | Medium | Ops | Re-check cadence 90 days (regulated), 365 (qualifications); due-soon queue; ask the FTA for a feed |
| R-08 | Postgres-only queueing/rate limiting has throughput limits | Low (at MVP scale) | Eng | Fine for thousands of enquiries/day; move to Redis/queue if the outbox lags (alert on `/api/health` degraded) |
| R-09 | `capacityRemaining` does one plan query per candidate | Closed | Eng | Batched in ENG-04: p95 242 ms at 5,000 listings |
| R-10 | Commercial assumptions (prices, caps) are untested | High (commercial) | Owner | D-007 placeholders; validate with provider interviews before enabling billing |
| R-11 | Provider accounts have password-only sign-in (accepted for now) | Medium | Eng | Providers see only their own enquiries; login and per-account rate limits; email verification. ENG-16 adds optional TOTP before launch if the owner wants it |

## Learnings (from this build)
- **Next.js metadata:** a page returning `robots: undefined` silently drops the layout's `noindex`. Found by the E2E SEO test; fixed with `robotsFor()` that always returns an explicit value (D-013).
- **Postgres FK locks:** inserting rows that reference `organizations` takes KEY SHARE locks; a later `FOR UPDATE` on the same row from a parallel transaction deadlocked. Fix: lock all providers up front, in sorted order, with `FOR NO KEY UPDATE`. A parallel-submission test guards it.
- **Feature interaction:** the free-plan monthly cap (3) masked the IP rate-limit test. Tests must isolate the control under test.
- **E2E races:** clicking a server-action button and then navigating immediately can abort the action; wait for the post-action redirect.
- **Drizzle migrator** applies all pending migrations in one transaction; proven with a deliberately broken migration.
- **Inline server actions** cannot close over a function from the component body (Next serialises the closure); module-level helpers only. Found by E2E, not by typecheck.
- **E2E after a server action:** wait for the post-redirect notice before filling the next form, or the re-render clears the fields.
- Sub-agent reviews of `src/lib` found real defects: `javascript:` URLs, orphan rows on non-atomic approval, plaintext one-time tokens kept after sending, receipts surviving erasure, IDOR on subscription cancel. All fixed and covered by tests.
