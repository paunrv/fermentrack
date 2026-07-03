#!/usr/bin/env bash
# Remove ANTHROPIC_API_KEY from all Vercel environments for the linked project.
# Requires: npx vercel login (or VERCEL_TOKEN in env)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/apps/web"

if ! npx vercel@54.19.0 whoami >/dev/null 2>&1; then
  echo "Run: npx vercel login"
  exit 1
fi

for env in production preview development; do
  echo "Removing ANTHROPIC_API_KEY from $env..."
  npx vercel@54.19.0 env rm ANTHROPIC_API_KEY "$env" --yes || true
done

echo "Done. Verify with: npx vercel env ls"
