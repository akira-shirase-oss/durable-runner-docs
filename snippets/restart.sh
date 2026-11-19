# Fresh suite boundary: same processes, a new journal, so each suite's run ids start at 1.
# Optional env changes for the suite: HANDLER_CMD / HANDLER_PORT / HANDLER_REG swap the
# registered handler (the handlers suite uses its own logger instead of the pilot's).
# The old server drains on SIGTERM and must release its journal lock before the new one opens.
set -euo pipefail
cd "$SNIPPET_HOME/durable-runner"
for pidfile in .srv.pid .hnd.pid; do
	pid=$(cat "$pidfile" 2>/dev/null || true)
	if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
		kill "$pid" 2>/dev/null || true
		for _ in $(seq 1 100); do kill -0 "$pid" 2>/dev/null || break; sleep 0.1; done
	fi
done
rm -rf journal backups journal-restored handler-seen.jsonl
${HANDLER_CMD:-python3 examples/pilot/handler.py} ${HANDLER_PORT:-${HANDLER_BASE##*:}} >handler.log 2>&1 &
export HND=$!
echo $HND >.hnd.pid
./target/release/durable-server --journal journal --listen "${BASE#http://}" \
	--backup-root backups ${HANDLER_REG:---handler step=$HANDLER_BASE/step} \
	>server.log 2>&1 &
export SRV=$!
echo $SRV >.srv.pid
unset HANDLER_CMD HANDLER_PORT HANDLER_REG
for _ in $(seq 1 150); do
	curl -sf "$BASE/health" >/dev/null 2>&1 && return 0
	kill -0 $SRV 2>/dev/null || { echo "the new server died; server.log follows" >&2; tail -40 server.log >&2; return 1; }
	sleep 0.1
done
echo "server never became healthy; server.log follows" >&2
tail -40 server.log >&2
return 1
