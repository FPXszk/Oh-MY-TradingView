# Night Batch Self Hosted Run 94 — バックテスト結果まとめ

---

## ヘッダー

- run_id: `gha_25334885229_1`
- GHA run_number: `94`
- GHA run_id: `25334885229`
- artifact_id: `6795687255`
- round: `1`
- status: `SUCCESS`
- 実行日時: `2026-05-04T18:03:19Z` 〜 `2026-05-04T23:26:41Z`
- 対象市場: `US`（focus-8: MSTR / NVDA / BTCUSD / AAPL / TSLA / PLTR / QQQ / SPY）
- campaign_id: `emr-entry-quality-focus8-200pack`
- 目的: `EMA + MACD + RSI Strategy + SL を母体に、TP を使わず entry 条件・entry 前フィルタだけを変えた 10 family / 200 戦略で、ダマシ削減と期待値改善の候補を探索する`
- 戦略数: `200`
- 実行件数: `1600`（200 戦略 x 8銘柄）
- compile/apply 成功: `1600 / 1600`
- metrics 読み取り成功: `1600 / 1600`
- metrics_unreadable: `0 / 1600`

---

## 結論

- **総合首位**: `emr-entry-volq-range-05` / composite_score `49` / avg_net_profit `22,389.15` / avg_profit_factor `6.489` / avg_max_drawdown `1,876.65`
- **US 本命**: `emr-entry-vol-rel-03`。composite 2位だが family 平均と top10 占有で Volume 系が最も安定している。
- **JP 本命**: 対象外。今回 run は US focus-8 のみ。
- **今回目的としていたものが見れたか**: **見れた**。run 93 で欠損していた派生199戦略の Strategy Tester metrics が今回は全件読め、200戦略 x 8銘柄の比較が可能になった。
- **結論として有望だったグループ**: **第一候補は F Volume、第二候補は G Volatility quality**。G は composite 1位を出したが、上位戦略の NVDA 依存が強い。F は top10 に 8本入り、family 平均でも avg_net_profit `13,364.45` / PF `4.084` と最も安定している。

---

## 判断基準（固定値）

| 指標 | 優秀 | 許容 | 要注意 | 即除外 |
|---|---|---|---|---|
| avg_profit_factor | >= 2.0 | 1.7〜2.0 | 1.5〜1.7 | < 1.5 |
| avg_max_drawdown | < 5,000 | 5,000〜6,200 | 6,200〜7,000 | > 7,000 |
| avg_win_rate | >= 45% | 40〜45% | 35〜40% | < 35% |
| 銘柄集中度 | 最大1銘柄 < 30% | 30〜50% | 50〜70% | >= 70% |

**市場別 平均値（比較の基準として使う）**

| 市場 | 戦略数 | avg_net_profit 平均 | avg_profit_factor 平均 | avg_max_drawdown 平均 |
|---|---:|---:|---:|---:|
| US 専用 | 200 | 11,984.77 | 2.646 | 3,816.14 |
| JP 専用 | 0 | - | - | - |
| US+JP 両対応 | 0 | - | - | - |

---

## Family 別サマリー

| family | 戦略数 | avg_net_profit | avg_profit_factor | avg_max_drawdown | best preset | best score | top10本数 | top20本数 |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| G Volatility quality | 20 | 9,994.19 | 3.328 | 2,803.34 | `emr-entry-volq-range-05` | 49 | 2 | 4 |
| F Volume | 20 | 13,364.45 | 4.084 | 2,652.10 | `emr-entry-vol-rel-03` | 80 | 8 | 8 |
| H Extra momentum | 10 | 8,075.40 | 3.245 | 2,528.49 | `emr-entry-momo-adx-dmi-05` | 132 | 0 | 2 |
| E Trend/regime | 20 | 8,994.66 | 2.685 | 3,105.15 | `emr-entry-trend-adxtrend-score5` | 132 | 0 | 1 |
| B Confluence | 25 | 11,986.27 | 2.444 | 3,582.36 | `emr-entry-conf-score3-rsi60` | 156 | 0 | 5 |
| D Breakout structure | 25 | 8,714.58 | 3.555 | 2,152.53 | `emr-entry-struct-swing20-rsi58` | 173 | 0 | 0 |
| I Fakeout guard | 25 | 10,062.21 | 1.939 | 3,744.76 | `emr-entry-fake-failedbreak-02` | 211 | 0 | 0 |
| J Pullback resume | 20 | 5,395.43 | 1.547 | 2,735.07 | `emr-entry-pull-retest-05` | 256 | 0 | 0 |
| C Delay/follow-through | 25 | 4,429.44 | 1.868 | 1,940.46 | `emr-entry-delay-3barfastslowhist-rsi58` | 283 | 0 | 0 |
| A Baseline/sensitivity | 9 | 16,367.05 | 1.878 | 4,701.76 | `emr-entry-base-ema8-21` | 312 | 0 | 0 |
| A Baseline/control | 1 | 534,109.93 | 1.905 | 184,211.31 | `ema-macd-rsi-sl-baseline` | 352 | 0 | 0 |

**観察**: composite 首位は G Volatility quality の range 系だが、F Volume は top10 の 8本を占め、family 平均の PF も `4.084` と最上位。単発首位より family としての再現性を重視すると Volume 系が本命。

---

## 全戦略スコア一覧

composite_score は avg_net_profit 降順 / avg_profit_factor 降順 / avg_max_drawdown 昇順の順位合算。小さいほど優秀。

