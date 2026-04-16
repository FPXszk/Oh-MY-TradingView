# Current main backtest summary

このファイルは `python/night_batch.py` が backtest 完了後に deterministic に再生成する latest 要約です。  
ここでいう `latest` は **利用可能な最新 main backtest artifact から再生成した summary** を指し、`docs/research/current/README.md` にある handoff generation の `latest` とは別概念です。

- run_id: `20260415_121330`
- status: `SUCCESS`
- termination_reason: `success`
- failed_step: `—`
- last_checkpoint: `—`
- us_results: `artifacts/campaigns/next-long-run-us-finetune-100x10/smoke/recovered-results.json`
- jp_results: `artifacts/campaigns/next-long-run-jp-finetune-100x10/smoke/recovered-results.json`
- rich_report: `artifacts/night-batch/main-backtest-current-rich-report.md`
- ranking_artifact: `references/backtests/main-backtest-current-combined-ranking.json`
- strategy_catalog_snapshot: `artifacts/night-batch/main-backtest-current-strategy-catalog.snapshot.json`
- strategy_reference: `docs/research/strategy/current-strategy-reference.md`
- symbol_reference: `docs/research/strategy/current-symbol-reference.md`

## 結論

- **総合首位**: `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` / composite_score `6` / avg_net_profit `18918.78` / avg_profit_factor `1.828`
- **US 本命**: `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow` / avg_net_profit `20670.85` / avg_profit_factor `1.750`
- **JP 本命**: `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` / avg_net_profit `13641.52` / avg_profit_factor `2.039`
- **見方**: まず全戦略スコア一覧で composite score を見て、そのあと Top 5 戦略の銘柄別成績表で偏りを確認する。

## 全戦略スコア一覧

合成順位は **avg_net_profit 降順 / avg_profit_factor 降順 / avg_max_drawdown 昇順** の市場別順位を合算した deterministic score です。

