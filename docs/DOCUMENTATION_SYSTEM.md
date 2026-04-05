# DOCUMENTATION_SYSTEM

## この文書の役割

- この文書は、この repo で「どの順番で文書を読むか」「どの文書が何の正本か」「どう鮮度を維持するか」を定義する入口です。
- まずはここに従って必要な文書へ進みます。

## 最初に読む順番

1. `.github/copilot-instructions.md`
2. `README.md`
3. `docs/DOCUMENTATION_SYSTEM.md`
4. 必要な個別文書

## docs ディレクトリの役割分担

| path | role | source-of-truth |
|---|---|---|
| `docs/research/` | 調査結果、要約、推奨、意思決定 | 解釈の正本 |
| `docs/references/` | raw artifact、参照用データ、外部資料の固定スナップショット | 生データの正本 |
| `docs/bad-strategy/` | alt universe で負けた戦略の記録 | negative strategy log の正本 |
| `docs/working-memory/session-logs/` | セッション要約、判断経緯、直近の作業コンテキスト | append-only |
| `docs/design-docs/` | 設計検討、構造説明 | 設計の正本 |
| `docs/exec-plans/` | 実装計画。`active/` でレビューし、完了後は `completed/` へ移す | 計画の正本 |

## バックテスト関連 docs の導線

### Mag7 戦略候補を知りたいとき

- [`docs/research/mag7-strategy-shortlist_2015_2025.md`](./research/mag7-strategy-shortlist_2015_2025.md)
- [`docs/research/mag7-strategy-shortlist-round2_2015_2025.md`](./research/mag7-strategy-shortlist-round2_2015_2025.md)

### 実測結果の要約を知りたいとき

- [`docs/research/mag7-backtest-results_2015_2025.md`](./research/mag7-backtest-results_2015_2025.md)
- [`docs/research/mag7-backtest-results-round2_2015_2025.md`](./research/mag7-backtest-results-round2_2015_2025.md)
- [`docs/research/multi-universe-backtest-results-round3_2015_2025.md`](./research/multi-universe-backtest-results-round3_2015_2025.md)
- [`docs/research/mag7-backtest-results-round4_2015_2025.md`](./research/mag7-backtest-results-round4_2015_2025.md)
- [`docs/research/multi-universe-backtest-results-round4_2015_2025.md`](./research/multi-universe-backtest-results-round4_2015_2025.md)
- [`docs/research/mag7-backtest-results-round5_2015_2025.md`](./research/mag7-backtest-results-round5_2015_2025.md)
- [`docs/research/multi-universe-backtest-results-round5_2015_2025.md`](./research/multi-universe-backtest-results-round5_2015_2025.md)
- [`docs/research/theme-backtest-results-round6_2015_2025.md`](./research/theme-backtest-results-round6_2015_2025.md)
- [`docs/research/theme-backtest-results-round6-alt_2015_2025.md`](./research/theme-backtest-results-round6-alt_2015_2025.md)
- [`docs/bad-strategy/round5-negative-alt-strategies_2015_2025.md`](./bad-strategy/round5-negative-alt-strategies_2015_2025.md)

### 生データを確認したいとき