| rank | presetId | composite_score | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | markets | family |
|---:|---|---:|---:|---:|---:|---:|---|---|
| 1 | `emr-entry-volq-range-05` | 49 | 22,389.15 | 6.489 | 1,876.65 | 13.58% | `US` | G Volatility quality |
| 2 | `emr-entry-vol-rel-03` | 80 | 24,198.16 | 6.507 | 2,457.22 | 13.99% | `US` | F Volume |
| 3 | `emr-entry-volq-range-04` | 86 | 22,081.67 | 4.587 | 2,350.02 | 11.56% | `US` | G Volatility quality |
| 4 | `emr-entry-vol-spike-obv-05` | 90 | 16,420.31 | 5.835 | 2,395.36 | 12.30% | `US` | F Volume |
| 5 | `emr-entry-vol-rel-04` | 97 | 11,735.97 | 5.574 | 1,667.31 | 14.66% | `US` | F Volume |
| 6 | `emr-entry-vol-sma-05` | 97 | 11,735.97 | 5.574 | 1,667.31 | 14.66% | `US` | F Volume |
| 7 | `emr-entry-vol-spike-obv-04` | 101 | 15,311.45 | 4.232 | 2,267.81 | 9.34% | `US` | F Volume |
| 8 | `emr-entry-vol-sma-04` | 101 | 15,021.54 | 4.915 | 2,215.02 | 13.13% | `US` | F Volume |
| 9 | `emr-entry-vol-rel-02` | 114 | 21,989.89 | 4.957 | 2,950.61 | 11.98% | `US` | F Volume |
| 10 | `emr-entry-vol-sma-03` | 114 | 21,989.89 | 4.957 | 2,950.61 | 11.98% | `US` | F Volume |
| 11 | `emr-entry-volq-range-03` | 126 | 19,714.27 | 3.727 | 2,756.88 | 11.40% | `US` | G Volatility quality |
| 12 | `emr-entry-volq-range-02` | 128 | 18,589.07 | 3.725 | 2,693.88 | 10.86% | `US` | G Volatility quality |
| 13 | `emr-entry-momo-adx-dmi-05` | 132 | 8,513.20 | 8.841 | 1,126.60 | 13.41% | `US` | H Extra momentum |
| 14 | `emr-entry-trend-adxtrend-score5` | 132 | 8,513.20 | 8.841 | 1,126.60 | 13.41% | `US` | E Trend/regime |
| 15 | `emr-entry-momo-stoch-cci-roc-05` | 155 | 8,530.60 | 5.590 | 1,770.09 | 11.60% | `US` | H Extra momentum |
| 16 | `emr-entry-conf-score3-rsi60` | 156 | 13,041.65 | 3.602 | 2,557.21 | 10.86% | `US` | B Confluence |
| 17 | `emr-entry-conf-score4-rsi60` | 156 | 13,041.65 | 3.602 | 2,557.21 | 10.86% | `US` | B Confluence |
| 18 | `emr-entry-conf-score4closefast-rsi60` | 156 | 13,041.65 | 3.602 | 2,557.21 | 10.86% | `US` | B Confluence |
| 19 | `emr-entry-conf-score4hist-rsi60` | 156 | 13,041.65 | 3.602 | 2,557.21 | 10.86% | `US` | B Confluence |
| 20 | `emr-entry-conf-score5histclose-rsi60` | 156 | 13,041.65 | 3.602 | 2,557.21 | 10.86% | `US` | B Confluence |
| 21 | `emr-entry-vol-rel-05` | 162 | 6,042.91 | 10.401 | 838.81 | 19.52% | `US` | F Volume |
| 22 | `emr-entry-struct-swing20-rsi58` | 173 | 8,875.88 | 4.167 | 2,054.96 | 12.75% | `US` | D Breakout structure |
| 23 | `emr-entry-struct-close10-rsi60` | 173 | 8,744.97 | 4.127 | 2,003.80 | 13.29% | `US` | D Breakout structure |
| 24 | `emr-entry-struct-swing20-rsi60` | 174 | 8,680.32 | 4.406 | 2,046.02 | 13.67% | `US` | D Breakout structure |
| 25 | `emr-entry-volq-range-01` | 177 | 19,003.25 | 3.348 | 3,357.05 | 9.85% | `US` | G Volatility quality |
| 26 | `emr-entry-vol-rel-01` | 180 | 15,374.95 | 3.174 | 3,248.52 | 10.00% | `US` | F Volume |
| 27 | `emr-entry-vol-sma-02` | 180 | 15,374.95 | 3.174 | 3,248.52 | 10.00% | `US` | F Volume |
| 28 | `emr-entry-vol-spike-obv-03` | 181 | 15,053.86 | 3.218 | 3,223.49 | 8.83% | `US` | F Volume |
| 29 | `emr-entry-struct-intraday20-rsi55` | 181 | 9,943.16 | 3.808 | 2,358.38 | 11.89% | `US` | D Breakout structure |
| 30 | `emr-entry-struct-swing20-rsi55` | 182 | 8,683.46 | 4.003 | 2,105.69 | 12.11% | `US` | D Breakout structure |
| 31 | `emr-entry-struct-close10-rsi58` | 183 | 11,510.33 | 3.169 | 2,449.88 | 10.52% | `US` | D Breakout structure |
| 32 | `emr-entry-struct-close5-rsi60` | 186 | 8,563.53 | 3.929 | 2,068.58 | 13.05% | `US` | D Breakout structure |
| 33 | `emr-entry-struct-swing20-rsi50` | 187 | 8,644.43 | 3.962 | 2,119.61 | 11.49% | `US` | D Breakout structure |
| 34 | `emr-entry-struct-swing20-rsi52` | 187 | 8,644.43 | 3.962 | 2,119.61 | 11.49% | `US` | D Breakout structure |
| 35 | `emr-entry-momo-adx-dmi-04` | 190 | 7,053.69 | 3.786 | 1,640.44 | 6.64% | `US` | H Extra momentum |
| 36 | `emr-entry-trend-adxtrend-score4` | 190 | 7,053.69 | 3.786 | 1,640.44 | 6.64% | `US` | E Trend/regime |
| 37 | `emr-entry-struct-close10-rsi55` | 191 | 12,482.66 | 3.039 | 2,912.13 | 9.60% | `US` | D Breakout structure |
| 38 | `emr-entry-struct-close5-rsi58` | 198 | 11,246.10 | 2.999 | 2,532.66 | 10.09% | `US` | D Breakout structure |
| 39 | `emr-entry-vol-sma-01` | 203 | 14,701.26 | 3.177 | 3,410.98 | 9.14% | `US` | F Volume |
| 40 | `emr-entry-struct-intraday20-rsi50` | 204 | 9,745.80 | 3.666 | 2,463.82 | 11.05% | `US` | D Breakout structure |
| 41 | `emr-entry-struct-intraday20-rsi52` | 204 | 9,745.80 | 3.666 | 2,463.82 | 11.05% | `US` | D Breakout structure |
| 42 | `emr-entry-struct-close10-rsi50` | 205 | 12,003.36 | 2.866 | 2,936.65 | 9.16% | `US` | D Breakout structure |
| 43 | `emr-entry-struct-close10-rsi52` | 205 | 12,003.36 | 2.866 | 2,936.65 | 9.16% | `US` | D Breakout structure |
| 44 | `emr-entry-fake-failedbreak-02` | 211 | 18,188.39 | 3.006 | 3,542.13 | 9.98% | `US` | I Fakeout guard |
| 45 | `emr-entry-struct-donchian55compress-rsi60` | 214 | 1,954.17 | 3.734 | 696.93 | 9.97% | `US` | D Breakout structure |
| 46 | `emr-entry-struct-close5-rsi55` | 216 | 12,013.30 | 2.715 | 3,131.49 | 8.67% | `US` | D Breakout structure |
| 47 | `emr-entry-struct-intraday20-rsi60` | 216 | 8,116.31 | 3.683 | 2,192.56 | 13.02% | `US` | D Breakout structure |
| 48 | `emr-entry-struct-donchian55compress-rsi50` | 216 | 1,947.03 | 3.734 | 704.07 | 9.97% | `US` | D Breakout structure |
| 49 | `emr-entry-struct-donchian55compress-rsi52` | 216 | 1,947.03 | 3.734 | 704.07 | 9.97% | `US` | D Breakout structure |
| 50 | `emr-entry-struct-donchian55compress-rsi55` | 216 | 1,947.03 | 3.734 | 704.07 | 9.97% | `US` | D Breakout structure |
| 51 | `emr-entry-struct-donchian55compress-rsi58` | 216 | 1,947.03 | 3.734 | 704.07 | 9.97% | `US` | D Breakout structure |
| 52 | `emr-entry-struct-intraday20-rsi58` | 221 | 8,242.32 | 3.583 | 2,187.24 | 11.66% | `US` | D Breakout structure |
| 53 | `emr-entry-vol-cmf-mfi-04` | 232 | 9,147.60 | 2.814 | 2,526.01 | 10.31% | `US` | F Volume |
| 54 | `emr-entry-struct-close5-rsi50` | 234 | 15,116.33 | 2.794 | 3,608.28 | 8.81% | `US` | D Breakout structure |
| 55 | `emr-entry-struct-close5-rsi52` | 234 | 15,116.33 | 2.794 | 3,608.28 | 8.81% | `US` | D Breakout structure |
| 56 | `emr-entry-trend-ema200rising-score4` | 236 | 10,862.01 | 2.568 | 3,164.63 | 8.40% | `US` | E Trend/regime |
| 57 | `emr-entry-trend-ema200rising-score5` | 236 | 10,862.01 | 2.568 | 3,164.63 | 8.40% | `US` | E Trend/regime |
| 58 | `emr-entry-trend-ema200rising-soft` | 236 | 10,862.01 | 2.568 | 3,164.63 | 8.40% | `US` | E Trend/regime |
| 59 | `emr-entry-vol-spike-obv-01` | 238 | 15,283.30 | 2.539 | 3,585.38 | 8.01% | `US` | F Volume |
| 60 | `emr-entry-vol-cmf-mfi-05` | 238 | 4,062.70 | 2.830 | 861.73 | 9.67% | `US` | F Volume |
| 61 | `emr-entry-volq-atrband-04` | 251 | 10,540.38 | 13.859 | 4,111.67 | 11.82% | `US` | G Volatility quality |
| 62 | `emr-entry-trend-ema200rising-firm` | 254 | 9,787.99 | 2.488 | 2,924.38 | 8.35% | `US` | E Trend/regime |
| 63 | `emr-entry-pull-retest-05` | 256 | 11,496.01 | 2.184 | 3,206.63 | 6.23% | `US` | J Pullback resume |
| 64 | `emr-entry-trend-ema200rising-mid` | 257 | 10,923.71 | 2.528 | 3,305.48 | 8.21% | `US` | E Trend/regime |
| 65 | `emr-entry-fake-wick-04` | 265 | 13,135.65 | 2.119 | 3,326.20 | 7.63% | `US` | I Fakeout guard |
| 66 | `emr-entry-trend-adxtrend-firm` | 265 | 6,818.91 | 2.452 | 2,106.85 | 6.80% | `US` | E Trend/regime |
| 67 | `emr-entry-momo-stoch-cci-roc-01` | 266 | 15,438.35 | 2.236 | 3,980.32 | 8.73% | `US` | H Extra momentum |
| 68 | `emr-entry-volq-bbwidth-05` | 270 | 6,823.73 | 6.756 | 3,364.03 | 9.25% | `US` | G Volatility quality |
| 69 | `emr-entry-momo-stoch-cci-roc-04` | 274 | 7,783.17 | 2.299 | 2,413.85 | 9.02% | `US` | H Extra momentum |
| 70 | `emr-entry-conf-score3-rsi58` | 279 | 8,954.35 | 2.336 | 3,212.31 | 8.73% | `US` | B Confluence |
| 71 | `emr-entry-conf-score4-rsi58` | 279 | 8,954.35 | 2.336 | 3,212.31 | 8.73% | `US` | B Confluence |
| 72 | `emr-entry-conf-score4closefast-rsi58` | 279 | 8,954.35 | 2.336 | 3,212.31 | 8.73% | `US` | B Confluence |
| 73 | `emr-entry-conf-score4hist-rsi58` | 279 | 8,954.35 | 2.336 | 3,212.31 | 8.73% | `US` | B Confluence |
| 74 | `emr-entry-conf-score5histclose-rsi58` | 279 | 8,954.35 | 2.336 | 3,212.31 | 8.73% | `US` | B Confluence |
| 75 | `emr-entry-vol-spike-obv-02` | 283 | 12,214.59 | 2.084 | 3,344.45 | 7.11% | `US` | F Volume |
| 76 | `emr-entry-delay-3barfastslowhist-rsi58` | 283 | 6,493.84 | 2.135 | 1,857.87 | 7.62% | `US` | C Delay/follow-through |
| 77 | `emr-entry-fake-failedbreak-04` | 284 | 12,175.56 | 2.427 | 3,726.85 | 8.65% | `US` | I Fakeout guard |
| 78 | `emr-entry-volq-atrband-03` | 285 | 10,409.09 | 5.099 | 4,451.10 | 9.40% | `US` | G Volatility quality |
| 79 | `emr-entry-volq-atrband-02` | 287 | 16,265.00 | 2.271 | 4,802.44 | 8.95% | `US` | G Volatility quality |
| 80 | `emr-entry-fake-runup-01` | 287 | 10,863.18 | 2.044 | 3,022.00 | 7.76% | `US` | I Fakeout guard |
| 81 | `emr-entry-fake-failedbreak-05` | 290 | 11,628.50 | 2.187 | 3,509.30 | 9.83% | `US` | I Fakeout guard |
| 82 | `emr-entry-fake-failedbreak-01` | 290 | 9,805.53 | 2.539 | 3,443.35 | 7.81% | `US` | I Fakeout guard |
| 83 | `emr-entry-momo-adx-dmi-03` | 294 | 6,308.63 | 2.208 | 2,323.91 | 6.35% | `US` | H Extra momentum |
| 84 | `emr-entry-delay-1barhigh-rsi55` | 294 | 4,860.13 | 2.138 | 1,842.33 | 8.76% | `US` | C Delay/follow-through |
| 85 | `emr-entry-delay-1barhighfast-rsi55` | 294 | 4,860.13 | 2.138 | 1,842.33 | 8.76% | `US` | C Delay/follow-through |
| 86 | `emr-entry-fake-runup-02` | 299 | 10,827.71 | 2.172 | 3,400.98 | 8.38% | `US` | I Fakeout guard |
| 87 | `emr-entry-pull-retest-01` | 300 | 12,991.55 | 2.032 | 3,385.43 | 7.33% | `US` | J Pullback resume |
| 88 | `emr-entry-conf-score3-rsi55` | 300 | 10,583.35 | 2.178 | 3,487.47 | 8.55% | `US` | B Confluence |
| 89 | `emr-entry-conf-score4-rsi55` | 300 | 10,583.35 | 2.178 | 3,487.47 | 8.55% | `US` | B Confluence |
| 90 | `emr-entry-conf-score4closefast-rsi55` | 300 | 10,583.35 | 2.178 | 3,487.47 | 8.55% | `US` | B Confluence |
| 91 | `emr-entry-conf-score4hist-rsi55` | 300 | 10,583.35 | 2.178 | 3,487.47 | 8.55% | `US` | B Confluence |
| 92 | `emr-entry-conf-score5histclose-rsi55` | 300 | 10,583.35 | 2.178 | 3,487.47 | 8.55% | `US` | B Confluence |
| 93 | `emr-entry-trend-priceema200-firm` | 303 | 10,066.62 | 2.480 | 3,529.12 | 9.41% | `US` | E Trend/regime |
| 94 | `emr-entry-delay-2barhigh-rsi50` | 304 | 5,953.54 | 2.158 | 2,183.59 | 8.43% | `US` | C Delay/follow-through |
| 95 | `emr-entry-fake-runup-05` | 307 | 12,963.95 | 2.170 | 3,956.75 | 8.46% | `US` | I Fakeout guard |
| 96 | `emr-entry-delay-2barfasthist-rsi55` | 307 | 4,923.44 | 2.122 | 1,992.26 | 7.70% | `US` | C Delay/follow-through |
| 97 | `emr-entry-volq-atrband-01` | 310 | 16,093.76 | 2.136 | 4,831.70 | 8.89% | `US` | G Volatility quality |
| 98 | `emr-entry-base-ema8-21` | 312 | 16,941.62 | 2.084 | 4,758.06 | 8.64% | `US` | A Baseline/sensitivity |
| 99 | `emr-entry-delay-1barhigh-rsi50` | 313 | 4,473.32 | 2.076 | 1,924.74 | 8.49% | `US` | C Delay/follow-through |
| 100 | `emr-entry-delay-1barhighfast-rsi50` | 313 | 4,473.32 | 2.076 | 1,924.74 | 8.49% | `US` | C Delay/follow-through |
| 101 | `emr-entry-momo-adx-dmi-01` | 317 | 7,622.98 | 2.181 | 3,156.70 | 7.98% | `US` | H Extra momentum |
| 102 | `emr-entry-fake-runup-04` | 319 | 14,898.66 | 2.129 | 4,682.22 | 8.66% | `US` | I Fakeout guard |
| 103 | `emr-entry-trend-adxtrend-mid` | 319 | 7,682.29 | 2.105 | 2,762.39 | 7.42% | `US` | E Trend/regime |
| 104 | `emr-entry-delay-2barfasthist-rsi50` | 319 | 5,703.61 | 2.089 | 2,215.09 | 8.17% | `US` | C Delay/follow-through |
| 105 | `emr-entry-trend-priceema200-score4` | 322 | 10,362.32 | 2.242 | 3,719.89 | 8.98% | `US` | E Trend/regime |
| 106 | `emr-entry-trend-priceema200-score5` | 322 | 10,362.32 | 2.242 | 3,719.89 | 8.98% | `US` | E Trend/regime |
| 107 | `emr-entry-trend-priceema200-soft` | 322 | 10,362.32 | 2.242 | 3,719.89 | 8.98% | `US` | E Trend/regime |
| 108 | `emr-entry-delay-1barhigh-rsi52` | 323 | 4,369.27 | 2.041 | 1,912.70 | 7.79% | `US` | C Delay/follow-through |
| 109 | `emr-entry-delay-1barhighfast-rsi52` | 323 | 4,369.27 | 2.041 | 1,912.70 | 7.79% | `US` | C Delay/follow-through |
| 110 | `emr-entry-conf-score3-rsi50` | 324 | 14,036.87 | 2.069 | 4,445.07 | 8.44% | `US` | B Confluence |
| 111 | `emr-entry-conf-score4-rsi50` | 324 | 14,036.87 | 2.069 | 4,445.07 | 8.44% | `US` | B Confluence |
| 112 | `emr-entry-conf-score4closefast-rsi50` | 324 | 14,036.87 | 2.069 | 4,445.07 | 8.44% | `US` | B Confluence |
| 113 | `emr-entry-conf-score4hist-rsi50` | 324 | 14,036.87 | 2.069 | 4,445.07 | 8.44% | `US` | B Confluence |
| 114 | `emr-entry-conf-score5histclose-rsi50` | 324 | 14,036.87 | 2.069 | 4,445.07 | 8.44% | `US` | B Confluence |
| 115 | `emr-entry-conf-score3-rsi52` | 326 | 13,315.11 | 2.035 | 4,209.75 | 8.05% | `US` | B Confluence |
| 116 | `emr-entry-conf-score4-rsi52` | 326 | 13,315.11 | 2.035 | 4,209.75 | 8.05% | `US` | B Confluence |
| 117 | `emr-entry-conf-score4closefast-rsi52` | 326 | 13,315.11 | 2.035 | 4,209.75 | 8.05% | `US` | B Confluence |
| 118 | `emr-entry-conf-score4hist-rsi52` | 326 | 13,315.11 | 2.035 | 4,209.75 | 8.05% | `US` | B Confluence |
| 119 | `emr-entry-conf-score5histclose-rsi52` | 326 | 13,315.11 | 2.035 | 4,209.75 | 8.05% | `US` | B Confluence |
| 120 | `emr-entry-delay-2barfasthist-rsi58` | 327 | 3,259.80 | 2.013 | 1,614.83 | 7.36% | `US` | C Delay/follow-through |
| 121 | `emr-entry-trend-priceema200-mid` | 332 | 10,374.45 | 2.218 | 3,912.40 | 8.87% | `US` | E Trend/regime |
| 122 | `emr-entry-trend-ema50over200-firm` | 333 | 7,146.96 | 2.319 | 3,269.42 | 8.04% | `US` | E Trend/regime |
| 123 | `emr-entry-vol-cmf-mfi-03` | 334 | 8,142.06 | 2.141 | 3,249.00 | 9.09% | `US` | F Volume |
| 124 | `emr-entry-volq-bbwidth-03` | 334 | 6,640.31 | 3.159 | 3,504.53 | 9.73% | `US` | G Volatility quality |
| 125 | `emr-entry-delay-2barhigh-rsi52` | 336 | 5,261.30 | 2.027 | 2,103.65 | 7.84% | `US` | C Delay/follow-through |
| 126 | `emr-entry-fake-clv-01` | 341 | 11,510.73 | 2.043 | 3,771.00 | 8.30% | `US` | I Fakeout guard |
| 127 | `emr-entry-pull-fast-hold-05` | 342 | 9,930.86 | 2.000 | 3,248.28 | 8.58% | `US` | J Pullback resume |
| 128 | `emr-entry-momo-stoch-cci-roc-03` | 343 | 7,824.37 | 2.005 | 2,650.69 | 7.99% | `US` | H Extra momentum |
| 129 | `emr-entry-delay-3barfastslowhist-rsi60` | 343 | 4,057.85 | 1.832 | 1,438.72 | 7.73% | `US` | C Delay/follow-through |
| 130 | `emr-entry-delay-1barhigh-rsi58` | 343 | 2,574.63 | 1.925 | 1,482.43 | 8.27% | `US` | C Delay/follow-through |
| 131 | `emr-entry-delay-1barhighfast-rsi58` | 343 | 2,574.63 | 1.925 | 1,482.43 | 8.27% | `US` | C Delay/follow-through |
| 132 | `emr-entry-base-macd15-30-10` | 344 | 13,804.34 | 2.029 | 4,436.27 | 9.47% | `US` | A Baseline/sensitivity |
| 133 | `emr-entry-volq-bbwidth-04` | 349 | 6,000.04 | 3.107 | 3,555.92 | 9.02% | `US` | G Volatility quality |
| 134 | `ema-macd-rsi-sl-baseline` | 352 | 534,109.93 | 1.905 | 184,211.31 | 36.99% | `US` | A Baseline/control |
| 135 | `emr-entry-trend-adxtrend-soft` | 352 | 7,386.78 | 2.008 | 2,840.43 | 7.33% | `US` | E Trend/regime |
| 136 | `emr-entry-delay-2barfasthist-rsi52` | 352 | 5,085.33 | 1.987 | 2,140.74 | 7.63% | `US` | C Delay/follow-through |
| 137 | `emr-entry-pull-retest-03` | 354 | 22,326.84 | 1.782 | 4,640.83 | 5.82% | `US` | J Pullback resume |
| 138 | `emr-entry-delay-3barfastslowhist-rsi55` | 356 | 9,204.47 | 1.902 | 3,211.01 | 7.19% | `US` | C Delay/follow-through |
| 139 | `emr-entry-momo-adx-dmi-02` | 356 | 7,343.53 | 2.008 | 2,882.34 | 7.33% | `US` | H Extra momentum |
| 140 | `emr-entry-pull-retest-04` | 363 | 10,919.80 | 1.925 | 3,511.79 | 5.89% | `US` | J Pullback resume |
| 141 | `emr-entry-fake-wick-03` | 367 | 12,104.53 | 1.909 | 3,809.54 | 7.33% | `US` | I Fakeout guard |
| 142 | `emr-entry-delay-3barfastslowhist-rsi50` | 367 | 10,460.28 | 1.799 | 3,368.37 | 6.98% | `US` | C Delay/follow-through |
| 143 | `emr-entry-base-rsiema10` | 369 | 12,461.53 | 1.957 | 4,366.26 | 8.21% | `US` | A Baseline/sensitivity |
| 144 | `emr-entry-pull-fast-hold-02` | 371 | 1,507.47 | 1.823 | 1,671.25 | 9.59% | `US` | J Pullback resume |
| 145 | `emr-entry-base-rsi52` | 372 | 12,410.93 | 1.957 | 4,416.14 | 8.21% | `US` | A Baseline/sensitivity |
| 146 | `emr-entry-base-rsi55` | 372 | 12,410.93 | 1.957 | 4,416.14 | 8.21% | `US` | A Baseline/sensitivity |
| 147 | `emr-entry-base-rsi60` | 372 | 12,410.93 | 1.957 | 4,416.14 | 8.21% | `US` | A Baseline/sensitivity |
| 148 | `emr-entry-pull-slow-03` | 372 | 1,968.31 | 1.783 | 1,802.37 | 10.31% | `US` | J Pullback resume |
| 149 | `emr-entry-volq-bbwidth-02` | 376 | 11,283.46 | 2.068 | 4,775.28 | 8.70% | `US` | G Volatility quality |
| 150 | `emr-entry-delay-3barfastslowhist-rsi52` | 377 | 9,821.41 | 1.710 | 3,264.80 | 6.55% | `US` | C Delay/follow-through |
| 151 | `emr-entry-delay-1barhigh-rsi60` | 377 | 1,522.32 | 1.602 | 1,209.60 | 8.14% | `US` | C Delay/follow-through |
| 152 | `emr-entry-delay-1barhighfast-rsi60` | 377 | 1,522.32 | 1.602 | 1,209.60 | 8.14% | `US` | C Delay/follow-through |
| 153 | `emr-entry-base-macd8-21-5` | 382 | 14,516.81 | 1.817 | 5,301.04 | 8.25% | `US` | A Baseline/sensitivity |
| 154 | `emr-entry-vol-cmf-mfi-01` | 382 | 8,501.22 | 1.975 | 3,365.33 | 9.58% | `US` | F Volume |
| 155 | `emr-entry-pull-fast-hold-03` | 382 | 3,737.54 | 1.775 | 2,100.49 | 8.69% | `US` | J Pullback resume |
| 156 | `emr-entry-base-ema12-26` | 383 | 36,614.35 | 1.460 | 5,142.69 | 6.36% | `US` | A Baseline/sensitivity |
| 157 | `emr-entry-base-ema10-24` | 384 | 15,732.01 | 1.683 | 5,063.07 | 8.19% | `US` | A Baseline/sensitivity |
| 158 | `emr-entry-delay-2barhigh-rsi55` | 386 | 2,492.35 | 1.713 | 1,982.73 | 7.63% | `US` | C Delay/follow-through |
| 159 | `emr-entry-fake-gap-01` | 387 | 11,362.37 | 1.926 | 4,234.03 | 7.73% | `US` | I Fakeout guard |
| 160 | `emr-entry-fake-gap-02` | 390 | 11,303.19 | 1.921 | 4,216.82 | 7.50% | `US` | I Fakeout guard |
| 161 | `emr-entry-pull-fast-hold-04` | 390 | 4,115.51 | 1.803 | 2,364.08 | 8.11% | `US` | J Pullback resume |
| 162 | `emr-entry-volq-squeeze-05` | 390 | -78.39 | 0.658 | 475.04 | 9.17% | `US` | G Volatility quality |
| 163 | `emr-entry-volq-squeeze-03` | 393 | -81.10 | 0.636 | 477.26 | 8.33% | `US` | G Volatility quality |
| 164 | `emr-entry-volq-squeeze-04` | 393 | -81.10 | 0.636 | 477.26 | 8.33% | `US` | G Volatility quality |
| 165 | `emr-entry-delay-2barfasthist-rsi60` | 394 | 1,054.38 | 1.344 | 1,287.44 | 7.35% | `US` | C Delay/follow-through |
| 166 | `emr-entry-pull-fast-hold-01` | 394 | 673.69 | 1.482 | 1,468.76 | 9.43% | `US` | J Pullback resume |
| 167 | `emr-entry-volq-squeeze-02` | 397 | -83.47 | 0.636 | 479.62 | 8.33% | `US` | G Volatility quality |
| 168 | `emr-entry-volq-squeeze-01` | 399 | -88.26 | 0.636 | 485.01 | 8.33% | `US` | G Volatility quality |
| 169 | `emr-entry-trend-ema50over200-mid` | 400 | 7,837.81 | 2.024 | 3,548.41 | 7.59% | `US` | E Trend/regime |
| 170 | `emr-entry-trend-ema50over200-score4` | 402 | 7,542.58 | 2.006 | 3,494.52 | 7.43% | `US` | E Trend/regime |
| 171 | `emr-entry-trend-ema50over200-score5` | 402 | 7,542.58 | 2.006 | 3,494.52 | 7.43% | `US` | E Trend/regime |
| 172 | `emr-entry-trend-ema50over200-soft` | 402 | 7,542.58 | 2.006 | 3,494.52 | 7.43% | `US` | E Trend/regime |
| 173 | `emr-entry-delay-2barhigh-rsi58` | 402 | 1,580.27 | 1.369 | 1,755.45 | 7.70% | `US` | C Delay/follow-through |
| 174 | `emr-entry-fake-wick-05` | 403 | 5,563.04 | 1.725 | 2,864.62 | 7.36% | `US` | I Fakeout guard |
| 175 | `emr-entry-volq-bbwidth-01` | 404 | 11,079.99 | 1.978 | 4,848.97 | 8.67% | `US` | G Volatility quality |
| 176 | `emr-entry-pull-retest-02` | 407 | 6,044.04 | 1.556 | 2,682.11 | 5.83% | `US` | J Pullback resume |
| 177 | `emr-entry-pull-fast-03` | 409 | 5,418.85 | 1.787 | 2,995.95 | 8.23% | `US` | J Pullback resume |
| 178 | `emr-entry-pull-slow-04` | 409 | 2,054.92 | 1.450 | 2,032.78 | 10.08% | `US` | J Pullback resume |
| 179 | `emr-entry-delay-2barhigh-rsi60` | 411 | -215.22 | 0.927 | 1,351.40 | 8.11% | `US` | C Delay/follow-through |
| 180 | `emr-entry-pull-slow-01` | 413 | -805.17 | 0.188 | 1,028.41 | 4.74% | `US` | J Pullback resume |
| 181 | `emr-entry-pull-slow-02` | 415 | 672.74 | 0.905 | 1,737.31 | 7.83% | `US` | J Pullback resume |
| 182 | `emr-entry-pull-fast-01` | 415 | 414.81 | 1.186 | 1,778.62 | 7.54% | `US` | J Pullback resume |
| 183 | `emr-entry-fake-clv-02` | 427 | 8,356.47 | 1.722 | 3,533.58 | 7.59% | `US` | I Fakeout guard |
| 184 | `emr-entry-fake-clv-05` | 430 | 7,831.40 | 1.632 | 3,483.34 | 6.96% | `US` | I Fakeout guard |
| 185 | `emr-entry-volq-atrband-05` | 430 | 3,382.99 | 1.042 | 2,392.45 | 4.48% | `US` | G Volatility quality |
| 186 | `emr-entry-fake-gap-03` | 440 | 9,312.06 | 1.707 | 4,216.82 | 7.30% | `US` | I Fakeout guard |
| 187 | `emr-entry-fake-clv-04` | 442 | 7,776.23 | 1.715 | 3,566.33 | 7.36% | `US` | I Fakeout guard |
| 188 | `emr-entry-pull-fast-02` | 443 | 2,731.10 | 1.534 | 2,904.68 | 8.29% | `US` | J Pullback resume |
| 189 | `emr-entry-fake-gap-05` | 449 | 8,799.80 | 1.550 | 3,956.45 | 7.30% | `US` | I Fakeout guard |
| 190 | `emr-entry-pull-fast-04` | 449 | 5,406.86 | 1.517 | 3,240.79 | 8.26% | `US` | J Pullback resume |
| 191 | `emr-entry-fake-wick-01` | 462 | 7,901.94 | 1.759 | 4,289.68 | 6.89% | `US` | I Fakeout guard |
| 192 | `emr-entry-fake-clv-03` | 463 | 7,523.58 | 1.690 | 3,733.88 | 7.59% | `US` | I Fakeout guard |
| 193 | `emr-entry-fake-gap-04` | 465 | 8,336.33 | 1.552 | 4,130.90 | 7.12% | `US` | I Fakeout guard |
| 194 | `emr-entry-fake-runup-03` | 467 | 6,505.14 | 1.696 | 3,654.85 | 7.79% | `US` | I Fakeout guard |
| 195 | `emr-entry-fake-failedbreak-03` | 467 | 5,518.32 | 1.483 | 3,453.88 | 7.44% | `US` | I Fakeout guard |
| 196 | `emr-entry-fake-wick-02` | 474 | 7,362.99 | 1.666 | 4,093.59 | 6.90% | `US` | I Fakeout guard |
| 197 | `emr-entry-momo-stoch-cci-roc-02` | 476 | 4,335.47 | 1.297 | 3,339.94 | 6.76% | `US` | H Extra momentum |
| 198 | `emr-entry-vol-cmf-mfi-02` | 483 | 4,986.33 | 1.607 | 3,568.43 | 7.96% | `US` | F Volume |
| 199 | `emr-entry-pull-slow-05` | 488 | 206.95 | 1.007 | 3,172.71 | 7.53% | `US` | J Pullback resume |
| 200 | `emr-entry-pull-fast-05` | 535 | 6,095.86 | 1.214 | 5,728.22 | 7.37% | `US` | J Pullback resume |

