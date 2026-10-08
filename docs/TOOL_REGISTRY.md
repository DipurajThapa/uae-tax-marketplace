# Tool and integration registry (session of 2026-10-08)

| Capability | Status | Used for | Fallback |
|---|---|---|---|
| Node 22, npm, TypeScript, Next 16 | Available, exercised | build, typecheck | — |
| PostgreSQL 16 (local) | Available, exercised | dev/test/e2e DBs, restore drill | — |
| Playwright + preinstalled Chromium (`/opt/pw-browsers`) | Available, exercised | 10 E2E tests incl. axe, mobile viewport, JS-disabled | — |
| GitHub MCP | Available; **repo creation denied (403)**; new repo not visible to the app installation at session time | PR creation | owner creates repo and grants app access |
| Web search | Available (excerpts only) | Stage 0 research | — |
| Web fetch to *.gov.ae | **Blocked** (DNS/proxy 403) | — | re-run research from an open network; manual captures |
| Docker CLI | Present, not exercised (no daemon test) | Dockerfile written | — |
| Redis | Present, **not used** (D-002) | — | — |
| Email provider (SMTP/API) | **Not configured** | — | outbox-file transport writes to `var/mail` |
| Payment provider | **Not configured / not authorised** | — | internal test-mode billing ledger |
| Datadog, Ahrefs, Similarweb, etc. MCPs | Failed to connect or need auth | — | not needed yet |
