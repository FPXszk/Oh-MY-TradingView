# Latest main backtest result

- status: COMPLETED
- style: detailed Japanese operator report
- date range: 2000-01-01 -> latest

## 参照アーティファクト

- US recovered full: `docs/research/results/campaigns/next-long-run-us-finetune-100x10/smoke/recovered-results.json`
- JP recovered full: `docs/research/results/campaigns/next-long-run-jp-finetune-100x10/smoke/recovered-results.json`
- combined ranking: `/home/fpxszk/code/Oh-MY-TradingView/docs/research/results/night-batch/20260415_121330-combined-ranking.json`
- strategy catalog snapshot: `/home/fpxszk/code/Oh-MY-TradingView/docs/research/results/night-batch/main-backtest-latest-strategy-catalog.snapshot.json`

## 結論

- **総合首位**: `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`（score 6 / avg net 18918.78 / avg PF 1.8284）
- **US 本命**: `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`（avg net 18918.78 / avg PF 1.8284）
- **JP 本命**: `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`（avg net 11089.88 / avg PF 2.4878）
- **読み方**: 全戦略の順位は market ごとの net / PF / drawdown 順位を合算した composite score を基準にし、そのうえで Top 5 の銘柄別明細で偏りを確認する。

## 実行カバレッジ

| market | success | failure | unreadable | total |
| --- | ---: | ---: | ---: | ---: |
| US | 100 | 0 | 0 | 100 |
| JP | 100 | 0 | 0 | 100 |

## 市場別スナップショット

### US 上位 5

| strategy | avg net | avg PF | avg MDD | avg win rate | avg trades |
| --- | ---: | ---: | ---: | ---: | ---: |
| `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 18918.78 | 1.8284 | 4620.50 | 44.28% | 42.10 |
| `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 20203.76 | 1.8268 | 5975.64 | 45.36% | 43.20 |
| `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | 18152.65 | 1.8012 | 5461.68 | 45.44% | 42.40 |
| `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier` | 18152.65 | 1.8012 | 5461.68 | 45.44% | 42.40 |
| `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow` | 20538.77 | 1.7616 | 5181.22 | 42.95% | 43.70 |

### JP 上位 5

| strategy | avg net | avg PF | avg MDD | avg win rate | avg trades |
| --- | ---: | ---: | ---: | ---: | ---: |
| `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | 11089.88 | 2.4878 | 5349.78 | 44.41% | 35.30 |
| `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late` | 12792.16 | 2.0678 | 6762.80 | 42.17% | 32.50 |
| `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` | 13641.52 | 2.0385 | 6458.07 | 42.38% | 35.00 |
| `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | 10992.05 | 2.0154 | 5884.84 | 40.86% | 32.30 |
| `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 12162.77 | 1.9891 | 6662.93 | 41.11% | 33.70 |

## 全戦略スコア一覧

| rank | strategy | markets | composite score | avg net | avg PF | avg MDD | avg win rate | tested symbols |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | US | 6 | 18918.78 | 1.8284 | 4620.50 | 44.28% | 10 |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow` | US | 9 | 20538.77 | 1.7616 | 5181.22 | 42.95% | 10 |
| 3 | `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` | JP | 10 | 13641.52 | 2.0385 | 6458.07 | 42.38% | 10 |
| 4 | `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | JP | 10 | 11089.88 | 2.4878 | 5349.78 | 44.41% | 10 |
| 5 | `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late` | JP | 14 | 12792.16 | 2.0678 | 6762.80 | 42.17% | 10 |
| 6 | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | US | 15 | 20203.76 | 1.8268 | 5975.64 | 45.36% | 10 |
| 7 | `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | JP | 16 | 10992.05 | 2.0154 | 5884.84 | 40.86% | 10 |
| 8 | `donchian-55-18-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-exit-tight` | US | 27 | 14984.99 | 1.5369 | 5753.41 | 42.61% | 10 |
| 9 | `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow` | JP, US | 32 | 14332.34 | 1.7988 | 5572.58 | 40.77% | 20 |
| 10 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier` | JP, US | 33 | 15007.50 | 1.8828 | 5935.26 | 43.83% | 20 |
| 11 | `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early` | JP, US | 37 | 15468.53 | 1.8450 | 6216.44 | 42.69% | 20 |
| 12 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | JP, US | 39 | 15462.25 | 1.8498 | 6186.16 | 42.29% | 20 |
| 13 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | JP, US | 39 | 15007.50 | 1.8828 | 5935.26 | 43.83% | 20 |
| 14 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | JP, US | 43 | 15468.53 | 1.8450 | 6216.44 | 42.69% | 20 |

## Top 5 戦略の銘柄別成績

### 1. `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`

- markets: US
- composite score: 6
- avg net: 18918.78 / avg PF: 1.8284 / avg MDD: 4620.50

