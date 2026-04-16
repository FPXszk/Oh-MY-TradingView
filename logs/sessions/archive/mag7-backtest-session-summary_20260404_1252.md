# Session Log: Mag7 round2 戦略拡張と 140 run 完走

## メタデータ

- date: `2026-04-04`
- scope: `Mag7 / 20 strategies / 140 runs`
- baseline-round1:
  - shortlist: `../../research/mag7-strategy-shortlist_2015_2025.md`
  - summary: `../../research/mag7-backtest-results_2015_2025.md`
  - raw: `../../references/backtests/mag7-backtest-results_20260404.json`
- round2 artifacts:
  - shortlist: `../../research/mag7-strategy-shortlist-round2_2015_2025.md`
  - summary: `../../research/mag7-backtest-results-round2_2015_2025.md`
  - raw: `../../references/backtests/mag7-backtest-results_round2_20260404.json`

## 背景

- ユーザーは前回の session log と `docs/research/` の戦略群を踏まえて、さらに deep research し、約 20 戦略を再度 Mag7 で走らせて結果をまとめることを依頼した
- 前回の round1 では 10 戦略 / 70 run を完走しており、上位は `sma-200-trend-filter`, `donchian-breakout`, `supertrend-atr` だった

## 今回の判断

1. generic runner の repo 本実装ではなく、**session artifact runner 再利用** を優先した
2. 既存 10 戦略に対して、**既存 builder 再利用 6 件 + 新規 builder 4 件** を加えて 20 戦略に拡張した
3. 比較条件は round1 と揃え、`2015-01-01` 〜 `2025-12-31`, `10000 USD`, 日足, long-only を維持した

## 実施内容

1. `config/backtest/strategy-presets.json` を 20 戦略対応へ更新した
2. current session に `mag7-batch-runner-round2.mjs` を用意し、以下の新規 builder を追加した
   - `stochastic_cross`
   - `parabolic_sar`
   - `keltner_breakout`
   - `roc_momentum`
3. 新規 builder 4 件は `NVDA` で smoke test し、全件 `tester_available: true` で成功した
4. `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223` で 20戦略 × 7銘柄 = 140 run を実行した
5. raw JSON を repo の `docs/references/backtests/` へ保存し、round2 shortlist / summary docs を追加した

## 結果要約

- `140 / 140` 完走
- `success_count = 140`
- `tester_available_count = 140`
- compile warning は集計上 `0`
- top 5 strategy average net profit:
  1. `sma-200-trend-filter`
  2. `sma-cross-10-50`
  3. `ema-50-trend-filter`
  4. `keltner-breakout`
  5. `donchian-breakout`
- top combo は `sma-200-trend-filter × NVDA`
- `NVDA` 優位は継続したが、new entrant でも上位戦略が出た

## 所感

- round2 は round1 の焼き直しではなく、**新規候補が上位に食い込む拡張成功** だった
- 特に `sma-cross-10-50`, `ema-50-trend-filter`, `keltner-breakout` は次回改善対象として十分に強い
- mean reversion 群は平均純利益では負けるが、PF / win rate では依然として魅力がある

## 関連ファイル

- presets: [`../../../config/backtest/strategy-presets.json`](../../../config/backtest/strategy-presets.json)
- universe: [`../../../config/backtest/universes/mag7.json`](../../../config/backtest/universes/mag7.json)
- round2 shortlist: [`../../research/mag7-strategy-shortlist-round2_2015_2025.md`](../../research/mag7-strategy-shortlist-round2_2015_2025.md)
- round2 summary: [`../../research/mag7-backtest-results-round2_2015_2025.md`](../../research/mag7-backtest-results-round2_2015_2025.md)
- round2 raw: [`../../references/backtests/mag7-backtest-results_round2_20260404.json`](../../references/backtests/mag7-backtest-results_round2_20260404.json)
