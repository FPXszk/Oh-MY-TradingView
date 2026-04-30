---

## ヘッダー

- run_id: `20260430_120759`
- status: `SUCCESS`
- 対象市場: `US`
- 目的: `Night Batch Self Hosted #77 で EMA + MACD + RSI Breakout US40 50-Pack を smoke/full で完走させ、baseline と 49 variants の優劣を確定する`

---

## 結論

- **総合首位**: `emr-breakout-trend-price-above-ema200` / composite_score `n/a` / avg_net_profit `4,832.44` / avg_profit_factor `1.9422`
- **US 本命**: `emr-breakout-trend-price-above-ema200` / avg_net_profit `4,832.44` / avg_profit_factor `1.9422`
- **JP 本命**: `対象なし` / avg_net_profit `対象なし` / avg_profit_factor `対象なし`
- **ざっくり判断**: run77 は `ema-macd-rsi-breakout-us40-50pack` を `2000 / 2000 success` で完走した。上位は `EMA200 trend filter` と `10日高値 confirm` が独占し、avg_profit_factor `1.8672〜1.9422`、avg_max_drawdown `2,947.96〜4,252.70` で DD は判断基準「優秀」を満たした。一方で全戦略平均の avg_profit_factor は `1.2922`、avg_win_rate は `13.29%` に留まり、首位でも PF は「許容」止まりで win rate は固定基準上かなり弱い。`tp8/tp10/tp12 full exit` は平均損益が `-983.49` まで沈み、探索候補から外してよい。

---

## 判断基準（固定値 — AIは変更しないこと）

| 指標 | 優秀 | 許容 | 要注意 | 即除外 |
|---|---|---|---|---|
| avg_profit_factor | ≥ 2.0 | 1.7〜2.0 | 1.5〜1.7 | < 1.5 |
| avg_max_drawdown | < 5,000 | 5,000〜6,200 | 6,200〜7,000 | > 7,000 |
| avg_win_rate | ≥ 45% | 40〜45% | 35〜40% | < 35% |
| 銘柄集中度 | 最大1銘柄 < 30% | 30〜50% | 50〜70% | ≥ 70% |

**市場別 平均値（比較の基準として使う）**

| 市場 | 戦略数 | avg_net_profit 平均 | avg_profit_factor 平均 | avg_max_drawdown 平均 |
|---|---|---|---|---|
| US 専用 | 50 | 4,954.74 | 1.2922 | 4,938.28 |
| JP 専用 | 0 | 対象なし | 対象なし | 対象なし |
| US+JP 両対応 | 0 | 対象なし | 対象なし | 対象なし |

---

## 全戦略スコア一覧

注記: artifact の `strategy-ranking.json` に `composite_score` 列が含まれていなかったため、本表では `n/a` とした。

