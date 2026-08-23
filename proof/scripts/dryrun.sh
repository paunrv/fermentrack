#!/usr/bin/env bash
#
# Step 7's dry run: a harvest morning read through the app as it stands.
#
# Rebuilds the database first. The run is a measurement, and a measurement from
# a half-finished previous run measures the previous run.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT/scripts/dev-db.sh" >/dev/null
cd "$ROOT/web"

if ! curl -sf -o /dev/null "${PROOF_URL:-http://localhost:3100}"; then
  echo "  the app is not running — start it with: cd web && npm run start" >&2
  exit 1
fi

exec node scripts/dryrun.mjs
