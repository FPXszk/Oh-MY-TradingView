# Next long-run market-matched 200 results

- status: COMPLETED
- style: detailed Japanese operator report
- date range: 2000-01-01 -> latest

## Source artifacts

- US recovered full: `docs/references/backtests/long-run-us-entry-sweep-100x3-full-recovered_20260409_0643.json`
- JP recovered full: `docs/references/backtests/long-run-jp-exit-sweep-100x3-full-recovered_20260409_0643.json`
- combined ranking: `docs/references/backtests/next-long-run-market-matched-200-combined-ranking_20260409_1525.json`

## Coverage summary

| market | success | failure | unreadable | total |
| --- | ---: | ---: | ---: | ---: |
| US | 300 | 0 | 0 | 300 |
| JP | 300 | 0 | 0 | 300 |

## Final review

今回の full artifact は、**US / JP ともに 100 銘柄 x 3 戦略の完走結果を raw run 単位で再集計したもの**で、avg net だけでなく、ドローダウン、トレード数、勝率、profit-to-drawdown ratio まで含めて比較している。

結論としては、**US は entry timing の差がそのまま performance の差に残りやすく、JP は exit の締め方が成績差の中心**だった。したがって、次段の fine-tune は市場横断で一律に回すよりも、市場ごとに強かった family を中心に微調整する方が自然である。

## Overall top strategies

| rank | market | strategy | avg net | avg PF | avg MDD% | avg trades | avg win rate |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | JP | `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | 8105.93 | 2.4296 | 61.96% | 34.14 | 40.22% |
| 2 | JP | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 8548.16 | 1.7373 | 62.95% | 32.58 | 39.13% |
| 3 | JP | `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | 7693.68 | 1.7239 | 61.96% | 31.37 | 38.34% |
| 4 | US | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 8489.42 | 1.4443 | 49.02% | 38.82 | 43.40% |
| 5 | US | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 9741.65 | 1.4379 | 53.70% | 41.16 | 43.53% |

## US strategy summary

| strategy | avg net | median net | avg PF | avg MDD | avg MDD% | avg trades | avg win rate | positive runs | profit/DD | top symbols |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 9741.65 | 3536.07 | 1.4379 | 5369.88 | 53.70% | 41.16 | 43.53% | 75.00% | 1.8141 | `NVDA`, `AAPL`, `META`, `BLK`, `GS` |
| `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | 8652.78 | 2576.30 | 1.3776 | 5324.79 | 53.25% | 40.22 | 42.81% | 72.00% | 1.6250 | `NVDA`, `AAPL`, `META`, `BLK`, `CAT` |
| `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 8489.42 | 2957.65 | 1.4443 | 4902.13 | 49.02% | 38.82 | 43.40% | 79.00% | 1.7318 | `NVDA`, `AAPL`, `META`, `BLK`, `CI` |

### US review

- avg net 首位は `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`（9741.65）
- risk-adjusted 本命は `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`（avg PF 1.4443, avg MDD% 49.02%）
- 上位寄与銘柄は `NVDA`, `AAPL`, `META`, `BLK`, `CI` で、market 内の強さが一部の主力銘柄に寄りやすい
- 次段では、entry 由来の差なのか exit 由来の差なのかを sector / bucket / symbol cluster で分解する価値が高い

### US symbol top 10

| symbol | label | best strategy | avg net | avg PF | avg MDD | avg MDD% | avg trades | avg win rate |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `NVDA` | NVIDIA | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 255216.38 | 3.1998 | 32057.80 | 320.58% | 45.33 | 41.17% |
| `AAPL` | Apple | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | 130711.56 | 3.1473 | 22067.51 | 220.68% | 39.00 | 52.99% |
| `META` | Meta Platforms | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 42322.37 | 3.8844 | 6560.99 | 65.61% | 21.67 | 60.03% |
| `BLK` | BlackRock | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 34415.85 | 2.8814 | 7219.97 | 72.20% | 37.33 | 63.42% |
| `CI` | Cigna Group | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 28182.52 | 1.6679 | 24376.52 | 243.77% | 37.33 | 52.73% |
| `CAT` | Caterpillar | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 26743.68 | 1.9198 | 7323.69 | 73.24% | 37.33 | 44.68% |
| `GS` | Goldman Sachs | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 25922.01 | 1.8523 | 6544.42 | 65.44% | 44.00 | 40.15% |
| `LMT` | Lockheed Martin | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 23564.87 | 2.6698 | 4680.76 | 46.81% | 35.67 | 43.03% |
| `DE` | Deere & Company | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 18851.18 | 1.5218 | 19369.39 | 193.69% | 40.67 | 36.89% |
| `DIS` | Walt Disney | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 17898.28 | 2.4610 | 4653.45 | 46.53% | 35.00 | 60.10% |

### US symbol bottom 10