| rank | presetId | composite_score | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | markets |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 6 | 18918.78 | 1.828 | 4620.50 | 44.28 | US |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow` | 9 | 20538.77 | 1.762 | 5181.22 | 42.95 | US |
| 3 | `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` | 10 | 13641.52 | 2.039 | 6458.07 | 42.38 | JP |
| 4 | `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | 10 | 11089.88 | 2.488 | 5349.78 | 44.41 | JP |
| 5 | `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late` | 14 | 12792.16 | 2.068 | 6762.80 | 42.17 | JP |
| 6 | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 15 | 20203.76 | 1.827 | 5975.64 | 45.36 | US |
| 7 | `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide` | 16 | 10992.05 | 2.015 | 5884.84 | 40.86 | JP |
| 8 | `donchian-55-18-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-exit-tight` | 27 | 14984.99 | 1.537 | 5753.41 | 42.61 | US |
| 9 | `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow` | 32 | 14332.34 | 1.798 | 5572.58 | 40.77 | US, JP |
| 10 | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier` | 33 | 15007.50 | 1.882 | 5935.26 | 43.83 | US, JP |
| 11 | `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early` | 37 | 15468.53 | 1.845 | 6216.44 | 42.69 | US, JP |
| 12 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | 39 | 15462.25 | 1.850 | 6186.16 | 42.29 | US, JP |
| 13 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | 39 | 15007.50 | 1.882 | 5935.26 | 43.83 | US, JP |
| 14 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 43 | 15468.53 | 1.845 | 6216.44 | 42.69 | US, JP |

## Top 5 戦略の銘柄別成績

### `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`

- composite_score: 6
- markets: US
- avg_net_profit: 18918.78 / avg_profit_factor: 1.828 / avg_max_drawdown: 4620.50

| symbol | label | market | net_profit | profit_factor | max_drawdown | win_rate | closed_trades |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| `AAPL` | Apple | US | 127990.98 | 3.340 | 15311.55 | 53.85 | 39.00 |
| `MSFT` | Microsoft | US | 17729.21 | 2.182 | 4691.30 | 46.15 | 39.00 |
| `QQQ` | Invesco QQQ Trust | US | 14898.41 | 2.588 | 1799.84 | 57.45 | 47.00 |
| `BRK.B` | Berkshire Hathaway B | US | 8646.23 | 2.064 | 3872.50 | 50.00 | 40.00 |
| `JPM` | JPMorgan Chase | US | 5617.89 | 1.349 | 4632.28 | 36.59 | 41.00 |
| `SPY` | SPDR S&P 500 ETF | US | 5378.51 | 1.692 | 1973.17 | 50.94 | 53.00 |
| `JNJ` | Johnson & Johnson | US | 3359.22 | 1.419 | 3992.95 | 46.15 | 39.00 |
| `DIA` | SPDR Dow Jones Industrial Average ETF | US | 3024.80 | 1.337 | 2323.95 | 42.31 | 52.00 |
| `WMT` | Walmart | US | 1489.87 | 1.217 | 3891.97 | 32.35 | 34.00 |
| `XOM` | Exxon Mobil | US | 1052.67 | 1.097 | 3715.44 | 27.03 | 37.00 |

### `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow`

- composite_score: 9
- markets: US
- avg_net_profit: 20538.77 / avg_profit_factor: 1.762 / avg_max_drawdown: 5181.22

| symbol | label | market | net_profit | profit_factor | max_drawdown | win_rate | closed_trades |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| `AAPL` | Apple | US | 150402.03 | 3.529 | 22131.58 | 53.85 | 39.00 |
| `MSFT` | Microsoft | US | 16430.73 | 2.015 | 3669.86 | 42.86 | 42.00 |
| `QQQ` | Invesco QQQ Trust | US | 15910.55 | 2.767 | 1849.15 | 56.25 | 48.00 |
| `BRK.B` | Berkshire Hathaway B | US | 5834.71 | 1.674 | 4401.47 | 40.48 | 42.00 |
| `JPM` | JPMorgan Chase | US | 4341.58 | 1.293 | 3787.37 | 35.71 | 42.00 |
| `SPY` | SPDR S&P 500 ETF | US | 3633.31 | 1.419 | 2401.96 | 47.27 | 55.00 |
| `JNJ` | Johnson & Johnson | US | 3536.97 | 1.403 | 4407.30 | 46.34 | 41.00 |
| `DIA` | SPDR Dow Jones Industrial Average ETF | US | 3238.68 | 1.348 | 2328.09 | 46.15 | 52.00 |
| `XOM` | Exxon Mobil | US | 2959.89 | 1.271 | 2617.95 | 30.56 | 36.00 |
| `WMT` | Walmart | US | -900.79 | 0.897 | 4217.48 | 30.00 | 40.00 |

### `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early`

- composite_score: 10
- markets: JP
- avg_net_profit: 13641.52 / avg_profit_factor: 2.039 / avg_max_drawdown: 6458.07

| symbol | label | market | net_profit | profit_factor | max_drawdown | win_rate | closed_trades |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| `TSE:9984` | SoftBank Group | JP | 39979.00 | 1.984 | 18838.00 | 28.95 | 38.00 |
| `TSE:6501` | Hitachi | JP | 25211.00 | 2.070 | 7019.00 | 48.57 | 35.00 |
| `TSE:8306` | Mitsubishi UFJ FG | JP | 23833.50 | 2.281 | 5065.00 | 42.42 | 33.00 |
| `TSE:7203` | Toyota Motor | JP | 15627.00 | 1.891 | 7759.00 | 45.95 | 37.00 |
| `TSE:6758` | Sony Group | JP | 15125.00 | 1.560 | 7958.00 | 55.00 | 40.00 |
| `TSE:1306` | NEXT FUNDS TOPIX ETF | JP | 10686.30 | 1.857 | 3211.00 | 35.71 | 42.00 |
| `TSE:8031` | Mitsui & Co. | JP | 5634.00 | 1.405 | 4959.00 | 42.50 | 40.00 |
| `TSE:1321` | NEXT FUNDS Nikkei 225 ETF | JP | 4120.00 | 5.736 | 600.00 | 60.00 | 5.00 |
| `TSE:9433` | KDDI | JP | -6.50 | 1.000 | 5155.50 | 35.71 | 42.00 |
| `TSE:9432` | NTT | JP | -3794.10 | 0.601 | 4016.20 | 28.95 | 38.00 |

### `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`

- composite_score: 10
- markets: JP
- avg_net_profit: 11089.88 / avg_profit_factor: 2.488 / avg_max_drawdown: 5349.78

| symbol | label | market | net_profit | profit_factor | max_drawdown | win_rate | closed_trades |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| `TSE:6501` | Hitachi | JP | 28921.00 | 2.244 | 9008.00 | 41.67 | 36.00 |
| `TSE:8306` | Mitsubishi UFJ FG | JP | 25871.00 | 2.736 | 4003.00 | 46.88 | 32.00 |
| `TSE:9984` | SoftBank Group | JP | 19816.00 | 1.993 | 7546.00 | 33.33 | 39.00 |
| `TSE:1306` | NEXT FUNDS TOPIX ETF | JP | 17002.40 | 2.692 | 2593.10 | 43.24 | 37.00 |
| `TSE:7203` | Toyota Motor | JP | 14528.00 | 1.803 | 8072.00 | 47.37 | 38.00 |
| `TSE:1321` | NEXT FUNDS Nikkei 225 ETF | JP | 4780.00 | 9.536 | 600.00 | 80.00 | 5.00 |
| `TSE:8031` | Mitsui & Co. | JP | 1888.00 | 1.135 | 6405.00 | 37.21 | 43.00 |
| `TSE:9433` | KDDI | JP | 721.50 | 1.045 | 6282.50 | 30.23 | 43.00 |
| `TSE:6758` | Sony Group | JP | 389.00 | 1.022 | 5549.00 | 50.00 | 42.00 |
| `TSE:9432` | NTT | JP | -3018.10 | 0.672 | 3439.20 | 34.21 | 38.00 |

### `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late`

- composite_score: 14
- markets: JP
- avg_net_profit: 12792.16 / avg_profit_factor: 2.068 / avg_max_drawdown: 6762.80

| symbol | label | market | net_profit | profit_factor | max_drawdown | win_rate | closed_trades |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| `TSE:9984` | SoftBank Group | JP | 41330.00 | 2.192 | 17094.00 | 29.41 | 34.00 |
| `TSE:6501` | Hitachi | JP | 34682.00 | 2.680 | 10654.00 | 48.39 | 31.00 |
| `TSE:7203` | Toyota Motor | JP | 19168.00 | 2.216 | 6196.00 | 46.88 | 32.00 |
| `TSE:8306` | Mitsubishi UFJ FG | JP | 15844.50 | 1.883 | 6466.00 | 39.39 | 33.00 |
| `TSE:1306` | NEXT FUNDS TOPIX ETF | JP | 8802.00 | 1.776 | 3505.00 | 38.46 | 39.00 |
| `TSE:8031` | Mitsui & Co. | JP | 5541.00 | 1.455 | 6673.00 | 47.37 | 38.00 |
| `TSE:1321` | NEXT FUNDS Nikkei 225 ETF | JP | 4090.00 | 5.701 | 600.00 | 60.00 | 5.00 |
| `TSE:6758` | Sony Group | JP | 2635.00 | 1.148 | 5902.00 | 46.15 | 39.00 |
| `TSE:9432` | NTT | JP | -1994.90 | 0.763 | 3385.50 | 36.36 | 33.00 |
| `TSE:9433` | KDDI | JP | -2176.00 | 0.865 | 7152.50 | 29.27 | 41.00 |


## US top 5 by avg_net_profit

| rank | presetId | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow` | 20670.85 | 1.750 | 5263.56 | 43.60 |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow` | 20538.77 | 1.762 | 5181.22 | 42.95 |
| 3 | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 20203.76 | 1.827 | 5975.64 | 45.36 |
| 4 | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 18918.78 | 1.828 | 4620.50 | 44.28 |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early` | 18774.30 | 1.701 | 5769.96 | 44.27 |

## JP top 5 by avg_net_profit

| rank | presetId | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` | 13641.52 | 2.039 | 6458.07 | 42.38 |
| 2 | `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late` | 12792.16 | 2.068 | 6762.80 | 42.17 |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | 12199.61 | 1.983 | 6662.93 | 40.90 |
| 4 | `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early` | 12162.77 | 1.989 | 6662.93 | 41.11 |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 12162.77 | 1.989 | 6662.93 | 41.11 |

## Live / Retired diff

- live_count: 30
- retired_count: 121

## 改善点と次回バックテスト確認事項

1. **Top 5 の確認**: `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`, `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow`, `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early`, `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`, `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late` の銘柄別表を見て、特定銘柄への依存が強すぎないか再確認する。
2. **US 側の掘り下げ**: `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow` が勝っている要因が entry timing か stop 幅かを切り分ける。
3. **JP 側の掘り下げ**: `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` が勝っている要因が exit の締め方か regime 閾値かを追加確認する。
4. **次回テンプレ運用**: 次回 backtest でもこの summary を上書きし、全戦略スコア一覧と Top 5 戦略の銘柄別成績表を定点比較する。