**PF ランキング（artifact の公式順序）**

| artifact rank | presetId | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | success / runs | family |
|---:|---|---:|---:|---:|---:|---:|---|
| 1 | `emr-entry-volq-atrband-04` | 10,540.38 | 13.859 | 4,111.67 | 11.82% | 8 / 8 | G Volatility quality |
| 2 | `emr-entry-vol-rel-05` | 6,042.91 | 10.401 | 838.81 | 19.52% | 8 / 8 | F Volume |
| 3 | `emr-entry-trend-adxtrend-score5` | 8,513.20 | 8.841 | 1,126.60 | 13.41% | 8 / 8 | E Trend/regime |
| 4 | `emr-entry-momo-adx-dmi-05` | 8,513.20 | 8.841 | 1,126.60 | 13.41% | 8 / 8 | H Extra momentum |
| 5 | `emr-entry-volq-bbwidth-05` | 6,823.73 | 6.756 | 3,364.03 | 9.25% | 8 / 8 | G Volatility quality |
| 6 | `emr-entry-vol-rel-03` | 24,198.16 | 6.507 | 2,457.22 | 13.99% | 8 / 8 | F Volume |
| 7 | `emr-entry-volq-range-05` | 22,389.15 | 6.489 | 1,876.65 | 13.58% | 8 / 8 | G Volatility quality |
| 8 | `emr-entry-vol-spike-obv-05` | 16,420.31 | 5.835 | 2,395.36 | 12.30% | 8 / 8 | F Volume |
| 9 | `emr-entry-momo-stoch-cci-roc-05` | 8,530.60 | 5.590 | 1,770.09 | 11.60% | 8 / 8 | H Extra momentum |
| 10 | `emr-entry-vol-sma-05` | 11,735.97 | 5.574 | 1,667.31 | 14.66% | 8 / 8 | F Volume |
| 11 | `emr-entry-vol-rel-04` | 11,735.97 | 5.574 | 1,667.31 | 14.66% | 8 / 8 | F Volume |
| 12 | `emr-entry-volq-atrband-03` | 10,409.09 | 5.099 | 4,451.10 | 9.40% | 8 / 8 | G Volatility quality |
| 13 | `emr-entry-vol-sma-03` | 21,989.89 | 4.957 | 2,950.61 | 11.98% | 8 / 8 | F Volume |
| 14 | `emr-entry-vol-rel-02` | 21,989.89 | 4.957 | 2,950.61 | 11.98% | 8 / 8 | F Volume |
| 15 | `emr-entry-vol-sma-04` | 15,021.54 | 4.915 | 2,215.02 | 13.13% | 8 / 8 | F Volume |
| 16 | `emr-entry-volq-range-04` | 22,081.67 | 4.587 | 2,350.02 | 11.56% | 8 / 8 | G Volatility quality |
| 17 | `emr-entry-struct-swing20-rsi60` | 8,680.32 | 4.406 | 2,046.02 | 13.67% | 8 / 8 | D Breakout structure |
| 18 | `emr-entry-vol-spike-obv-04` | 15,311.45 | 4.232 | 2,267.81 | 9.34% | 8 / 8 | F Volume |
| 19 | `emr-entry-struct-swing20-rsi58` | 8,875.88 | 4.167 | 2,054.96 | 12.75% | 8 / 8 | D Breakout structure |
| 20 | `emr-entry-struct-close10-rsi60` | 8,744.97 | 4.127 | 2,003.80 | 13.29% | 8 / 8 | D Breakout structure |