| symbol | label | market | net profit | profit factor | max drawdown | max drawdown % | trades | win rate |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `AAPL` | Apple | US | 127990.98 | 3.3404 | 15311.55 | 153.12% | 39.00 | 53.85% |
| `MSFT` | Microsoft | US | 17729.21 | 2.1819 | 4691.30 | 46.91% | 39.00 | 46.15% |
| `QQQ` | Invesco QQQ Trust | US | 14898.41 | 2.5884 | 1799.84 | 18.00% | 47.00 | 57.45% |
| `BRK.B` | Berkshire Hathaway B | US | 8646.23 | 2.0637 | 3872.50 | 38.73% | 40.00 | 50.00% |
| `JPM` | JPMorgan Chase | US | 5617.89 | 1.3491 | 4632.28 | 46.32% | 41.00 | 36.59% |
| `SPY` | SPDR S&P 500 ETF | US | 5378.51 | 1.6916 | 1973.17 | 19.73% | 53.00 | 50.94% |
| `JNJ` | Johnson & Johnson | US | 3359.22 | 1.4190 | 3992.95 | 39.93% | 39.00 | 46.15% |
| `DIA` | SPDR Dow Jones Industrial Average ETF | US | 3024.80 | 1.3369 | 2323.95 | 23.24% | 52.00 | 42.31% |
| `WMT` | Walmart | US | 1489.87 | 1.2169 | 3891.97 | 38.92% | 34.00 | 32.35% |
| `XOM` | Exxon Mobil | US | 1052.67 | 1.0966 | 3715.44 | 37.15% | 37.00 | 27.03% |

### 2. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow`

- markets: US
- composite score: 9
- avg net: 20538.77 / avg PF: 1.7616 / avg MDD: 5181.22

| symbol | label | market | net profit | profit factor | max drawdown | max drawdown % | trades | win rate |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `AAPL` | Apple | US | 150402.03 | 3.5290 | 22131.58 | 221.32% | 39.00 | 53.85% |
| `MSFT` | Microsoft | US | 16430.73 | 2.0146 | 3669.86 | 36.70% | 42.00 | 42.86% |
| `QQQ` | Invesco QQQ Trust | US | 15910.55 | 2.7674 | 1849.15 | 18.49% | 48.00 | 56.25% |
| `BRK.B` | Berkshire Hathaway B | US | 5834.71 | 1.6742 | 4401.47 | 44.01% | 42.00 | 40.48% |
| `JPM` | JPMorgan Chase | US | 4341.58 | 1.2933 | 3787.37 | 37.87% | 42.00 | 35.71% |
| `SPY` | SPDR S&P 500 ETF | US | 3633.31 | 1.4190 | 2401.96 | 24.02% | 55.00 | 47.27% |
| `JNJ` | Johnson & Johnson | US | 3536.97 | 1.4030 | 4407.30 | 44.07% | 41.00 | 46.34% |
| `DIA` | SPDR Dow Jones Industrial Average ETF | US | 3238.68 | 1.3475 | 2328.09 | 23.28% | 52.00 | 46.15% |
| `XOM` | Exxon Mobil | US | 2959.89 | 1.2711 | 2617.95 | 26.18% | 36.00 | 30.56% |
| `WMT` | Walmart | US | -900.79 | 0.8971 | 4217.48 | 42.17% | 40.00 | 30.00% |

### 3. `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early`

- markets: JP
- composite score: 10
- avg net: 13641.52 / avg PF: 2.0385 / avg MDD: 6458.07

| symbol | label | market | net profit | profit factor | max drawdown | max drawdown % | trades | win rate |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `TSE:9984` | SoftBank Group | JP | 39979.00 | 1.9840 | 18838.00 | 188.38% | 38.00 | 28.95% |
| `TSE:6501` | Hitachi | JP | 25211.00 | 2.0698 | 7019.00 | 70.19% | 35.00 | 48.57% |
| `TSE:8306` | Mitsubishi UFJ FG | JP | 23833.50 | 2.2814 | 5065.00 | 50.65% | 33.00 | 42.42% |
| `TSE:7203` | Toyota Motor | JP | 15627.00 | 1.8914 | 7759.00 | 77.59% | 37.00 | 45.95% |
| `TSE:6758` | Sony Group | JP | 15125.00 | 1.5605 | 7958.00 | 79.58% | 40.00 | 55.00% |
| `TSE:1306` | NEXT FUNDS TOPIX ETF | JP | 10686.30 | 1.8569 | 3211.00 | 32.11% | 42.00 | 35.71% |
| `TSE:8031` | Mitsui & Co. | JP | 5634.00 | 1.4048 | 4959.00 | 49.59% | 40.00 | 42.50% |
| `TSE:1321` | NEXT FUNDS Nikkei 225 ETF | JP | 4120.00 | 5.7356 | 600.00 | 6.00% | 5.00 | 60.00% |
| `TSE:9433` | KDDI | JP | -6.50 | 0.9996 | 5155.50 | 51.55% | 42.00 | 35.71% |
| `TSE:9432` | NTT | JP | -3794.10 | 0.6011 | 4016.20 | 40.16% | 38.00 | 28.95% |

