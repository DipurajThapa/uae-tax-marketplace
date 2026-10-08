# Runbook

## Local setup
See README quick start. Databases: `marketplace_dev` (app), `marketplace_test` (vitest), `marketplace_e2e` (Playwright, rebuilt on every run). All use user `app`/`app` on localhost:5432.

## Processes
| Process | Command | Notes |
|---|---|---|
| Web | `npm run build && npm start` | Stateless; scale horizontally |
| Worker | `npm run worker` | Outbox every 15 s; hourly: credential sweep, retention, rate-limit pruning. Safe to run more than one (SKIP LOCKED). `--once` for cron |
| Migrations | `npm run db:migrate` | Release step before the new web version. All pending migrations run in ONE transaction (proven by `tests/integration/migrations.test.ts`) |

## Environment
`DATABASE_URL`, `APP_SECRET` (≥32 chars, random, never the placeholder; the app refuses placeholders in production), `SITE_URL`, `APP_ENV=production` (hides synthetic data even if the flag is set), `ALLOW_INDEXING` (owner-approved launch only), `MAIL_TRANSPORT` (`outbox-file` until a provider is approved; `smtp` fails loudly while unconfigured), `MAIL_FROM`.

## Deploy (when authorised)
1. `scripts/backup.sh` (verify the `.sha256`).
2. `npm run db:migrate`. If it fails, nothing was applied: fix the migration and rerun. The old app version keeps working.
3. Deploy the web image; check `/api/health` → `ok`.
4. Start or restart the worker.
5. Rollback: redeploy the previous image. Migrations are forward-only and additive. If a migration must be reverted, restore the pre-deploy backup into a new database and switch `DATABASE_URL` (data written since the backup is lost; prefer a forward fix).

## Backups and restore
- `scripts/backup.sh [file]`: pg_dump custom format plus checksum. Schedule daily, keep 30 days, store off-host and encrypted (provider TBD).
- `scripts/restore.sh <dump> <target_url>`: single-transaction restore into an empty database.
- `scripts/restore-drill.sh`: backup → restore into scratch → compare counts → check that the audit trigger survived. Run monthly; last result in EVIDENCE_LOG.

## Alerts (to wire up when hosting is chosen)
- `/api/health` non-200 → page on-call.
- `status: degraded` (dead or overdue notifications) → check `/admin/notifications`, fix the transport, use "Retry".
- Worker log line `"job":"tick","error"` repeating → DB connectivity.

## Routine operations
- **Verification queue:** `/admin/verification`. Check each registration on the official register by hand (one record at a time), record method, evidence note and date. Re-checks due within 14 days are listed there.
- **Claims:** `/admin/claims`. A domain match is a signal, not proof.
- **Disputes:** `/admin/disputes`. A disputed credential is already hidden; uphold → revoked; reject → restored (or expired if its re-check passed meanwhile).
- **Lead disputes:** `/admin/billing` → mark the charge waived (frees capacity).
- **Erasure request by email:** `/admin/enquiries/[id]` → "Erase personal data" (admin only).
- **Incident: wrong credential shown.** Revoke it in `/admin/providers/[id]` (badge disappears immediately), then log it in RISKS_AND_LEARNINGS.

## Staff two-factor authentication
Admins and reviewers must use an authenticator app (TOTP). Lost device: another admin confirms the request by phone and resets it at `/admin/staff`, or an operator runs `npx tsx scripts/reset-mfa.ts <email>` (audited); the user enrols again at next sign-in.

## Support
Provider can't log in → issue a new set-password link (re-approve flow; TASK_BACKLOG OPS-05 tracks a self-service reset). Buyer lost the manage link → admin erases on request after confirming the email address.

## Private staging (owner-approved 2026-10-08)

Staging is private and holds demo or test data only: no real enquiries, and no email to real third parties.

1. **Owner:** create the hosting account (recommended: Azure UAE North, see `docs/research/infrastructure-options-2026-10.md`) and approve the monthly cost.
2. Create a PostgreSQL 16 database and a container app from the `Dockerfile` image.
3. Set these environment variables as secrets, never in the repo:
   - `NODE_ENV=production`, `APP_ENV=staging`
   - `STAGING_BASIC_AUTH=owner:<random, at least 16 characters>` (`echo "owner:$(openssl rand -hex 16)"`)
   - `APP_SECRET=$(openssl rand -hex 32)`
   - `DATABASE_URL`, `SITE_URL=https://<staging host>`
   - `ALLOW_INDEXING=false`, `ALLOW_SYNTHETIC_DATA=true`
   - `MAIL_TRANSPORT=outbox-file` (mail is written to files, not sent)
4. Release step: `npm run db:migrate`, then `npm run db:seed -- --demo`.
5. Start the web container (`next start`) and the hourly worker (`npm run worker`).
6. Check:
   - `/api/health` returns 200;
   - `/` returns 401 without credentials and 200 with them;
   - responses carry `X-Robots-Tag: noindex`.
7. Without `STAGING_BASIC_AUTH`, staging returns 503 on every page. This is deliberate (fail closed).
8. Staff accounts: create them with the seed script; each enrols two-factor at first sign-in.