---

## Top 1 戦略

### 1位: `emr-entry-volq-range-05`

- composite_score: `49` / markets: `US` / family: `G Volatility quality`
- avg_net_profit: `22,389.15` / avg_profit_factor: `6.489` / avg_max_drawdown: `1,876.65`
- rank内訳: net_profit `4` / PF `7` / DD `38`

**全銘柄の成績**

| 銘柄 | net_profit | profit_factor | max_drawdown | win_rate | trades |
|---|---:|---:|---:|---:|---:|
| NVDA | 131,366.51 | 22.010 | 4,924.86 | 28.57% | 21 |
| BTCUSD | 29,794.65 | 9.062 | 1,845.77 | 14.81% | 27 |
| AAPL | 8,973.02 | 13.667 | 354.87 | 29.41% | 17 |
| TSLA | 7,147.81 | 4.222 | 1,571.78 | 5.88% | 17 |
| MSTR | 3,349.20 | 2.086 | 3,255.04 | 10.53% | 19 |
| PLTR | -289.22 | 0.352 | 1,509.94 | 11.11% | 9 |
| SPY | -392.63 | 0.510 | 708.23 | 8.33% | 12 |
| QQQ | -836.10 | 0.000 | 842.69 | 0.00% | 14 |

**他と比べて強かった点（US平均との差）**

