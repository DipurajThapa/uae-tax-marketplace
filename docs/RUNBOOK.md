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