| symbol | label | best strategy | avg net | avg PF | avg MDD | avg MDD% | avg trades | avg win rate |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `INTC` | Intel | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | -6972.80 | 0.4257 | 7655.82 | 76.56% | 51.00 | 24.84% |
| `ADI` | Analog Devices | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | -5971.13 | 0.4529 | 6007.16 | 60.07% | 43.33 | 26.15% |
| `MDLZ` | Mondelez International | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | -4489.26 | 0.5191 | 4986.40 | 49.86% | 41.00 | 34.15% |
| `VZ` | Verizon | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | -4141.31 | 0.4760 | 4629.31 | 46.29% | 33.67 | 25.79% |
| `IBM` | IBM | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | -3938.18 | 0.6973 | 7117.00 | 71.17% | 46.33 | 37.42% |
| `MDT` | Medtronic | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | -3762.38 | 0.6215 | 4395.49 | 43.95% | 39.67 | 32.79% |
| `USB` | U.S. Bancorp | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | -3127.83 | 0.6245 | 4583.07 | 45.83% | 41.00 | 31.70% |
| `PFE` | Pfizer | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | -2699.95 | 0.7364 | 4620.42 | 46.20% | 29.00 | 34.43% |
| `T` | AT&T | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | -2640.63 | 0.6842 | 4157.52 | 41.58% | 35.00 | 35.29% |
| `PG` | Procter & Gamble | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | -2246.77 | 0.6602 | 2766.35 | 27.66% | 39.33 | 44.93% |

### US strategy-by-strategy notes

### `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
- avg net: 9741.65 / median net: 3536.07
- avg PF: 1.4379 / avg MDD: 5369.88 (53.70%)
- avg trades: 41.16 / avg win rate: 43.53% / positive-run rate: 75.00%
- 強い銘柄: `NVDA`, `AAPL`, `META`, `BLK`, `GS`
- 弱い銘柄: `ADI`, `INTC`, `VZ`

### `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
- avg net: 8652.78 / median net: 2576.30
- avg PF: 1.3776 / avg MDD: 5324.79 (53.25%)
- avg trades: 40.22 / avg win rate: 42.81% / positive-run rate: 72.00%
- 強い銘柄: `NVDA`, `AAPL`, `META`, `BLK`, `CAT`
- 弱い銘柄: `INTC`, `ADI`, `MDLZ`

### `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
- avg net: 8489.42 / median net: 2957.65
- avg PF: 1.4443 / avg MDD: 4902.13 (49.02%)
- avg trades: 38.82 / avg win rate: 43.40% / positive-run rate: 79.00%
- 強い銘柄: `NVDA`, `AAPL`, `META`, `BLK`, `CI`
- 弱い銘柄: `INTC`, `ADI`, `MDLZ`

## JP strategy summary

| strategy | avg net | median net | avg PF | avg MDD | avg MDD% | avg trades | avg win rate | positive runs | profit/DD | top symbols |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | 8105.93 | 4363.00 | 2.4296 | 6195.52 | 61.96% | 34.14 | 40.22% | 75.00% | 1.3084 | `TSE:8002`, `TSE:6506`, `TSE:8058`, `TSE:6501`, `TSE:8306` |
| `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 8548.16 | 3783.50 | 1.7373 | 6295.29 | 62.95% | 32.58 | 39.13% | 75.00% | 1.3579 | `TSE:8002`, `TSE:9984`, `TSE:5802`, `TSE:6506`, `TSE:9107` |
| `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | 7693.68 | 4618.75 | 1.7239 | 6196.48 | 61.96% | 31.37 | 38.34% | 73.00% | 1.2416 | `TSE:8002`, `TSE:6857`, `TSE:6506`, `TSE:5802`, `TSE:8058` |

### JP review

- avg net 首位は `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`（8548.16）
- risk-adjusted 本命は `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`（avg PF 2.4296, avg MDD% 61.96%）
- 上位寄与銘柄は `TSE:8002`, `TSE:6506`, `TSE:5802`, `TSE:9984`, `TSE:8058` で、market 内の強さが一部の主力銘柄に寄りやすい
- 次段では、entry 由来の差なのか exit 由来の差なのかを sector / bucket / symbol cluster で分解する価値が高い

### JP symbol top 10

