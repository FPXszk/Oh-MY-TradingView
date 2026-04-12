# Shortcut launch smoke test

- shortcut: `C:\TradingView\TradingView.exe - ショートカット.lnk`
- premise: Windows 9222 / WSL 172.31.144.1:9223

## Backtest


- command: `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma`
- exit_code: 0

## Output

```json
=== START backtest nvda-ma ===
{
  "success": true,
  "symbol": "BATS:NVDA",
  "compile_detail": {
    "success": true,
    "button_clicked": "チャートに追加",
    "has_errors": false,
    "error_count": 0,
    "warning_count": 0,
    "info_count": 0,
    "errors": [],
    "warnings": [],
    "infos": [],
    "study_added": true
  },
  "tester_available": true,
  "apply_failed": false,
  "metrics": {
    "net_profit": 9549987.59,
    "closed_trades": 154,
    "percent_profitable": 36.36,
    "profit_factor": 1.4566944756455777,
    "max_drawdown": 4792475.620000003
  },
  "restore_policy": "skip",
  "restore_success": true,
  "restore_skipped": true
}
exit_code=0

```

## Status after run

```json
{
  "success": true,
  "cdp_connected": true,
  "target_id": "EC2B029C0D669427DD4CF13FAE0C7937",
  "target_url": "https://jp.tradingview.com/chart/JV6Tvois/",
  "target_title": "TradingViewのリアルタイム株価、指数、先物、FX、そしてビットコインチャート",
  "chart_symbol": "BATS:NVDA",
  "chart_resolution": "D",
  "chart_type": 1,
  "api_available": true
}

```