| rank | presetId | composite_score | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | markets |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `emr-breakout-trend-price-above-ema200` | n/a | 4,832.44 | 1.9422 | 4,252.70 | 7.90% | `US` |
| 2 | `emr-breakout-confirm-close-above-10d-high` | n/a | 4,989.15 | 1.8855 | 2,947.96 | 7.89% | `US` |
| 3 | `emr-breakout-trend-ema50-above-ema200` | n/a | 3,879.18 | 1.8672 | 3,790.70 | 7.49% | `US` |
| 4 | `emr-breakout-trend-ema50-200-and-macd-positive` | n/a | 3,879.18 | 1.8672 | 3,790.70 | 7.49% | `US` |
| 5 | `emr-breakout-trend-price-above-ema200-rsi55` | n/a | 4,636.39 | 1.8357 | 3,830.40 | 7.90% | `US` |
| 6 | `emr-breakout-confirm-close-above-5d-high` | n/a | 4,773.80 | 1.7464 | 3,299.32 | 7.57% | `US` |
| 7 | `emr-breakout-confirm-breakout-and-macd-positive` | n/a | 4,773.80 | 1.7464 | 3,299.32 | 7.57% | `US` |
| 8 | `emr-breakout-strength-all-align-and-breakout-5d-high` | n/a | 4,773.80 | 1.7464 | 3,299.32 | 7.57% | `US` |
| 9 | `emr-breakout-trend-ema200-rising-20bars` | n/a | 4,616.93 | 1.6686 | 3,809.80 | 7.50% | `US` |
| 10 | `emr-breakout-strength-rsi60-and-rsi-over-rsiema` | n/a | 3,925.87 | 1.6118 | 2,987.13 | 8.22% | `US` |
| 11 | `emr-breakout-confirm-intraday-above-20d-high` | n/a | 3,347.88 | 1.5652 | 2,716.29 | 8.44% | `US` |
| 12 | `emr-breakout-confirm-breakout-and-rsi55` | n/a | 4,676.12 | 1.5473 | 3,188.16 | 7.41% | `US` |
| 13 | `emr-breakout-strength-rsi55-and-rsi-over-rsiema` | n/a | 6,061.67 | 1.4101 | 4,489.60 | 7.61% | `US` |
| 14 | `emr-breakout-base-ema12-26-macd12-26-9-rsi52-stop8` | n/a | 4,434.39 | 1.3690 | 5,183.12 | 6.64% | `US` |
| 15 | `emr-breakout-baseline-ema9-20-macd12-26-9-rsi50-stop8` | n/a | 25,417.55 | 1.3495 | 15,479.70 | 33.50% | `US` |
| 16 | `emr-breakout-stop8-signal-low-buffer` | n/a | 21,424.86 | 1.3286 | 10,551.74 | 18.93% | `US` |
| 17 | `emr-breakout-strength-macd-hist-rising-3bars` | n/a | 4,188.61 | 1.2890 | 4,035.68 | 7.45% | `US` |
| 18 | `emr-breakout-base-ema10-24-macd12-26-9-rsi50-stop8` | n/a | 3,862.17 | 1.2622 | 5,120.50 | 7.22% | `US` |
| 19 | `emr-breakout-base-ema8-21-macd12-26-9-rsi50-stop8` | n/a | 9,568.17 | 1.2579 | 6,366.45 | 7.54% | `US` |
| 20 | `emr-breakout-strength-all-align-and-close-above-fast-ema` | n/a | 6,913.76 | 1.2417 | 5,684.40 | 7.28% | `US` |
| 21 | `emr-breakout-stop6-base-exit` | n/a | 6,857.37 | 1.2354 | 5,755.57 | 7.25% | `US` |
| 22 | `emr-breakout-stop7-base-exit` | n/a | 6,857.37 | 1.2354 | 5,755.57 | 7.25% | `US` |
| 23 | `emr-breakout-stop9-base-exit` | n/a | 6,857.37 | 1.2354 | 5,755.57 | 7.25% | `US` |
| 24 | `emr-breakout-stop10-base-exit` | n/a | 6,857.37 | 1.2354 | 5,755.57 | 7.25% | `US` |
| 25 | `emr-breakout-breakeven-at-plus4` | n/a | 6,857.37 | 1.2354 | 5,755.57 | 7.25% | `US` |
| 26 | `emr-breakout-breakeven-at-plus6` | n/a | 6,857.37 | 1.2354 | 5,755.57 | 7.25% | `US` |
| 27 | `emr-breakout-breakeven-at-plus8` | n/a | 6,857.37 | 1.2354 | 5,755.57 | 7.25% | `US` |
| 28 | `emr-breakout-breakeven-plus1-after-plus6` | n/a | 6,857.37 | 1.2354 | 5,755.57 | 7.25% | `US` |
| 29 | `emr-breakout-breakeven-plus2-after-plus8` | n/a | 6,857.37 | 1.2354 | 5,755.57 | 7.25% | `US` |
| 30 | `emr-breakout-base-ema9-20-macd8-21-5-rsi50-stop8` | n/a | 8,523.83 | 1.2026 | 6,255.39 | 7.37% | `US` |
| 31 | `emr-breakout-profit-protect-rsi-loss-55-after-plus8` | n/a | 6,012.83 | 1.1625 | 5,457.08 | 10.01% | `US` |
| 32 | `emr-breakout-profit-protect-close-below-ema20` | n/a | 5,660.70 | 1.1486 | 5,439.81 | 10.72% | `US` |
| 33 | `emr-breakout-profit-protect-close-below-ema15` | n/a | 4,964.53 | 1.1194 | 5,046.57 | 12.64% | `US` |
| 34 | `emr-breakout-trail-atr14x3` | n/a | 4,634.67 | 1.1153 | 5,258.15 | 11.17% | `US` |
| 35 | `emr-breakout-profit-protect-macd-bear-after-plus6` | n/a | 4,943.08 | 1.0993 | 5,164.39 | 10.49% | `US` |
| 36 | `emr-breakout-profit-protect-close-below-ema10` | n/a | 2,639.82 | 1.0757 | 4,855.23 | 13.90% | `US` |
| 37 | `emr-breakout-tp10-half-then-trail-ema20` | n/a | 1,243.40 | 1.0711 | 3,893.28 | 29.43% | `US` |
| 38 | `emr-breakout-delay-2bar-close-above-ema-fast` | n/a | 2,805.89 | 1.0685 | 5,401.74 | 7.06% | `US` |
| 39 | `emr-breakout-tp8-half-then-trail-ema20` | n/a | 1,189.84 | 1.0649 | 3,884.17 | 29.89% | `US` |
| 40 | `emr-breakout-delay-3bar-macd-hist-rising` | n/a | 2,945.66 | 1.0641 | 5,059.52 | 6.93% | `US` |
| 41 | `emr-breakout-delay-1bar-close-above-signal-high` | n/a | 1,244.09 | 1.0609 | 3,112.26 | 6.97% | `US` |
| 42 | `emr-breakout-trail-atr14x25` | n/a | 2,705.56 | 1.0514 | 4,747.21 | 12.62% | `US` |
| 43 | `emr-breakout-delay-2bar-close-above-signal-high` | n/a | 1,625.71 | 1.0083 | 3,776.12 | 6.41% | `US` |
| 44 | `emr-breakout-trail-atr14x2` | n/a | 1,049.42 | 0.9998 | 4,469.79 | 15.08% | `US` |
| 45 | `emr-breakout-delay-3bar-close-above-signal-high` | n/a | 1,349.68 | 0.9890 | 3,809.82 | 6.21% | `US` |
| 46 | `emr-breakout-trail-chandelier-22x3` | n/a | 278.35 | 0.9456 | 4,262.94 | 32.19% | `US` |
| 47 | `emr-breakout-trail-chandelier-22x25` | n/a | 178.52 | 0.9380 | 3,995.68 | 33.40% | `US` |
| 48 | `emr-breakout-tp8-full-exit` | n/a | -983.49 | 0.9221 | 4,367.23 | 49.23% | `US` |
| 49 | `emr-breakout-tp10-full-exit` | n/a | -983.49 | 0.9221 | 4,367.23 | 49.23% | `US` |
| 50 | `emr-breakout-tp12-full-exit` | n/a | -983.49 | 0.9221 | 4,367.23 | 49.23% | `US` |

