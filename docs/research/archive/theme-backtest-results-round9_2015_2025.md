# Round 9 Backtest Results — Mag7 (2015–2025)

- ステータス: COMPLETED
- 実行方式: shard parallel -> exact unreadable rerun -> recovered summary
- universe: Mag7（AAPL, AMZN, GOOG, META, MSFT, NVDA, TSLA）
- artifacts:
  - raw: `references/backtests/round9-theme-mag7-shard-parallel_20260407_1132.json`
  - raw summary: `references/backtests/round9-theme-mag7-shard-parallel_20260407_1132.summary.json`
  - recovered: `references/backtests/round9-theme-mag7-shard-parallel-recovered_20260407_1145.json`
  - recovered summary: `references/backtests/round9-theme-mag7-shard-parallel-recovered_20260407_1145.summary.json`
- coverage:
  - raw: `98 runs / 54 readable / 44 unreadable`
  - recovered: `98 runs / 81 readable / 17 unreadable / 27 recovered`

## 結果テーブル

| # | preset id | Avg Net Profit | PF | Max DD | Win Rate | Closed Trades | 備考 |
|---|---|---|---|---|---|---|---|
| 1 | `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` | 43448.74 | 3.19 | 10184.80 | 54.48 | 19.80 | quality family の Mag7 首位。`5/7` readable |
| 2 | `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed` | 38692.75 | 3.14 | 8768.58 | 52.90 | 20.17 | quality family の relaxed 版。`6/7` readable |
| 3 | `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | 36796.85 | 2.87 | 8671.96 | 52.42 | 20.33 | round8 tuned winner は Mag7 でも上位維持。`6/7` readable |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | 35325.53 | 3.37 | 7367.50 | 49.68 | 20.80 | non-quality 最上位。`5/7` readable |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide` | 31462.48 | 3.28 | 6939.95 | 50.26 | 20.17 | breadth-quality 改善版が Mag7 では有効。`6/7` readable |

## ランキング（Avg Net Profit 順）

1. `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict`
2. `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed`
3. `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced`
4. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
5. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`

## 観察メモ

- Mag7 単体では **quality family が top3 を独占**した。round7 base の `quality-strict` もまだ非常に強い。
- best combo は `quality-strict-relaxed__NVDA` で、top combo 群も NVDA 依存が極めて強い。
- ただし Mag7 raw は unreadable が多く、**recovered 後でも 17 unreadable が残る**。Mag7 の順位だけで採用判断すると過大評価しやすい。
- 実運用の判断基準は Mag7 単独ではなく、`theme-backtest-results-round9-alt_2015_2025.md` の alt recovered と合わせて行う。