### 4. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`

- markets: JP
- composite score: 10
- avg net: 11089.88 / avg PF: 2.4878 / avg MDD: 5349.78

| symbol | label | market | net profit | profit factor | max drawdown | max drawdown % | trades | win rate |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `TSE:6501` | Hitachi | JP | 28921.00 | 2.2440 | 9008.00 | 90.08% | 36.00 | 41.67% |
| `TSE:8306` | Mitsubishi UFJ FG | JP | 25871.00 | 2.7363 | 4003.00 | 40.03% | 32.00 | 46.88% |
| `TSE:9984` | SoftBank Group | JP | 19816.00 | 1.9926 | 7546.00 | 75.46% | 39.00 | 33.33% |
| `TSE:1306` | NEXT FUNDS TOPIX ETF | JP | 17002.40 | 2.6924 | 2593.10 | 25.93% | 37.00 | 43.24% |
| `TSE:7203` | Toyota Motor | JP | 14528.00 | 1.8027 | 8072.00 | 80.72% | 38.00 | 47.37% |
| `TSE:1321` | NEXT FUNDS Nikkei 225 ETF | JP | 4780.00 | 9.5357 | 600.00 | 6.00% | 5.00 | 80.00% |
| `TSE:8031` | Mitsui & Co. | JP | 1888.00 | 1.1348 | 6405.00 | 64.05% | 43.00 | 37.21% |
| `TSE:9433` | KDDI | JP | 721.50 | 1.0452 | 6282.50 | 62.83% | 43.00 | 30.23% |
| `TSE:6758` | Sony Group | JP | 389.00 | 1.0224 | 5549.00 | 55.49% | 42.00 | 50.00% |
| `TSE:9432` | NTT | JP | -3018.10 | 0.6719 | 3439.20 | 34.39% | 38.00 | 34.21% |

### 5. `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late`

- markets: JP
- composite score: 14
- avg net: 12792.16 / avg PF: 2.0678 / avg MDD: 6762.80

| symbol | label | market | net profit | profit factor | max drawdown | max drawdown % | trades | win rate |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `TSE:9984` | SoftBank Group | JP | 41330.00 | 2.1918 | 17094.00 | 170.94% | 34.00 | 29.41% |
| `TSE:6501` | Hitachi | JP | 34682.00 | 2.6795 | 10654.00 | 106.54% | 31.00 | 48.39% |
| `TSE:7203` | Toyota Motor | JP | 19168.00 | 2.2157 | 6196.00 | 61.96% | 32.00 | 46.88% |
| `TSE:8306` | Mitsubishi UFJ FG | JP | 15844.50 | 1.8832 | 6466.00 | 64.66% | 33.00 | 39.39% |
| `TSE:1306` | NEXT FUNDS TOPIX ETF | JP | 8802.00 | 1.7764 | 3505.00 | 35.05% | 39.00 | 38.46% |
| `TSE:8031` | Mitsui & Co. | JP | 5541.00 | 1.4547 | 6673.00 | 66.73% | 38.00 | 47.37% |
| `TSE:1321` | NEXT FUNDS Nikkei 225 ETF | JP | 4090.00 | 5.7011 | 600.00 | 6.00% | 5.00 | 60.00% |
| `TSE:6758` | Sony Group | JP | 2635.00 | 1.1478 | 5902.00 | 59.02% | 39.00 | 46.15% |
| `TSE:9432` | NTT | JP | -1994.90 | 0.7632 | 3385.50 | 33.85% | 33.00 | 36.36% |
| `TSE:9433` | KDDI | JP | -2176.00 | 0.8649 | 7152.50 | 71.53% | 41.00 | 29.27% |

## 改善点と次回バックテスト確認事項

1. **Top 5 の再確認**: `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`, `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow`, `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early`, `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`, `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late` について、symbol table で一部銘柄依存が強すぎないかを次回 backtest で再確認する。
2. **US 側の確認事項**: `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`, `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`, `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` の差が entry timing 由来か stop 幅由来かを、同一 symbol 群で切り分ける。
3. **JP 側の確認事項**: `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`, `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late`, `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` の差が exit の締め方由来か regime 閾値由来かを追加比較する。
4. **次回のテンプレ運用**: rich report は全戦略スコア一覧を正本にし、Top 5 の銘柄別成績表で human review を行う。

