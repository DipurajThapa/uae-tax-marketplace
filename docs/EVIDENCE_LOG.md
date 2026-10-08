# Evidence log

All runs on 2026-10-08 in the build sandbox unless noted. "CI" means GitHub Actions on PR #1.

## Automated checks (latest local run, commit after review fixes)
| Check | Result | Command |
|---|---|---|
| Typecheck | pass | `npm run typecheck` |
| ESLint | pass | `npm run lint` |
| Copy lint | pass (68 files); planted "guaranteed" fails with file:line (exit 1) | `npm run lint:copy` |
| Unit + integration (real Postgres) | **94 / 94 pass**, also with `ALLOW_SYNTHETIC_DATA=true` in the environment (the CI condition) | `npm test` |
| Production build | pass, 50 routes | `npm run build` |
| Browser E2E (Playwright, Chromium, production build) | **17 / 17 pass** (adds CSP, staff MFA, people, guide editor, insights) |
| Performance budget (Lighthouse mobile) | pass on 5 pages: score 0.98–0.99, LCP 1.55–2.20 s, CLS 0, TBT 42–97 ms, JS ~140–178 KB | `npm run perf:budget` |
| Matching latency at 5,000 listings | p50 127 ms, p95 242 ms (was 6,518 / 7,084 ms) | `npm run bench:matching` |
| TOTP | RFC 6238 SHA-1 vectors pass (T=59, 1111111109, 1234567890) | unit | `npm run test:e2e` |
| Restore drill | pass: row counts equal; audit trigger survives restore | `scripts/restore-drill.sh` |
| Response time (warm, local) | ~20 ms per page; HTML 16–32 KB | curl against `next start` |

## Cross-system scenarios (directive §10)
| # | Scenario | Evidence |
|---|---|---|
| 1 | Business finds a registered professional | E2E "1." (search → profile → verified badge with method; JSON-LD hasCredential) |
| 2 | Business submits a qualified enquiry | E2E "2." + integration "scenario 2" (consent names recipients, re-match, dedupe, spam, rate limits, cap 3) |
| 3 | Provider receives and manages it | E2E "3." + integration (accept; another provider gets 404 and no data) |
| 4 | Provider claims a listing | E2E "4/5." + integration (domain match, set-password link single-use) |
| 5 | Admin reviews and approves a change | E2E "4/5." + integration (submission approval, reviewer ≠ submitter, staff cannot verify own org) |
| 6 | Disputed or expired verification updated safely | integration: read-time expiry (no sweep needed), reviewer freeze → restore or revoke, reports alone change nothing |
| 7 | No suitable matches | E2E "7." (explanation shown) + unit explainNoMatch |
| 8 | Notification fails and recovers | integration: backoff, dead-letter + audit, admin retry, no double-send under 3 concurrent workers |
| 9 | Unauthorised privileged access | E2E "9." (anon → login, provider → forbidden, reviewer → forbidden on admin-only) + integration IDOR tests |
| 10 | Migration or deployment failure recovers | integration: broken migration rolls back fully, fixed one applies, re-run is a no-op; restore drill |

## Independent adversarial review
A separate reviewer agent tried to invalidate the release-candidate claim. It found 0 Critical, 5 High, 11 Medium and 11 Low issues.
- Fixed with tests: H1–H5, M1, M2, M3, M4, M5, M6, M7, M8, M11, L1, L7, L11.
- Follow-ups (after PR #1 merged): M9, L2–L6, L8, L9 and L10a–c fixed with tests. L10d closed by ENG-15. Open: M10 (blocked on counsel).

### Second review (features in PR #3)
A second reviewer agent attacked ENG-07/09/10/13/15. It found 0 Critical, 1 High, 6 Medium and 6 Low issues. All fixed with tests except provider MFA, which is accepted as risk R-11 (ENG-16). See TASK_BACKLOG "second adversarial review".
- After the fixes: `npm run check` with 107 unit and integration tests passing; `npm run test:e2e` with 17 of 17 passing (local run, 2026-10-08). PR #3 merged with CI green.
- ENG-16 (optional provider two-factor): 110 unit and integration tests and 18 of 18 E2E passing (local run, 2026-10-08).

## CI history
- PR #1 merged into `main` as `a61622b` with CI green.

### PR #1
- Runs 1–3 failed: the job-level `ALLOW_SYNTHETIC_DATA=true` leaked into the visibility test through `??=` in the test setup. Fixed by forcing test env values; the health check now targets the real DB; the E2E step creates its DB.

## Not verified (honest gaps)
- No real providers, traffic, payments or emails. All commercial figures are test-mode.
- Regulatory research could not open any official page (sandbox network); see the ledger header.
- No load test beyond the parallel-submission and concurrent-worker tests and the matching benchmark (ENG-04). Lighthouse runs on a CI runner with simulated mobile throttling, not on real devices.