| symbol | label | best strategy | avg net | avg PF | avg MDD | avg MDD% | avg trades | avg win rate |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `TSE:8002` | Marubeni | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 115168.00 | 5.3928 | 8169.67 | 81.70% | 30.33 | 61.30% |
| `TSE:6506` | Yaskawa Electric | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 37553.67 | 1.7679 | 16683.33 | 166.83% | 37.00 | 28.85% |
| `TSE:5802` | Sumitomo Electric | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 33138.33 | 3.1343 | 6521.67 | 65.22% | 35.00 | 46.76% |
| `TSE:9984` | SoftBank Group | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 31825.67 | 2.0822 | 13139.67 | 131.40% | 36.67 | 30.85% |
| `TSE:8058` | Mitsubishi Corp. | `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | 31512.00 | 2.7502 | 4938.00 | 49.38% | 40.00 | 50.85% |
| `TSE:9107` | Kawasaki Kisen Kaisha | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 29914.67 | 2.0475 | 12910.00 | 129.10% | 31.33 | 40.26% |
| `TSE:6857` | Advantest | `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | 29173.33 | 2.2706 | 6301.67 | 63.02% | 42.67 | 36.72% |
| `TSE:6501` | Hitachi | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 26667.67 | 2.1792 | 8430.00 | 84.30% | 34.33 | 43.75% |
| `TSE:8001` | ITOCHU | `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | 26088.17 | 2.2209 | 5549.00 | 55.49% | 36.67 | 54.59% |
| `TSE:8306` | Mitsubishi UFJ FG | `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | 21832.00 | 2.3223 | 5173.00 | 51.73% | 31.00 | 43.04% |

### JP symbol bottom 10

| symbol | label | best strategy | avg net | avg PF | avg MDD | avg MDD% | avg trades | avg win rate |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `TSE:7201` | Nissan Motor | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | -6248.63 | 0.5116 | 6938.97 | 69.39% | 40.00 | 32.54% |
| `TSE:4503` | Astellas Pharma | `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | -4871.33 | 0.5872 | 5772.33 | 57.72% | 41.00 | 34.12% |
| `TSE:7733` | Olympus | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | -4540.83 | 0.7323 | 8690.67 | 86.91% | 46.00 | 28.85% |
| `TSE:8766` | Tokio Marine | `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | -4156.00 | 0.6641 | 5834.00 | 58.34% | 39.67 | 31.13% |
| `TSE:8630` | Sompo Holdings | `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | -3957.33 | 0.7024 | 9206.67 | 92.07% | 36.00 | 27.78% |
| `TSE:9432` | NTT | `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | -3120.87 | 0.6593 | 3531.17 | 35.31% | 37.33 | 33.04% |
| `TSE:8053` | Sumitomo Corp. | `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | -3099.00 | 0.7875 | 9257.33 | 92.57% | 47.33 | 30.98% |
| `TSE:4568` | Daiichi Sankyo | `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | -2796.00 | 0.7958 | 5288.17 | 52.88% | 40.33 | 25.54% |
| `TSE:7751` | Canon | `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | -2334.67 | 0.7473 | 3446.67 | 34.47% | 42.33 | 37.86% |
| `TSE:2516` | NEXT FUNDS TOPIX High Dividend ETF | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | -2196.93 | 0.3635 | 2998.47 | 29.98% | 10.33 | 19.39% |

### JP strategy-by-strategy notes

### `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
- avg net: 8105.93 / median net: 4363.00
- avg PF: 2.4296 / avg MDD: 6195.52 (61.96%)
- avg trades: 34.14 / avg win rate: 40.22% / positive-run rate: 75.00%
- 強い銘柄: `TSE:8002`, `TSE:6506`, `TSE:8058`, `TSE:6501`, `TSE:8306`
- 弱い銘柄: `TSE:7201`, `TSE:7733`, `TSE:4503`

### `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
- avg net: 8548.16 / median net: 3783.50
- avg PF: 1.7373 / avg MDD: 6295.29 (62.95%)
- avg trades: 32.58 / avg win rate: 39.13% / positive-run rate: 75.00%
- 強い銘柄: `TSE:8002`, `TSE:9984`, `TSE:5802`, `TSE:6506`, `TSE:9107`
- 弱い銘柄: `TSE:7201`, `TSE:4503`, `TSE:8766`

### `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide`
- avg net: 7693.68 / median net: 4618.75
- avg PF: 1.7239 / avg MDD: 6196.48 (61.96%)
- avg trades: 31.37 / avg win rate: 38.34% / positive-run rate: 73.00%
- 強い銘柄: `TSE:8002`, `TSE:6857`, `TSE:6506`, `TSE:5802`, `TSE:8058`
- 弱い銘柄: `TSE:7201`, `TSE:4503`, `TSE:7733`

## 次に繋げる改善案

1. **US**: `strict-entry-early` と `strict-entry-late` の差を、主力銘柄依存か regime 感応度差かで切り分ける。特に `NVDA` / `AAPL` / `META` 依存が強いなら、entry を少し遅らせた control と shallow stop の比較を続ける。
2. **JP**: `tight` と `tight-exit-tight` の差を、総利益優先かドローダウン圧縮優先かで明確に分けて運用する。上位寄与銘柄が偏る場合は、entry 緩和より exit / stop の微調整を優先する。
3. **運用面**: 長時間 batch は shard parallel を優先し、worker2 は distinct parallel smoke を安定通過するまでは本線へ戻さない。checkpoint を 10 run 単位で刻み、fallback を first-class として扱う。
4. **Pine 運用**: 最終的な top 5 は Pine source を durable 保存し、local chart へ順次適用して人手レビューしやすい形にする。public publish は別タスクとして切り離す。
