#!/usr/bin/env bash
#
# A copy of everything Aldo has said, in one file.
#
# The field database lives on one laptop, which is the fastest way to work and
# the easiest way to lose a vintage. Run this before anything risky, and after
# any session worth keeping.
#
#   ./scripts/backup.sh                  → proof/.data/backups/proof-<stamp>.sql
#   ./scripts/backup.sh ~/Desktop        → somewhere you will actually find it
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/.data/backups}"
DB="${PROOF_DB:-proof}"

export PATH="/usr/lib/postgresql/16/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"
export PGHOST=127.0.0.1 PGPORT="${PGPORT:-5433}" PGUSER=postgres

pg_isready -q || { echo "  Postgres is not running — start it with ./scripts/field.sh" >&2; exit 1; }

mkdir -p "$OUT"
FILE="$OUT/proof-$(date +%Y%m%d-%H%M%S).sql"

pg_dump --dbname "$DB" --no-owner --no-privileges --file "$FILE"

events=$(psql -tAc "select count(*) from public.events" -d "$DB" | tr -d ' ')
echo "  $events event(s) saved to $FILE"
echo "  Restore with:  createdb proof_restored && psql -d proof_restored -f '$FILE'"
