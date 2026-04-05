# round5 breakout + RSI research session log

## 概要

- round4 の breakout deep dive を受けて、round5 では **breakout 改善 16 本 + RSI long-only 4 本** の計 20 本を追加検証した
- 実行順は plan どおり **Mag7 全件 → 上位 6 本を alt 2 ユニバース** の順
- 結果として、Mag7 首位は `donchian-55-20-baseline-r5`、alt 首位は `donchian-20-10-hard-stop-10pct`

## 実装メモ

### 追加した preset 群

- `donchian-20-10-hard-stop-{6,7,8(r5),10}pct`
- `donchian-20-10-atr-stop-2`
- `donchian-20-10-spy-filter-hard-stop-8pct`
- `donchian-20-10-rsp-filter-hard-stop-8pct`
- `donchian-20-10-rsi14-regime-{55,50}-hard-stop-8pct`
- `donchian-55-20-baseline-r5`
- `donchian-55-20-spy-filter-r5`
- `donchian-55-20-rsp-filter-r5`
- `donchian-55-20-spy-filter-hard-stop-8pct-r5`
- `donchian-55-20-rsp-filter-hard-stop-8pct-r5`
- `donchian-55-20-rsi14-regime-55-hard-stop-8pct`
- `donchian-55-20-rsi14-regime-50-spy-filter`
- `rsi2-buy-10-sell-65-long-only`
- `rsi2-buy-10-sell-70-spy-filter-long-only`
- `rsi3-buy-15-sell-65-long-only`
- `rsi5-buy-25-sell-55-long-only`

### コード変更

- `src/core/research-backtest.js`
  - `rsi_mean_reversion` builder を追加
  - `rsi_regime_filter` を追加
  - `allowEntry` を `inDateRange and regimeOk and rsiRegimeOk` へ拡張
- `src/core/preset-validation.js`
  - `rsi_regime_filter` の validation を追加
- `tests/backtest.test.js`
  - RSI long-only source と RSI regime guard の RED/GREEN を追加
- `tests/preset-validation.test.js`
  - `rsi_regime_filter` と round5 preset 群の検証を追加
- `config/backtest/strategy-presets.json`
  - round5 preset 20 本を追加

## 検証

- targeted RED/GREEN:
  - `node --test tests/backtest.test.js tests/preset-validation.test.js`
- full repo:
  - `npm run test:all`
- CDP 接続確認:
  - `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status`

## batch 実行

### Mag7

- runner: session artifact `round4-batch-runner.mjs` を env override で流用
- output:
  - `docs/references/backtests/breakout-rsi-round5_20260405.json`
  - `docs/references/backtests/breakout-rsi-round5_20260405.summary.json`
- result:
  - run-count `140`
  - tester-available `130`
  - top:
    1. `donchian-55-20-baseline-r5`
    2. `donchian-55-20-spy-filter-r5`
    3. `donchian-55-20-rsi14-regime-50-spy-filter`

### alt universe

- universes:
  - `sp500-top10-point-in-time`
  - `mega-cap-ex-nvda`
- selected strategies:
  - `donchian-55-20-baseline-r5`
  - `donchian-55-20-spy-filter-r5`
  - `donchian-55-20-rsi14-regime-50-spy-filter`
  - `donchian-20-10-hard-stop-6pct`
  - `donchian-20-10-rsi14-regime-55-hard-stop-8pct`
  - `donchian-20-10-hard-stop-10pct`
- output:
  - `docs/references/backtests/breakout-rsi-round5-alt_20260405.json`
  - `docs/references/backtests/breakout-rsi-round5-alt_20260405.summary.json`
- result:
  - run-count `120`
  - tester-available `119`
  - top:
    1. `donchian-20-10-hard-stop-10pct`
    2. `donchian-20-10-rsi14-regime-55-hard-stop-8pct`
    3. `donchian-20-10-hard-stop-6pct`

## 主要な判断

- **Mag7 最適** は `55/20` 系だったが、**alt 最適** は `20/10` 系だった
- `donchian-55-20-spy-filter-r5` は quality-improvement 枠として残す価値が高い
- `donchian-55-20-rsi14-regime-50-spy-filter` は alt で `spy-filter-r5` と同値だったため、追加条件の効きは限定的
- RSI long-only 群は全体順位では負けたが、`META` / `MSFT` / `GOOGL` では局所的に強かった
- bad-strategy 基準では **0 件**

## 欠測メモ

- Mag7:
  - `tester_available_count = 130 / 140`
  - 欠測 10 run は AAPL での apply failure（`Strategy not verified in chart studies after compile + retry`）
- alt:
  - `tester_available_count = 119 / 120`
  - 欠測 1 run は `sp500-top10-point-in-time / donchian-20-10-hard-stop-6pct × XOM`
  - reason: `metrics_unreadable`

## round5 の最終整理

- **non-NVDA再現型**: `donchian-20-10-hard-stop-10pct`, `donchian-20-10-rsi14-regime-55-hard-stop-8pct`
- **品質改善型**: `donchian-55-20-spy-filter-r5`
- **NVDA依存型**: `donchian-55-20-baseline-r5`

## 関連ファイル

- exec plan: `docs/exec-plans/completed/round5-breakout-rsi-research_20260405_1201.md`
- Mag7 doc: `docs/research/mag7-backtest-results-round5_2015_2025.md`
- alt doc: `docs/research/multi-universe-backtest-results-round5_2015_2025.md`
- bad-strategy doc: `docs/bad-strategy/round5-negative-alt-strategies_2015_2025.md`

## 完了状態

- review 指摘（generator / validator 整合）は修正済み
- `npm run test:all` 通過
- commit: `1521a6499e1c81bc15f14b8c5c92f495091d450d`
- push: `origin/main`
