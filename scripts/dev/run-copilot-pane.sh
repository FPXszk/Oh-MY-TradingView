#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
readonly LOG_DIR="${PROJECT_ROOT}/logs/devinit"
readonly ARTIFACT_DIR="${PROJECT_ROOT}/artifacts/devinit"
readonly STATUS_LOG="${LOG_DIR}/copilot-pane.status.log"
readonly EVIDENCE_SCRIPT="${PROJECT_ROOT}/scripts/dev/capture-copilot-pane-evidence.sh"
readonly COPILOT_PANE_MAX_RESTARTS=1

if ! command -v script >/dev/null 2>&1; then
  printf '[copilot-pane] FATAL: script(1) not found. Install util-linux.\n' >&2
  exit 1
fi

SESSION_NAME="${SESSION_NAME:-Oh-MY-TradingView}"
PANE_TARGET="${PANE_TARGET:-${SESSION_NAME}:0.0}"
RESPAWN_COUNT="${COPILOT_PANE_RESPAWN_COUNT:-0}"
RUN_ID="$(date '+%Y%m%d_%H%M%S')-${RESPAWN_COUNT}-$$"
RUN_LOG="${LOG_DIR}/${RUN_ID}.log"
RUN_ARTIFACT_DIR="${ARTIFACT_DIR}/${RUN_ID}"
TRANSCRIPT="${LOG_DIR}/${RUN_ID}.transcript"

mkdir -p "${LOG_DIR}" "${RUN_ARTIFACT_DIR}"

log_msg() {
  local ts
  ts="$(date -Is)"
  printf '[%s] [copilot-pane] %s\n' "${ts}" "$*" | tee -a "${STATUS_LOG}"
}

write_run_metadata() {
  local started_at="$1"
  local finished_at="$2"
  local exit_code="$3"

  cat > "${RUN_ARTIFACT_DIR}/meta.env" <<EOF
run_id=${RUN_ID}
session_name=${SESSION_NAME}
pane_target=${PANE_TARGET}
respawn_count=${RESPAWN_COUNT}
pid=$$
started_at=${started_at}
finished_at=${finished_at}
exit_code=${exit_code}
run_log=${RUN_LOG}
transcript=${TRANSCRIPT}
status_log=${STATUS_LOG}
EOF
}

started_at="$(date -Is)"
log_msg "starting run_id=${RUN_ID} respawn_count=${RESPAWN_COUNT} pid=$$ pane=${PANE_TARGET}"
{
  printf 'run_id=%s\n' "${RUN_ID}"
  printf 'run_log=%s\n' "${RUN_LOG}"
  printf 'transcript=%s\n' "${TRANSCRIPT}"
  printf 'artifact_dir=%s\n' "${RUN_ARTIFACT_DIR}"
} >> "${RUN_LOG}"

set +e
script -qefc 'copilot --yolo --add-github-mcp-toolset all --add-dir "'"${PROJECT_ROOT}"'"' "${TRANSCRIPT}"
exit_code=$?
set -e

finished_at="$(date -Is)"
write_run_metadata "${started_at}" "${finished_at}" "${exit_code}"

if [[ "${exit_code}" -eq 0 ]]; then
  log_msg "copilot exited cleanly run_id=${RUN_ID}"
  exit 0
fi

log_msg "copilot exited with code=${exit_code} run_id=${RUN_ID}"
bash "${EVIDENCE_SCRIPT}" "${RUN_ID}" "${exit_code}" "${SESSION_NAME}" "${PANE_TARGET}" "${RUN_LOG}" || true

if (( RESPAWN_COUNT < COPILOT_PANE_MAX_RESTARTS )); then
  next_respawn_count=$((RESPAWN_COUNT + 1))
  log_msg "captured evidence; respawning pane (${next_respawn_count}/${COPILOT_PANE_MAX_RESTARTS})"
  export COPILOT_PANE_RESPAWN_COUNT="${next_respawn_count}"
  exec bash "$0"
fi

log_msg "respawn budget exhausted; leaving pane in bash for diagnosis"
printf '\n[copilot pane] repeated failure detected.\n'
printf '[copilot pane] run_id=%s exit_code=%s\n' "${RUN_ID}" "${exit_code}"
printf '[copilot pane] inspect artifacts: %s\n' "${RUN_ARTIFACT_DIR}"
printf '[copilot pane] inspect logs: %s and %s\n' "${RUN_LOG}" "${STATUS_LOG}"
unset COPILOT_PANE_RESPAWN_COUNT
exec bash
