set shell := ["bash", "-cu"]

dev:
  ./devinit.sh

stop:
  tmux kill-session -t Oh-MY-TradingView

logs:
  tail -F Oh-MY-TradingView.log

session-logs:
  ls -lt docs/working-memory/session-logs