- avg_net_profit が US平均(11,984.77)より +10,404.38 (+86.8%) 高い。
- avg_profit_factor が US平均(2.646)より +3.842 (+145.2%) 高く、判断基準「優秀」。
- avg_max_drawdown が US平均(3,816.14)より -1,939.49 (-50.8%) 小さい。判断基準は「優秀」。
- 銘柄集中度は NVDA が全利益の 73.3% を占め、判断基準「即除外（>=70%）」。

---

## Top 2 戦略

### 2位: `emr-entry-vol-rel-03`

- composite_score: `80` / markets: `US` / family: `F Volume`
- avg_net_profit: `24,198.16` / avg_profit_factor: `6.507` / avg_max_drawdown: `2,457.22`
- rank内訳: net_profit `3` / PF `6` / DD `71`

**他と比べて強かった点（US平均との差）**

- avg_net_profit が US平均(11,984.77)より +12,213.39 (+101.9%) 高い。
- avg_profit_factor が US平均(2.646)より +3.860 (+145.9%) 高く、判断基準「優秀」。
- avg_max_drawdown が US平均(3,816.14)より -1,358.92 (-35.6%) 小さい。判断基準は「優秀」。
- 銘柄集中度は NVDA が全利益の 52.4% を占め、判断基準「要注意（50〜70%）」。