- [`docs/references/backtests/mag7-backtest-results_20260404.json`](./references/backtests/mag7-backtest-results_20260404.json)
- [`docs/references/backtests/mag7-backtest-results_round2_20260404.json`](./references/backtests/mag7-backtest-results_round2_20260404.json)
- [`docs/references/backtests/multi-universe-backtest-results_round3_20260404.json`](./references/backtests/multi-universe-backtest-results_round3_20260404.json)
- [`docs/references/backtests/multi-universe-backtest-results_round3_20260404.summary.json`](./references/backtests/multi-universe-backtest-results_round3_20260404.summary.json)
- [`docs/references/backtests/breakout-deep-dive-round4_20260405.json`](./references/backtests/breakout-deep-dive-round4_20260405.json)
- [`docs/references/backtests/breakout-deep-dive-round4_20260405.summary.json`](./references/backtests/breakout-deep-dive-round4_20260405.summary.json)
- [`docs/references/backtests/breakout-deep-dive-round4-alt_20260405.json`](./references/backtests/breakout-deep-dive-round4-alt_20260405.json)
- [`docs/references/backtests/breakout-deep-dive-round4-alt_20260405.summary.json`](./references/backtests/breakout-deep-dive-round4-alt_20260405.summary.json)
- [`docs/references/backtests/breakout-rsi-round5_20260405.json`](./references/backtests/breakout-rsi-round5_20260405.json)
- [`docs/references/backtests/breakout-rsi-round5_20260405.summary.json`](./references/backtests/breakout-rsi-round5_20260405.summary.json)
- [`docs/references/backtests/breakout-rsi-round5-alt_20260405.json`](./references/backtests/breakout-rsi-round5-alt_20260405.json)
- [`docs/references/backtests/breakout-rsi-round5-alt_20260405.summary.json`](./references/backtests/breakout-rsi-round5-alt_20260405.summary.json)
- [`docs/references/backtests/round6-theme-mag7_20260405.json`](./references/backtests/round6-theme-mag7_20260405.json)
- [`docs/references/backtests/round6-theme-mag7_20260405.summary.json`](./references/backtests/round6-theme-mag7_20260405.summary.json)
- [`docs/references/backtests/round6-theme-alt_20260405.json`](./references/backtests/round6-theme-alt_20260405.json)
- [`docs/references/backtests/round6-theme-alt_20260405.summary.json`](./references/backtests/round6-theme-alt_20260405.summary.json)
- [`docs/references/backtests/round6-theme-alt-extension_20260405.json`](./references/backtests/round6-theme-alt-extension_20260405.json)
- [`docs/references/backtests/round6-theme-alt-extension_20260405.summary.json`](./references/backtests/round6-theme-alt-extension_20260405.summary.json)
- [`docs/references/backtests/round7-theme-mag7_20260405.json`](./references/backtests/round7-theme-mag7_20260405.json)
- [`docs/references/backtests/round7-theme-mag7_20260405.summary.json`](./references/backtests/round7-theme-mag7_20260405.summary.json)
- [`docs/references/backtests/round7-theme-alt_20260405.json`](./references/backtests/round7-theme-alt_20260405.json)
- [`docs/references/backtests/round7-theme-alt_20260405.summary.json`](./references/backtests/round7-theme-alt_20260405.summary.json)
- [`docs/references/backtests/round8-theme-mag7_20260405.json`](./references/backtests/round8-theme-mag7_20260405.json)
- [`docs/references/backtests/round8-theme-mag7_20260405.summary.json`](./references/backtests/round8-theme-mag7_20260405.summary.json)
- [`docs/references/backtests/round8-theme-alt_20260405.json`](./references/backtests/round8-theme-alt_20260405.json)
- [`docs/references/backtests/round8-theme-alt_20260405.summary.json`](./references/backtests/round8-theme-alt_20260405.summary.json)

### 研究用 / session batch input を確認したいとき

- [`config/backtest/strategy-presets.json`](../config/backtest/strategy-presets.json)
- [`config/backtest/universes/mag7.json`](../config/backtest/universes/mag7.json)
- [`config/backtest/universes/sp500-top10-point-in-time.json`](../config/backtest/universes/sp500-top10-point-in-time.json)
- [`config/backtest/universes/mega-cap-ex-nvda.json`](../config/backtest/universes/mega-cap-ex-nvda.json)
- これらは各 research round の session batch input であり、現時点の repo CLI / MCP の公開実装は `nvda-ma` 固定

### round3 の調査メモを見たいとき

