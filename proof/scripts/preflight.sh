#!/usr/bin/env bash
#
# Can this laptop run a field session?
#
# Run it tonight, not tomorrow morning. Everything it checks is something that
# takes five minutes to fix at a desk and ruins a visit if it is discovered in
# a cellar.
#
#   ./scripts/preflight.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="/usr/lib/postgresql/16/bin:/opt/homebrew/opt/postgresql@16/bin:/usr/local/opt/postgresql@16/bin:$PATH"

fails=0
ok()   { printf '  \033[32m·\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m!\033[0m %s\n' "$1"; fails=$((fails+1)); }
hint() { printf '      %s\n' "$1"; }

echo
echo "PROOF · can this laptop run a session?"
echo

# ── Node ────────────────────────────────────────────────────────────────────
if command -v node >/dev/null; then
  major=$(node --version | sed 's/^v//' | cut -d. -f1)
  if [ "$major" -ge 20 ] 2>/dev/null; then
    ok "Node $(node --version)"
  else
    bad "Node $(node --version) — needs 20 or newer"
    hint "brew install node"
  fi
else
  bad "Node is not installed"
  hint "brew install node"
fi

# ── Postgres ────────────────────────────────────────────────────────────────
if command -v pg_ctl >/dev/null && command -v initdb >/dev/null && command -v psql >/dev/null; then
  pgv=$(psql --version | awk '{print $3}' | cut -d. -f1)
  if [ "$pgv" = "16" ]; then
    ok "Postgres $(psql --version | awk '{print $3}')"
  else
    bad "Postgres $pgv — the migrations are written for 16"
    hint "brew install postgresql@16"
  fi
else
  bad "Postgres 16 is not on the PATH"
  hint "brew install postgresql@16"
  hint 'then: export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"'
fi

# ── the app's dependencies ──────────────────────────────────────────────────
if [ -d "$ROOT/web/node_modules/next" ]; then
  ok "the app's dependencies are installed"
else
  bad "the app's dependencies are not installed"
  hint "cd web && npm install     (needs internet — do it before you leave)"
fi

# ── the port ────────────────────────────────────────────────────────────────
if curl -sf -o /dev/null --max-time 1 "http://localhost:${PROOF_PORT:-3100}"; then
  bad "something is already answering on port ${PROOF_PORT:-3100}"
  hint "stop it, or run with PROOF_PORT=3105"
else
  ok "port ${PROOF_PORT:-3100} is free"
fi

# ── who you will be signed in as ────────────────────────────────────────────
HUMAN="${PROOF_OPERATOR:-$(git -C "$ROOT" config user.email 2>/dev/null || echo '')}"
if [ -z "$HUMAN" ]; then
  bad "no operator email — PROOF would not know who is recording"
  hint "run sessions as: PROOF_OPERATOR=you@example.com ./scripts/field.sh tigre"
elif [ "${HUMAN#*@}" = "$HUMAN" ]; then
  bad "PROOF_OPERATOR must be an email address (got: $HUMAN)"
else
  ok "signing in as ${HUMAN%@*}+vinas-del-tigre@${HUMAN#*@}"
fi

# ── what is already recorded ────────────────────────────────────────────────
PGDATA="${PROOF_DATA:-$ROOT/.data/pg}"
if [ -f "$PGDATA/PG_VERSION" ]; then
  export PGHOST=127.0.0.1 PGPORT="${PGPORT:-5433}" PGUSER=postgres
  if pg_isready -q 2>/dev/null; then
    events=$(psql -tAc "select count(*) from public.events" -d "${PROOF_DB:-proof}" 2>/dev/null | tr -d ' ')
    ok "the field database exists · ${events:-0} event(s) already recorded"
  else
    ok "the field database exists (not running — field.sh will start it)"
  fi
  backups=$(ls "$ROOT"/.data/backups/*.sql 2>/dev/null | wc -l | tr -d ' ')
  if [ "$backups" = "0" ]; then
    hint "no backups yet — field.sh takes one automatically before each session"
  else
    ok "$backups backup(s) on disk"
  fi
else
  ok "no field database yet — the first session will create it"
fi

# ── room to work ────────────────────────────────────────────────────────────
free=$(df -Pm "$ROOT" 2>/dev/null | awk 'NR==2 {print $4}')
if [ -n "$free" ] && [ "$free" -lt 2000 ] 2>/dev/null; then
  bad "only ${free}MB free — Postgres and the build want a couple of gigabytes"
else
  ok "${free:-?}MB free on disk"
fi

echo
if [ "$fails" -gt 0 ]; then
  echo "  $fails thing(s) to fix before tomorrow."
  echo
  exit 1
fi

cat <<'READY'
  Ready. Tonight, once, to be sure:

      ./scripts/rehearsal.sh          Aldo's notebook, end to end, throwaway data

  Tomorrow, with him:

      PROOF_OPERATOR=you@example.com ./scripts/field.sh tigre

      "Cuéntame qué ha pasado con tu vendimia."

  Afterwards, before closing the laptop:

      ./scripts/backup.sh

READY
