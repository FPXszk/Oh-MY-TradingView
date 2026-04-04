# Session Log: Mag7 バックテスト完走と docs 整備

## メタデータ

- session-id: `fa0aeefc-5de4-4e4e-aa8e-7b42d43ff69b`
- date: `2026-04-04`
- scope: `Mag7 / 10 strategies / 70 runs`
- raw-results: `../../references/backtests/mag7-backtest-results_20260404.json`
- summary-doc: `../../research/mag7-backtest-results_2015_2025.md`
- strategy-presets: `../../../config/backtest/strategy-presets.json`
- symbol-universe: `../../../config/backtest/universes/mag7.json`

## 背景と依頼

- TradingView Desktop 上で戦略バックテストが動く状態を前提に、Mag7 向けのおすすめ戦略をまず 10 件調査する依頼があった
- 条件は `2015-01-01` 〜 `2025-12-31`、初期資金 `10000 USD`、対象は `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`, `NVDA`, `TSLA`
- 調査後に、それぞれの戦略を実機で順にバックテストし、結果を比較できるようにすることが求められた

## 実施内容

1. `docs/research/mag7-strategy-shortlist_2015_2025.md` を作成し、10 戦略を shortlist 化した
2. `config/backtest/strategy-presets.json` と `config/backtest/universes/mag7.json` を local artifact として用意した
3. 直近の有効 CDP endpoint が `172.31.144.1:9223` であることを確認し、README と research doc を同期した
4. docs 同期結果は commit `729473f` (`docs: sync CDP connection assumptions`) として `main` に push した
5. repo 本体の generic runner は未実装のため、session artifact として `mag7-batch-runner.mjs` を作成し、70 run を実行した
6. run は `70/70` 完走し、失敗は `0` だった

## 調査した 10 戦略

- `sma-cross-5-20`
- `ema-cross-9-21`
- `macd-signal`
- `rsi-mean-reversion`
- `bb-mean-revert`
- `donchian-breakout`
- `supertrend-atr`
- `sma-200-trend-filter`
- `connors-rsi-pullback`
- `adx-ema-filter`

## 実機接続前提

- WSL から有効だった接続先は `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223`
- `localhost:9222` / `localhost:9223` はこの環境では使えなかった
- `status` と `backtest nvda-ma` はこの接続前提で成功した

## バックテスト結果の要約

- 70 run はすべて `tester_available: true` で取得できた
- 平均純利益の上位 3 戦略は以下:
  1. `sma-200-trend-filter`
  2. `donchian-breakout`
  3. `supertrend-atr`
- 銘柄別では `NVDA` の寄与が特に大きく、`sma-200-trend-filter × NVDA` が最大リターンだった

## Core Strategy 選定理由

| rank | strategy_id | rationale |
|---|---|---|
| 1 | `sma-200-trend-filter` | 平均純利益が突出し、今後の改善ベースとして扱いやすい |
| 2 | `donchian-breakout` | breakout 系として安定しており、改善余地も明確 |
| 3 | `supertrend-atr` | PF と DD のバランスが良く、調整余地がある |

## docs 整備方針

- raw snapshot は `docs/references/backtests/` に置く
- summary と意思決定は `docs/research/` に置く
- 会話要約や判断経緯は `docs/working-memory/session-logs/` に置く
- `docs/DOCUMENTATION_SYSTEM.md` から各 doc に辿れるようにする

## 残課題

- generic backtest runner / CLI / MCP の repo 本実装は未着手
- `config/backtest/` の durable 化は今後の plan で扱う
- core strategies の改善実験は、次回以降の exec-plan で個別に管理する

## 関連 docs

- shortlist: [`../../research/mag7-strategy-shortlist_2015_2025.md`](../../research/mag7-strategy-shortlist_2015_2025.md)
- results summary: [`../../research/mag7-backtest-results_2015_2025.md`](../../research/mag7-backtest-results_2015_2025.md)
- raw results: [`../../references/backtests/mag7-backtest-results_20260404.json`](../../references/backtests/mag7-backtest-results_20260404.json)
- strategy presets: [`../../../config/backtest/strategy-presets.json`](../../../config/backtest/strategy-presets.json)
- symbol universe: [`../../../config/backtest/universes/mag7.json`](../../../config/backtest/universes/mag7.json)