---

## Top 3 戦略

### 1位: `emr-breakout-trend-price-above-ema200`

- composite_score: `n/a` / markets: `US`
- avg_net_profit: `4,832.44` / avg_profit_factor: `1.9422` / avg_max_drawdown: `4,252.70`

**全銘柄の成績**

| 銘柄 | net_profit | profit_factor | max_drawdown | win_rate | trades |
|---|---:|---:|---:|---:|---:|
| `NVDA` | 51,792.79 | 2.783 | 11,923.43 | 7.48% | 107 |
| `MSTR` | 50,299.76 | 3.906 | 6,302.54 | 7.79% | 77 |
| `AAPL` | 28,906.34 | 4.591 | 3,718.70 | 13.48% | 89 |
| `TSLA` | 27,623.37 | 1.853 | 18,550.93 | 10.26% | 78 |
| `NFLX` | 16,587.07 | 1.902 | 10,662.84 | 9.62% | 104 |
| `LLY` | 12,663.81 | 2.051 | 5,203.89 | 15.31% | 98 |
| `COIN` | 10,763.36 | 4.333 | 1,571.92 | 15.79% | 19 |
| `CRM` | 8,951.13 | 2.068 | 2,559.72 | 12.35% | 81 |
| `JPM` | 7,737.52 | 2.344 | 2,295.74 | 11.11% | 90 |
| `QCOM` | 7,187.93 | 2.079 | 3,073.25 | 9.52% | 63 |
| `GOOGL` | 6,294.39 | 1.949 | 2,221.85 | 9.09% | 121 |
| `IBIT` | 5,888.96 | 26.765 | 323.73 | 28.57% | 7 |
| `SMH` | 2,076.35 | 1.197 | 4,545.71 | 6.78% | 118 |
| `KWEB` | 1,961.01 | 1.353 | 2,140.70 | 8.82% | 68 |
| `PYPL` | 1,242.72 | 1.119 | 4,771.21 | 5.13% | 78 |
| `PLTR` | 1,205.99 | 1.236 | 2,965.70 | 5.00% | 40 |
| `ARKK` | 244.69 | 1.028 | 5,079.55 | 6.52% | 92 |
| `GLD` | 113.28 | 1.019 | 2,510.06 | 10.20% | 98 |
| `BA` | 0.00 | 0.000 | 0.00 | 0.00% | 0 |
| `MSFT` | -42.55 | 0.995 | 5,601.59 | 7.32% | 123 |
| `SPY` | -501.04 | 0.899 | 1,257.91 | 10.78% | 102 |
| `ARM` | -1,283.85 | 0.000 | 1,463.64 | 0.00% | 17 |
| `UBER` | -1,316.29 | 0.751 | 2,041.66 | 4.00% | 50 |
| `PANW` | -1,336.04 | 0.838 | 5,129.50 | 8.74% | 103 |
| `AMZN` | -1,399.62 | 0.876 | 5,502.09 | 7.76% | 116 |
| `DIS` | -1,639.87 | 0.709 | 3,767.99 | 5.41% | 74 |
| `IWM` | -2,026.91 | 0.656 | 2,999.59 | 3.51% | 114 |
| `BIDU` | -2,086.01 | 0.725 | 3,800.25 | 6.25% | 64 |
| `NKE` | -2,150.09 | 0.546 | 3,509.21 | 7.69% | 65 |
| `MSOS` | -2,299.28 | 0.421 | 3,887.83 | 8.33% | 12 |
| `QQQ` | -2,496.56 | 0.566 | 2,496.56 | 4.84% | 124 |
| `INTC` | -2,760.54 | 0.644 | 4,726.14 | 7.23% | 83 |
| `PFE` | -3,046.49 | 0.417 | 3,561.89 | 3.49% | 86 |
| `SOXX` | -3,166.55 | 0.659 | 3,796.23 | 7.32% | 123 |
| `META` | -3,180.98 | 0.613 | 5,000.36 | 3.51% | 114 |
| `AVGO` | -3,243.33 | 0.715 | 4,877.85 | 5.19% | 135 |
| `AMD` | -3,275.68 | 0.786 | 5,195.02 | 8.57% | 105 |
| `RIVN` | -3,559.76 | 0.000 | 3,639.88 | 0.00% | 21 |
| `SNAP` | -3,602.86 | 0.252 | 3,602.86 | 2.50% | 40 |
| `SNOW` | -3,828.38 | 0.100 | 3,828.38 | 3.03% | 33 |

