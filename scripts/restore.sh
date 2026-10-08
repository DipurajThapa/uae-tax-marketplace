#!/usr/bin/env bash
# Restore a backup into a TARGET database (must be empty or disposable). Usage: scripts/restore.sh <dump> <target_url>
set -euo pipefail
dump="${1:?dump file required}"; target="${2:?target database URL required}"
sha256sum -c "$dump.sha256"
pg_restore --no-owner --no-privileges --exit-on-error --single-transaction --dbname="$target" "$dump"
echo "restored into target"
