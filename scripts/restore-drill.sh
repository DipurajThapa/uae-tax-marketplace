#!/usr/bin/env bash
# Backup → restore into a scratch database → compare row counts and audit chain. Exits non-zero on mismatch.
set -euo pipefail
src="${DATABASE_URL:?}"; scratch_db="marketplace_restore_drill"
base="${src%/*}"
dump="var/backups/drill.dump"
scripts/backup.sh "$dump" >/dev/null
psql "$base/postgres" -qc "DROP DATABASE IF EXISTS $scratch_db" -qc "CREATE DATABASE $scratch_db"
scripts/restore.sh "$dump" "$base/$scratch_db" >/dev/null
q="select string_agg(t||'='||n, ',' order by t) from (select 'organizations' t, count(*) n from organizations union all select 'credentials', count(*) from credentials union all select 'enquiries', count(*) from enquiries union all select 'audit_log', count(*) from audit_log union all select 'users', count(*) from users) x"
a=$(psql "$src" -tAc "$q"); b=$(psql "$base/$scratch_db" -tAc "$q")
echo "source:   $a"; echo "restored: $b"
[ "$a" = "$b" ] || { echo "MISMATCH"; exit 1; }
# The append-only trigger must survive a restore.
if psql "$base/$scratch_db" -qc "delete from audit_log" 2>/dev/null; then echo "audit_log trigger missing after restore"; exit 1; fi
psql "$base/postgres" -qc "DROP DATABASE $scratch_db"
echo "restore drill passed"