**他と比べて強かった点（同一市場平均との差で書く）**

- `avg_profit_factor が US平均(1.2922)より +0.6500 (+50.31%) 高く、判断基準「許容」に分類される`
- `avg_max_drawdown が US平均(4,938.28)より -685.58 (-13.88%) 小さく、判断基準「優秀」に分類される`
- `avg_net_profit が US平均(4,954.74)より -122.30 (-2.47%) 低い`
- `銘柄集中度 — NVDA が全利益の 26.8% を占めており「優秀（最大1銘柄 < 30%）」に分類される`

### 2位: `emr-breakout-confirm-close-above-10d-high`

- composite_score: `n/a` / markets: `US`
- avg_net_profit: `4,989.15` / avg_profit_factor: `1.8855` / avg_max_drawdown: `2,947.96`

**他と比べて強かった点（同一市場平均との差で書く）**

- `avg_profit_factor が US平均(1.2922)より +0.5933 (+45.92%) 高く、判断基準「許容」に分類される`
- `avg_max_drawdown が US平均(4,938.28)より -1,990.32 (-40.30%) 小さく、判断基準「優秀」に分類される`
- `avg_net_profit が US平均(4,954.74)より +34.41 (+0.69%) 高い`
- `銘柄集中度 — NVDA が全利益の 51.7% を占めており「要注意（50〜70%）」に分類される`

