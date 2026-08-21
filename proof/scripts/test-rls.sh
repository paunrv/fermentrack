#!/usr/bin/env bash
#
# PROOF · Cycle 1 · Step 1 — run the organization-isolation suite.
#
# Builds a throwaway database from nothing but the committed migrations, then
# runs every assertion against it as an unprivileged `authenticated` role.
#
# Building from empty on every run is the point: it is what proves the
# repository can still reproduce the database, which is the guarantee the
# legacy system lost.
#
# Usage:  ./scripts/test-rls.sh
# Env:    PGHOST PGPORT PGUSER PGDATABASE (defaults suit a local cluster)

set -euo pipefail

PGHOST="${PGHOST:-/tmp}"
PGPORT="${PGPORT:-5433}"
PGUSER="${PGUSER:-postgres}"
TESTDB="${TESTDB:-proof_rls_test}"

export PGHOST PGPORT PGUSER

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PSQL=(psql --no-psqlrc --quiet --set ON_ERROR_STOP=1 --dbname "$TESTDB")

echo "▸ recreating $TESTDB from empty"
psql --no-psqlrc --quiet --set ON_ERROR_STOP=1 --dbname postgres \
  -c "drop database if exists $TESTDB (force);" \
  -c "create database $TESTDB;" >/dev/null

echo "▸ applying local Supabase shim (auth schema, roles)"
"${PSQL[@]}" --file "$ROOT/tests/rls/00_supabase_shim.sql" >/dev/null

echo "▸ applying migrations"
shopt -s nullglob
migrations=("$ROOT"/supabase/migrations/*.sql)
if [ ${#migrations[@]} -eq 0 ]; then
  echo "  no migrations found — nothing to test" >&2
  exit 1
fi
for m in "${migrations[@]}"; do
  echo "    $(basename "$m")"
  "${PSQL[@]}" --file "$m" >/dev/null
done

echo "▸ running assertions"
"${PSQL[@]}" --file "$ROOT/tests/rls/10_two_organizations.sql" >/dev/null

"${PSQL[@]}" --file "$ROOT/tests/rls/99_report.sql"
