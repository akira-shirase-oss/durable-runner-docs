#!/usr/bin/env bash
# Local-only: bring up a seeded server + the built Inspector for screenshots.
set -euo pipefail
cd "$(dirname "$0")/../.snippets/work/durable-runner"

SERVER="${SERVER:-target/release/durable-server}"
ADDR="${ADDR:-127.0.0.1:58541}"
export DURABLE_API_KEY="${SHOT_API_KEY:-shotkey-0123456789abcdef0123456789abcdef}"
export DURABLE_READ_KEY="${SHOT_READ_KEY:-shotread-0123456789abcdef0123456789ab}"

rm -rf journal-shot shot-seen.jsonl
"$SERVER" --journal journal-shot --listen "$ADDR" --ui-dir apps/inspector/build \
  --handler invoices=http://127.0.0.1:58542 --handler reports=http://127.0.0.1:58542 \
  > shot-server.log 2>&1 &
echo "$!" > shot-server.pid
for _ in $(seq 1 50); do
  python3 - <<PY >/dev/null 2>&1 && break
import urllib.request; urllib.request.urlopen("http://$ADDR/health")
PY
  sleep 0.2
done
python3 - <<PY
import urllib.request
r = urllib.request.urlopen("http://$ADDR/inspector/")
print("inspector:", r.status, len(r.read()), "bytes")
PY