- [`docs/research/market-regime-candidates-round3_2015_2025.md`](./research/market-regime-candidates-round3_2015_2025.md)
- [`docs/research/universe-selection-candidates-round3_2015_2025.md`](./research/universe-selection-candidates-round3_2015_2025.md)
- [`docs/research/multi-universe-strategy-shortlist-round3_2015_2025.md`](./research/multi-universe-strategy-shortlist-round3_2015_2025.md)

### round6 のテーマ投資メモを見たいとき

- [`docs/research/theme-signal-observation-round6_2015_2025.md`](./research/theme-signal-observation-round6_2015_2025.md)
- [`docs/research/theme-strategy-shortlist-round6_2015_2025.md`](./research/theme-strategy-shortlist-round6_2015_2025.md)
- [`docs/research/theme-backtest-results-round6_2015_2025.md`](./research/theme-backtest-results-round6_2015_2025.md)
- [`docs/research/theme-backtest-results-round6-alt_2015_2025.md`](./research/theme-backtest-results-round6-alt_2015_2025.md)

### round7 のテーマ投資メモを見たいとき

- [`docs/research/theme-signal-observation-round7_2015_2025.md`](./research/theme-signal-observation-round7_2015_2025.md)
- [`docs/research/theme-strategy-shortlist-round7_2015_2025.md`](./research/theme-strategy-shortlist-round7_2015_2025.md)
- [`docs/research/theme-backtest-results-round7_2015_2025.md`](./research/theme-backtest-results-round7_2015_2025.md)
- [`docs/research/theme-backtest-results-round7-alt_2015_2025.md`](./research/theme-backtest-results-round7-alt_2015_2025.md)

### round8 のテーマ投資メモを見たいとき

- [`docs/research/theme-signal-observation-round8_2015_2025.md`](./research/theme-signal-observation-round8_2015_2025.md)
- [`docs/research/theme-strategy-shortlist-round8_2015_2025.md`](./research/theme-strategy-shortlist-round8_2015_2025.md)
- [`docs/research/theme-backtest-results-round8_2015_2025.md`](./research/theme-backtest-results-round8_2015_2025.md)
- [`docs/research/theme-backtest-results-round8-alt_2015_2025.md`](./research/theme-backtest-results-round8-alt_2015_2025.md)

### セッションの判断経緯を追いたいとき

- [`docs/working-memory/session-logs/mag7-backtest-session-summary_20260404_1106.md`](./working-memory/session-logs/mag7-backtest-session-summary_20260404_1106.md)
- [`docs/working-memory/session-logs/mag7-backtest-session-summary_20260404_1252.md`](./working-memory/session-logs/mag7-backtest-session-summary_20260404_1252.md)
- [`docs/working-memory/session-logs/multi-universe-backtest-session-summary_20260404_1345.md`](./working-memory/session-logs/multi-universe-backtest-session-summary_20260404_1345.md)
- [`docs/working-memory/session-logs/breakout-deep-dive-round4_20260405_0027.md`](./working-memory/session-logs/breakout-deep-dive-round4_20260405_0027.md)
- [`docs/working-memory/session-logs/round5-breakout-rsi_20260405_1201.md`](./working-memory/session-logs/round5-breakout-rsi_20260405_1201.md)
- [`docs/working-memory/session-logs/round6-theme-trend_20260405_0603.md`](./working-memory/session-logs/round6-theme-trend_20260405_0603.md)
- [`docs/working-memory/session-logs/round7-theme-trend_20260405_0815.md`](./working-memory/session-logs/round7-theme-trend_20260405_0815.md)
- [`docs/working-memory/session-logs/round8-theme-trend_20260405_2219.md`](./working-memory/session-logs/round8-theme-trend_20260405_2219.md)

## 運用ルール

- 数値の正本は raw artifact に置き、summary doc には必要な集計だけを書く
- strategy id は backtick 付きの kebab-case で統一する
- 新しいバックテスト snapshot を追加したら、`research/` 側の summary と `DOCUMENTATION_SYSTEM.md` の導線も一緒に更新する
