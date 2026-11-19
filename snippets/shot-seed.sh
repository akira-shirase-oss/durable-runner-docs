#!/usr/bin/env bash
# Local-only: seed the shot server (snippets/shot-server.sh) with runs worth
# looking at — two done, one still queued — for the Inspector screenshots.
set -euo pipefail
cd "$(dirname "$0")/../.snippets/work/durable-runner"

CLI="${CLI:-target/release/durable-cli}"
ADDR="${ADDR:-127.0.0.1:58541}"
export DURABLE_API_KEY="${SHOT_API_KEY:-shotkey-0123456789abcdef0123456789abcdef}"

"$CLI" --server "http://$ADDR" submit --op-key seed-run-1 \
  --step charge=invoices --step receipt=reports --input '{"amount":480,"customer":"ac-n7"}' >/dev/null
"$CLI" --server "http://$ADDR" submit --op-key seed-run-2 \
  --step charge=invoices --step receipt=reports --input '{"amount":1250,"customer":"ac-q2"}' >/dev/null
for _ in $(seq 1 50); do
  DONE=$("$CLI" --server "http://$ADDR" list | python3 -c \
    'import json,sys; print(sum(1 for r in json.load(sys.stdin)["runs"] if r["state"].startswith("done")))')
  [ "$DONE" -ge 2 ] && break
  sleep 0.3
done
"$CLI" --server "http://$ADDR" submit --op-key seed-run-3 \
  --step audit=invoices --input '{"probe":1}' --delay-ms 600000 >/dev/null
"$CLI" --server "http://$ADDR" list
