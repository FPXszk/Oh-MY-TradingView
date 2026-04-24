# Session Log: round3 地合い判定・非NVDAユニバース・追加戦略実験

## メタデータ

- date: `2026-04-04`
- raw: `../../references/backtests/multi-universe-backtest-results_round3_20260404.json`
- summary: `../../research/multi-universe-backtest-results-round3_2015_2025.md`
- universes: `mag7`, `sp500-top10-point-in-time`
- strategies: `10`

## 今回やったこと

1. round1 / round2 の session log と research docs を再確認した
2. 地合い判定候補を比較し、`spy_above_sma200` と `rsp_above_sma200` を実装対象に絞った
3. NVDA 依存を薄めるため、`sp500-top10-point-in-time` と `mega-cap-ex-nvda` の方針を整理した
4. round3 用に 10 戦略を preset 化した
5. session artifact runner で multi-universe backtest を実行し、raw snapshot を repo に保存した

## 結果の要点

| universe | avg_net_profit | avg_profit_factor | best_combo |
|---|---|---|---|
| `mag7` | 27263.29 | 2.536 | `sma-cross-10-50-baseline × NVDA` |
| `sp500-top10-point-in-time` | 6859.23 | 1.898 | `ema-50-trend-filter-baseline × META` |

## 関連ファイル

- regime doc: [`../../research/market-regime-candidates-round3_2015_2025.md`](../../research/market-regime-candidates-round3_2015_2025.md)
- universe doc: [`../../research/universe-selection-candidates-round3_2015_2025.md`](../../research/universe-selection-candidates-round3_2015_2025.md)
- shortlist: [`../../research/multi-universe-strategy-shortlist-round3_2015_2025.md`](../../research/multi-universe-strategy-shortlist-round3_2015_2025.md)
- results: [`../../research/multi-universe-backtest-results-round3_2015_2025.md`](../../research/multi-universe-backtest-results-round3_2015_2025.md)
- raw: [`../../references/backtests/multi-universe-backtest-results_round3_20260404.json`](../../references/backtests/multi-universe-backtest-results_round3_20260404.json)

