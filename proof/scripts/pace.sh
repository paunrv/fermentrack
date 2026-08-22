#!/usr/bin/env bash
#
# Step 5's gate: can capture keep pace with somebody talking?
#
# Rebuilds the database first, because the measurement is only meaningful from
# a known starting point — a half-finished lot from a previous run changes what
# the sheets prefill and quietly changes the answer.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT/scripts/dev-db.sh" >/dev/null
cd "$ROOT/web"

if ! curl -sf -o /dev/null "${PROOF_URL:-http://localhost:3100}"; then
  echo "  the app is not running — start it with: cd web && npm run start" >&2
  exit 1
fi

exec node scripts/pace.mjs
