# The handlers suite's restart: a journal wiped clean plus the page's own logger.py in place of
# the pilot handler, registered as `log`, so the docs can show the real wire format it received.
set -euo pipefail
export HANDLER_CMD="python3 logger.py"
export HANDLER_REG="--handler log=$HANDLER_BASE/log"
source "$(dirname "${BASH_SOURCE[0]}")/restart.sh"
