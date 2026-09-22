#!/usr/bin/env bash
#
# PROOF in the field.
#
# One command that leaves a working PROOF open in a browser, holding Viñas del
# Tigre's real data, on a laptop with no internet.
#
# The important difference from scripts/dev-db.sh: **this never drops anything.**
# dev-db.sh rebuilds from empty every run because that is what a test needs.
# This is the opposite — the database it creates is the only copy of what Aldo
# said, so it is created once and then only ever migrated forward.
#
#   ./scripts/field.sh tigre      Viñas del Tigre  (Aldo)
#   ./scripts/field.sh pijoan     Viñas Pijoan     (Silvana)
#   ./scripts/backup.sh           take a copy before anything risky
#
# One winery per session, by construction. The two field sites are separate
# tenants and their data must never be read together, so each gets its own
# sign-in derived from yours — you@example.com becomes
# you+vinas-del-tigre@example.com — and the script refuses to start if that
# user can see more than one winery. It is cheaper to fail here than to
# discover at D6 that a racking was filed against the wrong producer.
#
# Env:
#   PROOF_OPERATOR   your email                        (default: the git user)
#   PROOF_DATA       where the database lives          (default: proof/.data/pg)
#   PROOF_PORT       (default 3100)  PGPORT (default 5433)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGPORT="${PGPORT:-5433}"
PGDATA="${PROOF_DATA:-$ROOT/.data/pg}"
DB="${PROOF_DB:-proof}"
HUMAN="${PROOF_OPERATOR:-$(git -C "$ROOT" config user.email 2>/dev/null || echo 'operator@example.com')}"
PORT="${PROOF_PORT:-3100}"

case "${1:-tigre}" in
  tigre|vinas-del-tigre)  WINERY=vinas-del-tigre; WHO_FOR="Aldo" ;;
  pijoan|vinas-pijoan)    WINERY=vinas-pijoan;    WHO_FOR="Silvana" ;;
  *) echo "  which winery? ./scripts/field.sh [tigre|pijoan]" >&2; exit 1 ;;
esac

# One sign-in per winery, derived from yours, so a session can only ever see
# one tenant.
case "$HUMAN" in
  *@*) OPERATOR="${HUMAN%@*}+$WINERY@${HUMAN#*@}" ;;
  *)   echo "  PROOF_OPERATOR must be an email address" >&2; exit 1 ;;
esac

# Postgres refuses to run as root, and on a laptop it will not be root anyway.
# Both cases are handled so the same script works here and on a Mac.
pg() {
  if [ "$(id -u)" = "0" ]; then
    su postgres -c "PATH=$(dirname "$(command -v pg_ctl || echo /usr/lib/postgresql/16/bin/pg_ctl)"):\$PATH $*"
  else
    eval "$@"
  fi
}

export PATH="/usr/lib/postgresql/16/bin:/opt/homebrew/opt/postgresql@16/bin:$PATH"
export PGHOST=127.0.0.1 PGPORT PGUSER=postgres
# Postgres narrates every "trigger does not exist, skipping" while a migration
# runs. Harmless, and it looks exactly like a wall of errors to somebody about
# to sit down with a winemaker. Warnings and worse still come through.
export PGOPTIONS='--client-min-messages=warning'

command -v pg_ctl >/dev/null || { echo "  Postgres 16 is not installed." >&2; exit 1; }

# ── the database, created once ──────────────────────────────────────────────
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo "▸ creating the database — this happens once"
  mkdir -p "$PGDATA"
  [ "$(id -u)" = "0" ] && chown postgres:postgres "$PGDATA" && chmod 700 "$PGDATA"
  pg "initdb -D '$PGDATA' -U postgres --auth=trust" >/dev/null
fi

if ! pg_isready -q 2>/dev/null; then
  echo "▸ starting Postgres"
  pg "pg_ctl -D '$PGDATA' -o '-p $PGPORT' -l '$PGDATA/server.log' start" >/dev/null
  for _ in $(seq 1 20); do pg_isready -q 2>/dev/null && break; sleep 0.5; done
fi
pg_isready -q || { echo "  Postgres did not start — see $PGDATA/server.log" >&2; exit 1; }

PSQL=(psql --no-psqlrc --quiet --set ON_ERROR_STOP=1 --dbname "$DB")

if ! psql -tAc "select 1 from pg_database where datname = '$DB'" -d postgres | grep -q 1; then
  echo "▸ creating $DB"
  psql --no-psqlrc --quiet -d postgres -c "create database $DB;" >/dev/null
fi

