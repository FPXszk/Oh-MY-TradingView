#!/usr/bin/env bash
# ensure-tradingview-recovery.sh
#
# TradingView Desktop crash detection and auto-recovery helper.
# Monitors TradingView process, CDP port 9222, and MCP health.
# On failure: kill → relaunch → wait for readiness → log result.
#
# Usage:
#   ./scripts/backtest/ensure-tradingview-recovery.sh --host 172.31.144.1 --port 9223
#
# Environment:
#   TV_CDP_HOST         Workflow health-check host (default: 127.0.0.1)
#   TV_CDP_PORT         Workflow health-check port (default: 9222)
#   TV_DESKTOP_PORT     TradingView Desktop remote-debugging port (default: 9222)
#   TV_EXE_PATH         TradingView executable (optional; auto-detected)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="${PROJECT_ROOT}/logs/tradingview-recovery.log"

HEALTH_HOST="${TV_CDP_HOST:-127.0.0.1}"
HEALTH_PORT="${TV_CDP_PORT:-9222}"
DESKTOP_PORT="${TV_DESKTOP_PORT:-9222}"
CHECK_INTERVAL="${TV_RECOVERY_INTERVAL:-30}"
MAX_RETRIES="${TV_RECOVERY_MAX_RETRIES:-2}"
READINESS_TIMEOUT="${TV_RECOVERY_READINESS_TIMEOUT:-60}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --host)
      HEALTH_HOST="$2"
      shift 2
      ;;
    --port)
      HEALTH_PORT="$2"
      shift 2
      ;;
    --desktop-port)
      DESKTOP_PORT="$2"
      shift 2
      ;;
    --interval)
      CHECK_INTERVAL="$2"
      shift 2
      ;;
    --max-retries)
      MAX_RETRIES="$2"
      shift 2
      ;;
    --readiness-timeout)
      READINESS_TIMEOUT="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [--host HOST] [--port PORT] [--desktop-port PORT] [--interval SEC] [--max-retries N] [--readiness-timeout SEC]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$(dirname "$LOG_FILE")"

log_msg() {
  local ts
  ts="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  printf '[%s] %s\n' "$ts" "$1" | tee -a "$LOG_FILE"
}

# Layer A: Process health — is TradingView running?
check_process() {
  if command -v pgrep >/dev/null 2>&1; then
    pgrep -if 'tradingview' >/dev/null 2>&1
  elif command -v tasklist.exe >/dev/null 2>&1; then
    tasklist.exe 2>/dev/null | grep -qi 'tradingview'
  else
    return 1
  fi
}

# Layer B: Port health — is CDP port listening and responding?
check_port() {
  local url="http://${HEALTH_HOST}:${HEALTH_PORT}/json/version"
  if command -v curl >/dev/null 2>&1; then
    curl -sf --connect-timeout 3 --max-time 5 "$url" >/dev/null 2>&1
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- --timeout=5 "$url" >/dev/null 2>&1
  else
    return 1
  fi
}

# Layer C: App health — does MCP/status report api_available?
check_mcp() {
  local node_bin
  node_bin="$(command -v node 2>/dev/null || echo 'node')"
  local result
  result="$(TV_CDP_HOST="$HEALTH_HOST" TV_CDP_PORT="$HEALTH_PORT" \
    "$node_bin" "$PROJECT_ROOT/src/cli/index.js" status 2>/dev/null || true)"
  echo "$result" | grep -q '"api_available":true'
}

# Kill all TradingView processes
kill_tradingview() {
  local pids
  log_msg "Killing TradingView processes..."
  if command -v pgrep >/dev/null 2>&1; then
    pids="$(pgrep -if 'tradingview' || true)"
    if [ -n "$pids" ]; then
      for pid in $pids; do
        kill "$pid" 2>/dev/null || true
      done
      sleep 2
      for pid in $pids; do
        kill -0 "$pid" 2>/dev/null && kill -9 "$pid" 2>/dev/null || true
      done
    fi
  elif command -v taskkill.exe >/dev/null 2>&1; then
    taskkill.exe /F /IM TradingView.exe 2>/dev/null || true
  fi
  sleep 2
}

# Relaunch TradingView via Node.js launcher
relaunch_tradingview() {
  log_msg "Relaunching TradingView with --remote-debugging-port=${DESKTOP_PORT}..."
  local node_bin
  node_bin="$(command -v node 2>/dev/null || echo 'node')"
  "$node_bin" -e "
    import { launchDesktop } from '${PROJECT_ROOT}/src/core/launch.js';
    try {
      const result = await launchDesktop({ port: ${DESKTOP_PORT} });
      process.stdout.write(JSON.stringify(result) + '\n');
    } catch (e) {
      process.stderr.write('Launch failed: ' + e.message + '\n');
      process.exit(1);
    }
  " 2>&1 | tee -a "$LOG_FILE"
}

# Wait for readiness with timeout
wait_readiness() {
  local timeout="${1:-$READINESS_TIMEOUT}"
  local elapsed=0
  log_msg "Waiting for readiness (timeout: ${timeout}s)..."
  while [ "$elapsed" -lt "$timeout" ]; do
    if check_port && check_mcp; then
      log_msg "Readiness confirmed after ${elapsed}s"
      return 0
    fi
    sleep 3
    elapsed=$((elapsed + 3))
  done
  log_msg "Readiness timeout after ${timeout}s"
  return 1
}

# Classify health state
classify_health() {
  local process_ok=false
  local port_ok=false
  local mcp_ok=false

  check_process && process_ok=true
  check_port && port_ok=true
  if $port_ok; then
    check_mcp && mcp_ok=true
  fi

  if ! $process_ok; then
    echo "critical:process-missing"
  elif ! $port_ok; then
    echo "moderate:cdp-unreachable"
  elif ! $mcp_ok; then
    echo "mild:mcp-unhealthy"
  else
    echo "none:healthy"
  fi
}

# Full recovery cycle
run_recovery() {
  local attempt=0
  local backoff_secs=(5 15 30 60)
  local classification

  while [ "$attempt" -lt "$MAX_RETRIES" ]; do
    attempt=$((attempt + 1))
    classification="$(classify_health)"
    local severity="${classification%%:*}"
    local category="${classification##*:}"

    log_msg "Recovery attempt ${attempt}/${MAX_RETRIES}: severity=${severity} category=${category}"

    if [ "$severity" = "none" ]; then
      log_msg "System healthy — no recovery needed"
      return 0
    fi

    if [ "$severity" = "critical" ] || [ "$severity" = "moderate" ]; then
      kill_tradingview
      relaunch_tradingview || true
    fi

    if wait_readiness 60; then
      log_msg "Recovery succeeded on attempt ${attempt}"
      return 0
    fi

    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      local idx=$((attempt - 1))
      if [ "$idx" -ge "${#backoff_secs[@]}" ]; then
        idx=$(( ${#backoff_secs[@]} - 1 ))
      fi
      local delay="${backoff_secs[$idx]}"
      log_msg "Backoff: waiting ${delay}s before next attempt..."
      sleep "$delay"
    fi
  done

log_msg "Recovery failed after ${MAX_RETRIES} attempts"
  return 1
}

# One-shot health check and recover if needed
one_shot() {
  local classification
  classification="$(classify_health)"
  local severity="${classification%%:*}"

  if [ "$severity" = "none" ]; then
    return 0
  fi

  log_msg "Health issue detected: ${classification}"
  run_recovery
}

# Main: parse arguments
one_shot
