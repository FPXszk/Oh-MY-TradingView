set shell := ["bash", "-cu"]

dev:
  ./devinit.sh

dev-copilot-legacy:
  cd . && copilot --yolo --remote --add-github-mcp-toolset all --add-dir .

stop:
  tmux kill-session -t Oh-MY-TradingView

logs:
  tail -F Oh-MY-TradingView.log

session-logs:
  ls -lt logs/sessions