# A hosted Supabase project supplies the auth schema, the roles and auth.uid().
# A laptop does not, so the same shim the tests use stands in for it. It is the
# only thing here that would not exist against a real Supabase project.
if ! psql -tAc "select 1 from pg_namespace where nspname = 'auth'" -d "$DB" | grep -q 1; then
  echo "▸ standing in for Supabase (auth schema, roles)"
  "${PSQL[@]}" --file "$ROOT/tests/rls/00_supabase_shim.sql" >/dev/null
fi

# Migrations are applied once and then remembered.
#
# Not an optimisation — a correctness requirement. A migration that redefines a
# view cannot always be replayed over a later one: `create or replace view`
# refuses to drop a column, so re-running 0400 on a database where 0600 has
# already widened `lot_story` fails outright. Every session after the first
# would have died on startup.
#
# A hosted Supabase project tracks applied migrations for exactly this reason.
# On a laptop there is nothing to do it, so the runner keeps its own record, in
# its own schema, plainly not part of the product's own tables.
"${PSQL[@]}" >/dev/null <<'SQL'
create schema if not exists proof_field;
create table if not exists proof_field.applied_migrations (
  filename   text primary key,
  applied_at timestamptz not null default now()
);
SQL

pending=0
for m in "$ROOT"/supabase/migrations/*.sql; do
  base=$(basename "$m")
  if [ "$(psql -tAc "select 1 from proof_field.applied_migrations where filename = '$base'" -d "$DB")" = "1" ]; then
    continue
  fi
  [ "$pending" = "0" ] && echo "▸ bringing the schema up to date"
  pending=$((pending + 1))
  echo "    $base"
  "${PSQL[@]}" --file "$m" >/dev/null || {
    echo "  migration failed: $base — nothing else was applied" >&2
    exit 1
  }
  psql -q -d "$DB" -c "insert into proof_field.applied_migrations (filename) values ('$base')" >/dev/null
done

# Organizations and units only. No demo harvest: this database holds what Aldo
# actually said and nothing else, so that nobody ever has to wonder which is
# which.
"${PSQL[@]}" --file "$ROOT/supabase/seed/cycle1.sql" >/dev/null

# ── the person using it ─────────────────────────────────────────────────────
# Identity normally originates from Supabase Auth, which is why the seed
# deliberately creates no users. On a laptop with no auth provider there has to
# be one, so it is made here, loudly, and only here.
"${PSQL[@]}" >/dev/null <<SQL
insert into auth.users (email) values ('$OPERATOR')
on conflict (email) do nothing;
select app.grant_membership('$WINERY', '$OPERATOR', 'owner');
SQL

# The app resolves whichever active membership it finds. If this user somehow
# had two, it would silently pick one and a whole session could land on the
# wrong producer. Refuse rather than risk it.
seen=$(psql -tAc "select count(*) from public.memberships m
                  join public.profiles p on p.id = m.user_id
                  where lower(p.email) = lower('$OPERATOR') and m.status = 'active'" -d "$DB" | tr -d ' ')
if [ "$seen" != "1" ]; then
  echo "  $OPERATOR can see $seen wineries — expected exactly 1. Not starting." >&2
  exit 1
fi

# A copy of everything before the session touches anything. The database on
# this laptop is the only record of every visit before this one.
events=$(psql -tAc "select count(*) from public.events" -d "$DB" | tr -d ' ')
if [ "$events" != "0" ]; then
  "$ROOT/scripts/backup.sh" >/dev/null 2>&1 && echo "▸ backed up $events event(s) before starting"
fi

# ── the app ─────────────────────────────────────────────────────────────────
cat > "$ROOT/web/.env.local" <<ENV
DATABASE_URL=postgres://postgres@127.0.0.1:$PGPORT/$DB
PROOF_DEV_USER=$OPERATOR
ENV

cd "$ROOT/web"
[ -d node_modules ] || { echo "▸ installing (once)"; npm install --silent; }

echo "▸ building"
npm run build >/dev/null 2>&1 || npm run build

name=$(psql -tAc "select name from public.organizations where slug = '$WINERY'" -d "$DB")
lots=$(psql -tAc "select count(*) from public.lots lo join public.organizations o on o.id = lo.organization_id where o.slug = '$WINERY'" -d "$DB" | tr -d ' ')

echo
echo "  $name · $WHO_FOR · $lots lot(s) already recorded"
echo "  http://localhost:$PORT"
echo
echo "  “Cuéntame qué ha pasado con tu vendimia.”"
echo
echo "  If something does not fit, capture it anyway — event, quantity, unit,"
echo "  and the rest in the note. Do not stop, do not invent a meaning."
echo
echo "  Afterwards:  ./scripts/backup.sh"
echo

exec npx next start -p "$PORT"
