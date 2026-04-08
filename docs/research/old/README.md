# Archive: old backtest research docs

このディレクトリは、最新世代から **2 世代以上前** の backtest handoff / results を保管する archive です。

## 運用ルール

- **既定では読まない**。最新の研究状況は `docs/research/latest/` を先頭に読む
- 明示的に過去世代の経緯を確認したいときだけ参照する
- ここにある docs は routing docs（README / DOCUMENTATION_SYSTEM 等）の主導線からは外す
- 新しい世代が latest に入った際、2 世代以上前の docs はここへ移動する

## 配置されている docs

| file | 元の場所 | 概要 |
|---|---|---|
| `top4-backtest-handoff_20260407_0529.md` | latest | round10/11 top4 戦略 backtest handoff |
| `top4-backtest-results_20260407_0529.md` | latest | round10/11 top4 戦略 backtest 結果 |
| `top4-period-slicing-handoff_20260407_1641.md` | latest | period slicing + symbol universe 置換 handoff |
| `top4-period-slicing-results_20260407_1641.md` | latest | period slicing + symbol universe 置換 結果 |
| `backtest-reliability-handoff_20260407_1026.md` | latest | metrics unreadable 対策 handoff |
| `backtest-websocket-report-fallback_20260407_1334.md` | latest | WebSocket report fallback 実装記録 |

## 参照先

- 最新世代: `docs/research/latest/`
- 直前世代: `docs/research/` 直下
- 数値の正本: `docs/references/backtests/`
- 判断経緯: `docs/working-memory/session-logs/`