---

## Top 3 戦略

### 3位: `emr-entry-volq-range-04`

- composite_score: `86` / markets: `US` / family: `G Volatility quality`
- avg_net_profit: `22,081.67` / avg_profit_factor: `4.587` / avg_max_drawdown: `2,350.02`
- rank内訳: net_profit `6` / PF `16` / DD `64`

**他と比べて強かった点（US平均との差）**

- avg_net_profit が US平均(11,984.77)より +10,096.90 (+84.2%) 高い。
- avg_profit_factor が US平均(2.646)より +1.940 (+73.3%) 高く、判断基準「優秀」。
- avg_max_drawdown が US平均(3,816.14)より -1,466.12 (-38.4%) 小さい。判断基準は「優秀」。
- 銘柄集中度は NVDA が全利益の 69.3% を占め、判断基準「要注意（50〜70%）」。

---

## 除外候補

| presetId | 分類 | 弱かった指標（平均との差） | 判断 |
|---|---|---|---|
| `ema-macd-rsi-sl-baseline` | A Baseline/control | avg_max_drawdown 184,211.31 は US平均より +180,395.17 (+4,727.2%) 大きく「即除外」 | 継続観察。entry-quality 200-pack は低勝率構造のため win_rate 単独では除外しない |
| `emr-entry-pull-fast-05` | J Pullback resume | avg_profit_factor 1.214 は US平均より -1.432 (-54.1%) 低く「即除外」 / avg_win_rate 7.37% は固定基準では「即除外」 | 継続観察。entry-quality 200-pack は低勝率構造のため win_rate 単独では除外しない |
| `emr-entry-base-ema12-26` | A Baseline/sensitivity | avg_profit_factor 1.460 は US平均より -1.186 (-44.8%) 低く「即除外」。avg_max_drawdown 5,142.69 も US平均より +1,326.55 (+34.8%) 大きい | net_profit は高いが効率とDDが弱く、採用候補からは外す |
| `emr-entry-fake-failedbreak-03` | I Fakeout guard | avg_profit_factor 1.483 は US平均より -1.163 (-43.9%) 低く「即除外」。avg_net_profit 5,518.32 は US平均より -6,466.45 (-54.0%) 低い | 除外候補 |
| `emr-entry-momo-stoch-cci-roc-02` | H Extra momentum | avg_profit_factor 1.297 は US平均より -1.349 (-51.0%) 低く「即除外」。avg_net_profit 4,335.47 は US平均より -7,649.30 (-63.8%) 低い | 除外候補 |
| `emr-entry-volq-atrband-05` | G Volatility quality | avg_profit_factor 1.042 は US平均より -1.604 (-60.6%) 低く「即除外」。avg_net_profit 3,382.99 は US平均より -8,601.78 (-71.8%) 低い | 同じ G family でも range 系と差が大きく、atrband-05 は除外候補 |
| `emr-entry-pull-slow-01` | J Pullback resume | avg_profit_factor 0.188 は US平均より -2.458 (-92.9%) 低く「即除外」。avg_net_profit -805.17 は US平均より -12,789.94 (-106.7%) 低い | 除外候補 |

