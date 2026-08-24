#!/usr/bin/env bash
#
# Step 8's gate for F1: the dry run's worst sentence, said again through the
# real browser, and then asked of every surface that has to agree about it.
#
# Rebuilds the database first — a fidelity check that starts from a half-racked
# tank is checking the previous run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT/scripts/dev-db.sh" >/dev/null
cd "$ROOT/web"

if ! curl -sf -o /dev/null "${PROOF_URL:-http://localhost:3100}"; then
  echo "  the app is not running — start it with: cd web && npm run start" >&2
  exit 1
fi

exec node scripts/fidelity-f1.mjs