### 3位: `emr-breakout-trend-ema50-above-ema200`

- composite_score: `n/a` / markets: `US`
- avg_net_profit: `3,879.18` / avg_profit_factor: `1.8672` / avg_max_drawdown: `3,790.70`

**他と比べて強かった点（同一市場平均との差で書く）**

- `avg_profit_factor が US平均(1.2922)より +0.5750 (+44.50%) 高く、判断基準「許容」に分類される`
- `avg_max_drawdown が US平均(4,938.28)より -1,147.58 (-23.24%) 小さく、判断基準「優秀」に分類される`
- `avg_net_profit が US平均(4,954.74)より -1,075.56 (-21.71%) 低い`
- `銘柄集中度 — MSTR が全利益の 43.2% を占めており「許容（30〜50%）」に分類される`

---

## 除外候補

| presetId | 分類 | 弱かった指標（平均との差） | 判断 |
|---|---|---|---|
| `emr-breakout-tp12-full-exit` | `即除外` | `avg_net_profit が US平均(4,954.74)より -5,938.23 (-119.85%) 低く、avg_profit_factor も -0.3701 (-28.64%) 低い。avg_win_rate は 49.23% で判断基準「優秀」` | `除外候補` |
| `emr-breakout-trail-chandelier-22x25` | `即除外` | `avg_net_profit が US平均(4,954.74)より -4,776.22 (-96.40%) 低く、avg_profit_factor も -0.3542 (-27.41%) 低い。avg_win_rate は 33.40% で判断基準「即除外」` | `除外候補` |
| `emr-breakout-delay-3bar-close-above-signal-high` | `即除外` | `avg_net_profit が US平均(4,954.74)より -3,605.06 (-72.76%) 低く、avg_profit_factor も -0.3032 (-23.46%) 低い。avg_win_rate は 6.21% で判断基準「即除外」` | `除外候補` |

---

## 銘柄集中チェック

| presetId | 最大利益銘柄 | 集中度(%) | 判断基準分類 |
|---|---|---|---|
| `emr-breakout-trend-price-above-ema200` | `NVDA (51,792.79)` | `26.8%` | `優秀（最大1銘柄 < 30%）` |
| `emr-breakout-confirm-close-above-10d-high` | `NVDA (103,211.51)` | `51.7%` | `要注意（50〜70%）` |
| `emr-breakout-trend-ema50-above-ema200` | `MSTR (67,005.80)` | `43.2%` | `許容（30〜50%）` |

---

## 改善点と次回バックテスト確認事項

1. **EMA200 trend filter と 10日高値 confirm の優位性比較**  
   `1位 は 2位 より avg_profit_factor が +0.0567 高い一方、avg_net_profit は -156.71 低い。EMA200 条件と 10日高値条件だけが異なる比較群を固定し、signal count・保有日数・銘柄別寄与を並べて、PF 改善と利益最大化のどちらを優先すべきか判断する。`

2. **極端に低い勝率の原因切り分け**  
   `US平均 avg_win_rate は 13.29%、1位でも 7.90% に留まった。entry 条件は維持したまま exit だけを base / trail-atr / profit-protect に切り替える A/B テストを行い、低勝率でも PF を維持できるのか、あるいは exit 設計が勝率低下を悪化させているのかを確認する。`

3. **NVDA 依存の解消検証**  
   `2位 は NVDA 依存度 51.7% で「要注意」に入った。NVDA を除外した再集計と、半導体ETF群（NVDA/AVGO/SMH）だけを抜いた再集計を作り、2位 の rank が維持されるかを確認して汎化性を評価する。`

4. **full-exit 系の探索枠縮小**  
   `48位〜50位 の tp8/tp10/tp12 full exit は avg_net_profit -983.49、avg_profit_factor 0.9221 まで落ちた。次回はこの 3 本を探索対象から外し、その枠を EMA200 系の exit 差分か confirm 条件の微調整へ振り向ける。`

5. **トレンド条件の絞り込み**  
   `Top3 のうち 2 本は EMA200 系で、いずれも avg_max_drawdown が US平均(4,938.28)より 685.58〜1,147.58 小さい。次回は price above ema200 / ema50 above ema200 / ema200 rising の 3 条件だけを残した縮小バンドルを組み、DD 抑制と net profit の交換比率を比較する。`
