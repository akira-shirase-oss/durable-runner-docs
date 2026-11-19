#!/bin/sh
# The gate. What CI runs, in order. Any step may stop it.
set -eu
cd "$(dirname "$0")/.."

node --test scripts/*.test.mjs
node scripts/check-urls.mjs
node scripts/check-openapi.mjs
node scripts/snippets.mjs --coverage
node scripts/copy-scalar.mjs
npm run build
node scripts/focusable-tables.mjs
node scripts/csp-hashes.mjs
node scripts/check-dist.mjs
node scripts/check-privacy.mjs
echo "check: all gates passed"
