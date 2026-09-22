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
#   ./scripts/field.sh            start everything, open http://localhost:3100
#   ./scripts/backup.sh           take a copy before anything risky
#
# Env:
#   PROOF_OPERATOR   the email PROOF signs you in as   (default: the git user)
#   PROOF_DATA       where the database lives          (default: proof/.data/pg)
#   PGPORT           (default 5433)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGPORT="${PGPORT:-5433}"
PGDATA="${PROOF_DATA:-$ROOT/.data/pg}"
DB="${PROOF_DB:-proof}"
OPERATOR="${PROOF_OPERATOR:-$(git -C "$ROOT" config user.email 2>/dev/null || echo 'operator@vinasdeltigre.example')}"
PORT="${PROOF_PORT:-3100}"

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

echo "▸ bringing the schema up to date"
for m in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" --file "$m" >/dev/null 2>&1 || {
    echo "  migration failed: $(basename "$m")" >&2
    "${PSQL[@]}" --file "$m" >/dev/null
  }
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
select app.grant_membership('vinas-del-tigre', '$OPERATOR', 'owner');
SQL

# ── the app ─────────────────────────────────────────────────────────────────
cat > "$ROOT/web/.env.local" <<ENV
DATABASE_URL=postgres://postgres@127.0.0.1:$PGPORT/$DB
PROOF_DEV_USER=$OPERATOR
ENV

cd "$ROOT/web"
[ -d node_modules ] || { echo "▸ installing (once)"; npm install --silent; }

echo "▸ building"
npm run build >/dev/null 2>&1 || npm run build

lots=$(psql -tAc "select count(*) from public.lots lo join public.organizations o on o.id = lo.organization_id where o.slug = 'vinas-del-tigre'" -d "$DB" | tr -d ' ')

echo
echo "  Viñas del Tigre · $lots lot(s) recorded · signed in as $OPERATOR"
echo "  http://localhost:$PORT"
echo
echo "  Data lives in $PGDATA — back it up with ./scripts/backup.sh"
echo

exec npx next start -p "$PORT"
