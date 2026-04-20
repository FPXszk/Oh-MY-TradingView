#!/usr/bin/env bash
# run-night-batch-with-recovery.sh
#
# Launch night_batch inside a tmux session with crash recovery.
# Survives SSH disconnections. Automatically restarts TradingView
# Desktop if it crashes during the batch run.
#
# Usage:
#   ./scripts/tmux/run-night-batch-with-recovery.sh [night_batch args...]
#
# Examples:
#   # Default smoke-prod with recovery
#   ./scripts/tmux/run-night-batch-with-recovery.sh smoke-prod \
#     --config config/night_batch/bundle-foreground-reuse-config.json
#
#   # Attach to existing session
#   tmux attach -t night-batch
#
# Environment:
#   TMUX_SESSION_NAME   tmux session name (default: night-batch)
#   RECOVERY_INTERVAL   seconds between health checks (default: 60)
#   MAX_RECOVERY        max recovery attempts per failure (default: 2)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
RECOVERY_SCRIPT="${PROJECT_ROOT}/scripts/backtest/ensure-tradingview-recovery.sh"
SESSION_NAME="${TMUX_SESSION_NAME:-night-batch}"
RECOVERY_INTERVAL="${RECOVERY_INTERVAL:-60}"
MAX_RECOVERY="${MAX_RECOVERY:-2}"
LOG_DIR="${PROJECT_ROOT}/logs"

mkdir -p "$LOG_DIR"

log_msg() {
  local ts
  ts="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  printf '[%s] [tmux-runner] %s\n' "$ts" "$1" | tee -a "${LOG_DIR}/tmux-night-batch.log"
}

# Check if tmux is available
if ! command -v tmux >/dev/null 2>&1; then
  echo "Error: tmux is not installed. Install it with: sudo apt install tmux" >&2
  exit 1
fi

# Check if session already exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "tmux session '${SESSION_NAME}' already exists."
  echo "  Attach: tmux attach -t ${SESSION_NAME}"
  echo "  Kill:   tmux kill-session -t ${SESSION_NAME}"
  exit 1
fi

# Build the batch command
BATCH_ARGS=("$@")
if [ "${#BATCH_ARGS[@]}" -eq 0 ]; then
  echo "Usage: $0 <night_batch args...>"
  echo "Example: $0 smoke-prod --config config/night_batch/bundle-foreground-reuse-config.json"
  exit 1
fi

# Create tmux session with two panes:
# Pane 0: night_batch main process
# Pane 1: recovery watchdog
log_msg "Creating tmux session: ${SESSION_NAME}"

shell_join() {
  local out=""
  local item
  for item in "$@"; do
    printf -v item '%q' "$item"
    out="${out}${item} "
  done
  printf '%s' "${out% }"
}

PROJECT_ROOT_SHELL="$(shell_join "$PROJECT_ROOT")"
BATCH_ARGS_SHELL="$(shell_join "${BATCH_ARGS[@]}")"

# Start session with the batch command
BATCH_CMD="cd ${PROJECT_ROOT_SHELL} && python3 python/night_batch.py ${BATCH_ARGS_SHELL}"
tmux new-session -d -s "$SESSION_NAME" -n main "${BATCH_CMD}; echo '[batch finished]'; read"

# Split window for recovery watchdog
RECOVERY_SCRIPT_SHELL="$(shell_join "$RECOVERY_SCRIPT")"
WATCHDOG_CMD="cd ${PROJECT_ROOT_SHELL} && while true; do bash ${RECOVERY_SCRIPT_SHELL} --interval '${RECOVERY_INTERVAL}' --max-retries '${MAX_RECOVERY}'; sleep '${RECOVERY_INTERVAL}'; done"
tmux split-window -t "${SESSION_NAME}:main" -v -p 20 "$WATCHDOG_CMD"

# Select main pane
tmux select-pane -t "${SESSION_NAME}:main.0"

log_msg "Session '${SESSION_NAME}' created with batch + recovery watchdog"
echo ""
echo "tmux session '${SESSION_NAME}' started."
echo "  Attach:  tmux attach -t ${SESSION_NAME}"
echo "  Detach:  Ctrl-b d"
echo "  Kill:    tmux kill-session -t ${SESSION_NAME}"
echo "  Logs:    tail -f ${LOG_DIR}/tradingview-recovery.log"
echo ""
echo "The batch is running in pane 0, recovery watchdog in pane 1."
