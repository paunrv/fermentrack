#!/usr/bin/env bash
#
# The rehearsal, before the real one.
#
# Aldo's own Colombard Pet Nat notebook, read into PROOF through the real
# browser, ending with the board printed as he would see it. Runs against a
# throwaway database on its own port so the field database — the one that will
# hold what he actually says — stays empty until he says it.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="${REHEARSAL_DB:-proof_rehearsal}"
PORT="${REHEARSAL_PORT:-3101}"
WHO="rehearsal@vinasdeltigre.example"

export PATH="/usr/lib/postgresql/16/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"
export PGHOST=127.0.0.1 PGPORT="${PGPORT:-5433}" PGUSER=postgres

pg_isready -q || { echo "  Postgres is not running — start it with ./scripts/field.sh" >&2; exit 1; }

PSQL=(psql --no-psqlrc --quiet --set ON_ERROR_STOP=1 --dbname "$DB")

psql --no-psqlrc --quiet -d postgres -c "drop database if exists $DB (force);" -c "create database $DB;" >/dev/null
"${PSQL[@]}" --file "$ROOT/tests/rls/00_supabase_shim.sql" >/dev/null
for m in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" --file "$m" >/dev/null; done
"${PSQL[@]}" --file "$ROOT/supabase/seed/cycle1.sql" >/dev/null
"${PSQL[@]}" >/dev/null <<SQL
insert into auth.users (email) values ('$WHO') on conflict (email) do nothing;
select app.grant_membership('vinas-del-tigre', '$WHO', 'owner');
SQL

cd "$ROOT/web"

# A leftover server from a previous rehearsal answers on this port perfectly
# happily, serving an old build against a database that has just been dropped
# and recreated. That looks exactly like the app being broken, and it is not —
# it is the wrong app. So the port is cleared and then *proved* clear.
#
# `next start` spawns a child that outlives the wrapper, so killing the job is
# not enough; the whole process group goes.
if curl -sf -o /dev/null --max-time 1 "http://localhost:$PORT"; then
  echo "  something is already answering on $PORT." >&2
  echo "  A leftover server serves an old build against a database this script" >&2
  echo "  has just recreated, which looks exactly like the app being broken." >&2
  echo "  Stop it first, or rehearse on another port: REHEARSAL_PORT=3105 $0" >&2
  exit 1
fi

npm run build >/dev/null 2>&1 || npm run build

DATABASE_URL="postgres://postgres@127.0.0.1:$PGPORT/$DB" PROOF_DEV_USER="$WHO" \
  setsid npx next start -p "$PORT" >/tmp/rehearsal-app.log 2>&1 &
APP=$!
trap 'kill -- -$APP 2>/dev/null || true; pkill -9 -f "next start -p $PORT" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do curl -sf -o /dev/null "http://localhost:$PORT" && break; sleep 1; done
curl -sf -o /dev/null "http://localhost:$PORT" || {
  echo "  the app never came up — see /tmp/rehearsal-app.log" >&2
  tail -20 /tmp/rehearsal-app.log >&2
  exit 1
}

PROOF_URL="http://localhost:$PORT" node scripts/rehearsal.mjs
