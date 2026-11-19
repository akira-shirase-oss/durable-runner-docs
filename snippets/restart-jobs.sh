# The jobs suite's restart: the jobs page submits to handlers named `invoices` and `reports`, so
# the demo server registers both names (to the same example endpoint, as the quick start's `step`
# is) — the allowlist only requires the name be registered, not that it be a distinct service.
set -euo pipefail
export HANDLER_REG="--handler step=$HANDLER_BASE/step --handler invoices=$HANDLER_BASE/step --handler reports=$HANDLER_BASE/step"
source "$(dirname "${BASH_SOURCE[0]}")/restart.sh"
