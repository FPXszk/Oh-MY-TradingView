#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
readonly ARTIFACT_DIR="${PROJECT_ROOT}/artifacts/devinit"

RUN_ID="${1:-}"
EXIT_CODE="${2:-}"
SESSION_NAME="${3:-Oh-MY-TradingView}"
PANE_TARGET="${4:-${SESSION_NAME}:0.0}"
RUN_LOG="${5:-}"

[[ -n "${RUN_ID}" ]] || {
  echo "usage: $0 <run-id> <exit-code> [session-name] [pane-target] [run-log]" >&2
  exit 1
}

EVIDENCE_DIR="${ARTIFACT_DIR}/${RUN_ID}"
mkdir -p "${EVIDENCE_DIR}"

captured_at="$(date -Is)"

cat > "${EVIDENCE_DIR}/evidence.env" <<EOF
run_id=${RUN_ID}
exit_code=${EXIT_CODE}
captured_at=${captured_at}
session_name=${SESSION_NAME}
pane_target=${PANE_TARGET}
run_log=${RUN_LOG}
EOF

tmux capture-pane -p -t "${PANE_TARGET}" -S -200 > "${EVIDENCE_DIR}/pane.txt" 2>&1 || true
tmux list-panes -a -F '#{session_name}:#{window_index}.#{pane_index}:dead=#{pane_dead}:title=#{pane_title}:cmd=#{pane_current_command}:pid=#{pane_pid}' > "${EVIDENCE_DIR}/panes.txt" 2>&1 || true
ps -eo pid,ppid,pgid,sid,stat,etimes,args > "${EVIDENCE_DIR}/processes.txt" 2>&1 || true