**注意**: 今回の family 比較では win_rate が全体的に低く、固定基準では大半が即除外になる。スキルの注意どおり、win_rate 単独では除外根拠にしていない。

---

## 銘柄集中チェック

| presetId | 最大利益銘柄 | 集中度(%) | top3 集中度(%) | 判断基準分類 |
|---|---|---:|---:|---|
| `emr-entry-volq-range-05` | NVDA (131,366.51) | 73.3% | 95.0% | 即除外（>=70%） |
| `emr-entry-vol-rel-03` | NVDA (101,415.15) | 52.4% | 93.3% | 要注意（50〜70%） |
| `emr-entry-volq-range-04` | NVDA (122,405.57) | 69.3% | 95.7% | 要注意（50〜70%） |
| `emr-entry-vol-spike-obv-05` | NVDA (113,736.11) | 86.6% | 98.3% | 即除外（>=70%） |

**観察**: 上位4戦略はいずれも NVDA 依存が強い。特に `emr-entry-vol-spike-obv-05` は NVDA 単独で 86.6% を占める。総合評価では F/G が有望だが、次回は NVDA 除外または銘柄別採用の検証が必要。

---

## 今回の主要発見

1. **目的の検証は達成**
   run 93 では派生199戦略の metrics が欠損していたが、run 94 では 1600 / 1600 で metrics が読めた。entry 条件・entry 前フィルタ別の収益性比較は可能になった。

2. **Volume 系が family として最も安定**
   F Volume は top10 に 8本入り、family 平均 avg_net_profit 13,364.45 / PF 4.084。単発首位ではないが、候補群としての厚みが最もある。

3. **Volatility quality は首位を出したが集中リスクが大きい**
   G Volatility quality の `emr-entry-volq-range-05` が composite 1位。ただし NVDA 集中度 73.3% で、銘柄依存の検証なしに採用判断はできない。

4. **baseline control は比較対象として特殊**
   `ema-macd-rsi-sl-baseline` は avg_net_profit が大きい一方、avg_max_drawdown 184,211.31 と BTCUSD 依存の影響が強い。entry family の優劣判断では control として扱い、採用候補からは分ける。

---

## 改善点と次回バックテスト確認事項

1. **Volume 系の代表候補を絞る**
   `emr-entry-vol-rel-03` / `emr-entry-vol-spike-obv-05` / `emr-entry-vol-sma-05` を対象に、同じ focus-8 で再実行する。完了条件は top10 常連の Volume 系が再度 avg_profit_factor 4.0 以上、avg_max_drawdown 3,000 未満を維持すること。

2. **Volatility quality の NVDA 依存を分離する**
   `emr-entry-volq-range-05` は composite 1位だが NVDA 集中度 73.3%。次回は NVDA 除外7銘柄と NVDA 単独の2系統で集計し、NVDA なしでも avg_net_profit が US平均を上回るか確認する。

3. **銘柄別採用の可能性を検証する**
   上位戦略は NVDA / BTCUSD / MSTR で利益が偏る。戦略一括採用ではなく、Volume/G Volatility を NVDA・BTCUSD 向けに限定したときの PF と DD を比較する。

4. **PFランキングだけで選ばない**
   artifact PF 1位の `emr-entry-volq-atrband-04` は PF 13.859 だが composite では上位外。次回も net_profit / PF / DD の composite と concentration を主指標にし、PF単独の過大評価を避ける。

5. **run 93 からの修正効果を固定確認にする**
   metrics 読み取り成功率 100% は今回の重要な改善点。次回 night batch でも `metrics_unreadable = 0` を最低条件にし、欠損が出た場合は戦略評価より先に読み取り側を修正する。

---

## avg_net_profit 18,000 超フィルタ後ランキング

ユーザー判断基準として、`avg_net_profit <= 18,000` の戦略は baseline の利益水準に追随できていないため除外する。残った 12 戦略だけで、同じ composite score（net_profit 降順 + PF 降順 + DD 昇順）を再計算した。

