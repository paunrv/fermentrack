#!/usr/bin/env bash
#
# Builds a development database from the committed migrations, then records a
# demo harvest through the capture operations. Safe to re-run.
set -euo pipefail

PGHOST="${PGHOST:-/tmp}"; PGPORT="${PGPORT:-5433}"; PGUSER="${PGUSER:-postgres}"
DEVDB="${DEVDB:-proof_dev}"
export PGHOST PGPORT PGUSER

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PSQL=(psql --no-psqlrc --quiet --set ON_ERROR_STOP=1 --dbname "$DEVDB")

echo "▸ rebuilding $DEVDB"
psql --no-psqlrc --quiet --set ON_ERROR_STOP=1 --dbname postgres \
  -c "drop database if exists $DEVDB (force);" -c "create database $DEVDB;" >/dev/null

"${PSQL[@]}" --file "$ROOT/tests/rls/00_supabase_shim.sql" >/dev/null
for m in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" --file "$m" >/dev/null; done
"${PSQL[@]}" --file "$ROOT/supabase/seed/cycle1.sql" >/dev/null
"${PSQL[@]}" --file "$ROOT/supabase/seed/harvest_demo.sql" >/dev/null

echo "▸ ready — $(psql -tAc "select count(*) from public.lots" -d "$DEVDB") lots"
