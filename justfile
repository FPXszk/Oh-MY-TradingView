set shell := ["bash", "-cu"]

dev:
  ./devinit.sh

stop:
  tmux kill-session -t Oh-MY-TradingView

logs:
  tail -F Oh-MY-TradingView.log

devinit-logs:
  ls -lt logs/devinit 2>/dev/null || echo "No devinit logs yet"

session-logs:
  ls -lt logs/sessions