| filtered rank | raw profit rank | original rank | presetId | filtered composite | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | net rank | PF rank | DD rank | 判断 |
|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 1 | 3 | 2 | `emr-entry-vol-rel-03` | 7 | 24,198.16 | 6.507 | 2,457.22 | 13.99% | 3 | 1 | 3 | 利益・PF・DDのバランスが最良 |
| 2 | 4 | 1 | `emr-entry-volq-range-05` | 7 | 22,389.15 | 6.489 | 1,876.65 | 13.58% | 4 | 2 | 1 | DD最小。ただしNVDA集中が強い |
| 3 | 6 | 3 | `emr-entry-volq-range-04` | 13 | 22,081.67 | 4.587 | 2,350.02 | 11.56% | 6 | 5 | 2 | range系の中では次点 |
| 4 | 7 | 10 | `emr-entry-vol-sma-03` | 16 | 21,989.89 | 4.957 | 2,950.61 | 11.98% | 7 | 3 | 6 | Volume系。PF良好 |
| 5 | 7 | 9 | `emr-entry-vol-rel-02` | 16 | 21,989.89 | 4.957 | 2,950.61 | 11.98% | 7 | 3 | 6 | Volume系。vol-sma-03と同値 |
| 6 | 9 | 11 | `emr-entry-volq-range-03` | 20 | 19,714.27 | 3.727 | 2,756.88 | 11.40% | 9 | 6 | 5 | 利益は残るが上位rangeより弱い |
| 7 | 11 | 12 | `emr-entry-volq-range-02` | 22 | 18,589.07 | 3.725 | 2,693.88 | 10.86% | 11 | 7 | 4 | 18,000超の下限寄り |
| 8 | 1 | 134 | `ema-macd-rsi-sl-baseline` | 23 | 534,109.93 | 1.905 | 184,211.31 | 36.99% | 1 | 10 | 12 | raw profit最強。ただしDDと集中が極端 |
| 9 | 2 | 156 | `emr-entry-base-ema12-26` | 25 | 36,614.35 | 1.460 | 5,142.69 | 6.36% | 2 | 12 | 11 | 利益は高いがPFが即除外水準 |
| 10 | 5 | 137 | `emr-entry-pull-retest-03` | 26 | 22,326.84 | 1.782 | 4,640.83 | 5.82% | 5 | 11 | 10 | 利益はあるがPF/DDが弱い |
| 11 | 10 | 25 | `emr-entry-volq-range-01` | 26 | 19,003.25 | 3.348 | 3,357.05 | 9.85% | 10 | 8 | 8 | range系の弱め設定 |
| 12 | 12 | 44 | `emr-entry-fake-failedbreak-02` | 30 | 18,188.39 | 3.006 | 3,542.13 | 9.98% | 12 | 9 | 9 | 18,000超だが下限ギリギリ |

**raw profit 優先で見る場合**: baseline は明確に1位。`avg_net_profit 534,109.93` は2位の `emr-entry-base-ema12-26`（36,614.35）の約14.6倍で、派生戦略とは桁が違う。

**composite で baseline が落ちる理由**: baseline は `avg_max_drawdown 184,211.31` がフィルタ後12本の中で最大。フィルタ後1位 `emr-entry-vol-rel-03` の DD `2,457.22` と比べて約75.0倍大きい。また利益の `84.7%` が BTCUSD 由来で、top3 銘柄集中度も `95.5%`。つまり「最も稼いだ」のは事実だが、「低DDで広く再現した」とは言いにくい。

**現時点の判断**: 目的を「とにかく raw profit 最大」に置くなら baseline が最有力。目的を「entry を絞って低DD・高PFの候補を探す」に置くなら、`emr-entry-vol-rel-03` と `emr-entry-volq-range-05` が上位候補。ただしこの2本も NVDA 集中があるため、baseline と同じく銘柄依存の分離が必要。

### フィルタ通過戦略の内容と言語化

| presetId | 何を試した戦略か | baseline との差分 | 読み方 |
|---|---|---|---|
| `ema-macd-rsi-sl-baseline` | 元の EMA + MACD + RSI + 8% SL | 追加フィルタなし。EMA 9/20、MACD 12/26/9、RSI 50、stop 8% の基準戦略 | 強い銘柄を長く取りに行くため利益は最大。ただしBTCUSDと大きなDDに依存 |
| `emr-entry-base-ema12-26` | EMA ペアだけを遅くする感度テスト | EMA 9/20 を EMA 12/26 に変更し、より大きな転換だけで入る | raw profitは高いがPF 1.460で効率が悪い |
| `emr-entry-vol-rel-03` | 相対出来高フィルタ | baseline条件に「出来高が20本平均の1.30倍以上」を追加。MACDヒストグラム陽性も要求 | 出来高を伴う上昇だけに絞る。利益・PF・DDのバランスが最良 |
| `emr-entry-volq-range-05` | 値幅拡大フィルタ | baseline条件に「当日レンジが15本平均の1.50倍以上」を追加 | 強いブレイク日だけに絞る。DDは小さいがNVDA集中が強い |
| `emr-entry-pull-retest-03` | ブレイク後の押し目復帰待ち | buy signal 後、7本以内の breakout retest と recovery close を待つ | 利益は残るがPFが低く、絞り方が効率改善につながっていない |
| `emr-entry-volq-range-04` | 値幅拡大フィルタ | baseline条件に「当日レンジが10本平均の1.35倍以上」を追加 | range-05より少し緩い。利益は高いが集中リスクあり |
| `emr-entry-vol-sma-03` | 出来高倍率フィルタ | baseline条件に「出来高が20本平均の1.20倍以上」を追加 | 出来高増加だけを見るシンプルな絞り込み。PFは良好 |
| `emr-entry-vol-rel-02` | 相対出来高フィルタ | baseline条件に「出来高が20本平均の1.20倍以上」を追加。MACDヒストグラム陽性も要求 | `vol-sma-03` と同値。出来高条件の実装差はあるが今回結果は同じ |
| `emr-entry-volq-range-03` | 値幅拡大フィルタ | baseline条件に「当日レンジが10本平均の1.20倍以上」を追加 | range系の中では中間設定。利益は19,000台まで低下 |
| `emr-entry-volq-range-01` | 値幅拡大フィルタ | baseline条件に「当日レンジが5本平均の1.10倍以上」を追加 | 条件が緩く、range上位よりPF・利益が落ちる |
| `emr-entry-volq-range-02` | 値幅拡大フィルタ | baseline条件に「当日レンジが5本平均の1.20倍以上」を追加 | 18,000超には残るが、上位range系には届かない |
| `emr-entry-fake-failedbreak-02` | フェイクアウト回避 | baseline条件に「直近10本で failed breakout があれば入らない」を追加 | ダマシ回避狙い。18,000超には残るが下限ギリギリ |

### baseline をどう扱うべきか

baseline を「弱い」と見る必要はない。むしろ raw profit と win_rate だけなら、この run では baseline が一番強い。前段の composite は、baseline を落とすための指標ではなく、`利益 / PF / DD` を同時に見たときに「巨大な利益と巨大なDDをどう扱うか」を機械的に反映している。

したがって次の比較は、baseline を除外するのではなく、以下の2軸で分けるのが妥当。

1. **raw profit 代表**: `ema-macd-rsi-sl-baseline`
   - 目的: 利益最大化候補として保持。
   - 確認: BTCUSD除外、NVDA除外、BTCUSD単独で再集計し、利益の源泉を分解する。

2. **entry quality 代表**: `emr-entry-vol-rel-03` / `emr-entry-volq-range-05`
   - 目的: 低DD・高PFの絞り込み候補として保持。
   - 確認: 18,000超フィルタ後でも baseline との差が大きいため、銘柄別採用か、baselineに出来高・値幅フィルタを部分導入したA/Bテストを行う。
