#!/usr/bin/env bash

set -Eeuo pipefail

readonly SESSION_NAME="Oh-MY-TradingView"
readonly ROOT_DIR="${HOME}/code/Oh-MY-TradingView"
readonly LOG_FILE="${ROOT_DIR}/Oh-MY-TradingView.log"

die() {
  echo "devinit.sh: $*" >&2
  exit 1
}

escape() {
  printf '%q' "$1"
}

load_twitter_env() {
  local env_file="${ROOT_DIR}/config/.env"
  local line=""
  local key=""
  local value=""

  [[ -f "${env_file}" ]] || return 0

  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line%$'\r'}"
    [[ -n "${line//[[:space:]]/}" ]] || continue
    [[ "${line}" =~ ^[[:space:]]*# ]] && continue

    if [[ "${line}" =~ ^[[:space:]]*(export[[:space:]]+)?(TWITTER_AUTH_TOKEN|TWITTER_CT0|TWITTER_BIN)[[:space:]]*=(.*)$ ]]; then
      key="${BASH_REMATCH[2]}"
      value="${BASH_REMATCH[3]}"
      value="${value#"${value%%[![:space:]]*}"}"
      value="${value%"${value##*[![:space:]]}"}"

      if [[ "${value}" =~ ^\"(.*)\"$ ]]; then
        value="${BASH_REMATCH[1]}"
      elif [[ "${value}" =~ ^\'(.*)\'$ ]]; then
        value="${BASH_REMATCH[1]}"
      fi

      export "${key}=${value}"
    fi
  done < "${env_file}"
}

initialize_environment() {
  [[ -d "${ROOT_DIR}" ]] || die "~/code/Oh-MY-TradingView が存在しません"

  cd "${ROOT_DIR}"

  export LESS="-R"
  export EDITOR=nano
  export TERM=xterm-256color

  load_twitter_env

  if ! ssh-add -l >/dev/null 2>&1; then
    echo "[devinit] starting new ssh-agent..."
    eval "$(ssh-agent -s)" >/dev/null
    ssh-add ~/.ssh/id_ed25519 >/dev/null 2>&1 || true
  fi

  echo "Codex CLI 開発セッションを起動しています"
}

attach_or_switch() {
  if [[ -n "${TMUX:-}" ]]; then
    exec tmux switch-client -t "${SESSION_NAME}"
  fi
  exec tmux attach-session -t "${SESSION_NAME}"
}

pane_has_live_codex_descendant() {
  local pane_pid="$1"

  [[ "${pane_pid}" =~ ^[0-9]+$ ]] || return 1

  ps -eo pid=,ppid=,args= 2>/dev/null | awk -v root="${pane_pid}" '
    {
      pid = $1
      ppid = $2
      $1 = ""
      $2 = ""
      sub(/^[[:space:]]+/, "", $0)
      parents[pid] = ppid
      commands[pid] = $0
    }
    END {
      exit has_codex_descendant(root) ? 0 : 1
    }
    function is_codex_process(cmd) {
      return cmd ~ /(^|[[:space:]\/])codex([[:space:]]|$)/
    }
    function has_codex_descendant(node,    pid) {
      for (pid in parents) {
        if (parents[pid] == node) {
          if (is_codex_process(commands[pid]) || has_codex_descendant(pid)) {
            return 1
          }
        }
      }
      return 0
    }
  '
}

session_is_healthy() {
  local pane_count
  local pane_summary
  local pane_zero_pid
  local window_name

  window_name="$(tmux display-message -p -t "${SESSION_NAME}:0" '#W')"
  [[ "${window_name}" == "dev" ]] || return 1

  pane_count="$(tmux list-panes -t "${SESSION_NAME}:0" 2>/dev/null | wc -l | tr -d ' ')"
  [[ "${pane_count}" -eq 4 ]] || return 1

  pane_summary="$(tmux list-panes -t "${SESSION_NAME}:0" -F '#{pane_index}:#{pane_dead}:#{pane_title}:#{pane_current_command}:#{pane_pid}' 2>/dev/null)"
  pane_zero_pid="$(awk -F: '$1 == "0" && $2 == "0" { print $5 }' <<<"${pane_summary}")"

  pane_has_live_codex_descendant "${pane_zero_pid}" || return 1
  grep -Eq '^1:0:logs:tail:[0-9]+$' <<<"${pane_summary}" || return 1
  grep -Eq '^2:0:git:lazygit:[0-9]+$' <<<"${pane_summary}" || return 1
  grep -Eq '^3:0:keepalive:bash:[0-9]+$' <<<"${pane_summary}" || return 1
}

validate_paths() {
  [[ -d "${ROOT_DIR}" ]] || die "root directory not found: ${ROOT_DIR}"
  [[ -d "${ROOT_DIR}/scripts" ]] || die "scripts directory not found"
  [[ -d "${ROOT_DIR}/config" ]] || die "config directory not found"
}

create_layout() {
  tmux new-session -d -s "${SESSION_NAME}" -n dev -c "${ROOT_DIR}"

  tmux set-option -g mouse on
  tmux set-option -g aggressive-resize on
  tmux set-option -g history-limit 50000
  tmux set-option -g remain-on-exit on

  # 4ペイン構成: codex | logs | git | keepalive
  tmux split-window -h -t "${SESSION_NAME}:0.0" -c "${ROOT_DIR}"
  tmux split-window -v -t "${SESSION_NAME}:0.1" -c "${ROOT_DIR}"
  tmux split-window -v -t "${SESSION_NAME}:0.2" -c "${ROOT_DIR}"

  tmux setw -t "${SESSION_NAME}:0" pane-border-status top
  tmux select-pane -t "${SESSION_NAME}:0.0" -T codex
  tmux select-pane -t "${SESSION_NAME}:0.1" -T logs
  tmux select-pane -t "${SESSION_NAME}:0.2" -T git
  tmux select-pane -t "${SESSION_NAME}:0.3" -T keepalive

  tmux select-pane -t "${SESSION_NAME}:0.0"
}

start_commands() {
  local agent_cmd logs_cmd git_cmd keepalive_cmd

  gh auth status >/dev/null 2>&1 || gh auth login --hostname github.com --git-protocol ssh --web

  agent_cmd="cd $(escape "${ROOT_DIR}") && codex --full-auto --sandbox workspace-write --ask-for-approval never --cd $(escape "${ROOT_DIR}") --add-dir $(escape "${ROOT_DIR}")"
  logs_cmd="cd ${ROOT_DIR} && touch $(escape "${LOG_FILE}") && tail -F $(escape "${LOG_FILE}")"
  git_cmd="cd ${ROOT_DIR} && echo 'Launching lazygit...' && lazygit"
  keepalive_cmd="nice -n 19 bash -c 'while true; do sleep 300; done'"

  tmux send-keys -t "${SESSION_NAME}:0.0" "${agent_cmd}" C-m
  tmux send-keys -t "${SESSION_NAME}:0.1" "${logs_cmd}" C-m
  tmux send-keys -t "${SESSION_NAME}:0.2" "${git_cmd}" C-m
  tmux send-keys -t "${SESSION_NAME}:0.3" "${keepalive_cmd}" C-m

  sleep 2
  tmux select-pane -t "${SESSION_NAME}:0.0"
  tmux resize-pane -Z -t "${SESSION_NAME}:0.0"
}

main() {
  local current_tmux_session=""

  command -v tmux >/dev/null 2>&1 || die "tmux is not installed."
  command -v lazygit >/dev/null 2>&1 || die "lazygit is not installed."
  initialize_environment

  if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
    if session_is_healthy; then
      attach_or_switch
    fi

    if [[ -n "${TMUX:-}" ]]; then
      current_tmux_session="$(tmux display-message -p '#S' 2>/dev/null || true)"
      [[ "${current_tmux_session}" != "${SESSION_NAME}" ]] || die "既存セッションが不健全です。デタッチ後に再実行してください。"
    fi

    echo "既存 tmux セッション(${SESSION_NAME}) が不完全なため再作成します"
    tmux kill-session -t "${SESSION_NAME}"
  fi

  validate_paths
  touch "${LOG_FILE}"
  create_layout
  start_commands
  attach_or_switch
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
