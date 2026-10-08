#!/usr/bin/env bash
# Logical backup of the database (custom format, compressed). Usage: scripts/backup.sh [outfile]
# Reads DATABASE_URL from the environment. Never commit backups: they contain personal data.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
out="${1:-var/backups/backup-$(date -u +%Y%m%dT%H%M%SZ).dump}"
mkdir -p "$(dirname "$out")"
pg_dump --format=custom --no-owner --no-privileges --file="$out" "$DATABASE_URL"
sha256sum "$out" > "$out.sha256"
echo "backup written: $out"
