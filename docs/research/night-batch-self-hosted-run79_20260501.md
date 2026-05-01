---

## ヘッダー

- run_id: `20260430_230202`
- status: `SUCCESS`
- 対象市場: `US`
- 目的: `Night Batch Self Hosted #79 で ema-breakout-winrate-stopout-us40-50pack を実行し、entry / anchor / stop / reentry / exit / hybrid の 50 preset を US40 full artifact で比較する。あわせて validation failure で止まった preset 群の影響を整理する`

---

## 結論

- **総合首位**: `emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high-atr05` / composite_score `n/a` / avg_net_profit `1,914.41` / avg_profit_factor `5.9737`
- **US 本命**: `emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high-atr05` / avg_net_profit `1,914.41` / avg_profit_factor `5.9737`
- **JP 本命**: `対象なし` / avg_net_profit `対象なし` / avg_profit_factor `対象なし`
- **ざっくり判断**: run79 の workflow 自体は success だが、`full/final-results.json` は `775 total / 595 success / 180 failure / 36 blocked presets` で止まっており、`strategy-ranking.json` で有効指標が出ているのは `15/50` 戦略のみだった。完走済み 15 戦略の中では `20d-high confirm` 系が PF `3.4342〜5.9737`、DD `1,082.51〜1,890.50` で優位だった一方、Top3 の avg_win_rate は `9.18〜11.39%` に留まり、固定基準では全て「即除外」に該当する。さらに Top1 は `NVDA` 依存度 `50.7%` で「要注意」だったため、現時点では採用判断よりも `stop_loss.type` validation failure 群の修正と full 再実行が先。

---

## 判断基準（固定値 — AIは変更しないこと）

| 指標 | 優秀 | 許容 | 要注意 | 即除外 |
|---|---|---|---|---|
| avg_profit_factor | ≥ 2.0 | 1.7〜2.0 | 1.5〜1.7 | < 1.5 |
| avg_max_drawdown | < 5,000 | 5,000〜6,200 | 6,200〜7,000 | > 7,000 |
| avg_win_rate | ≥ 45% | 40〜45% | 35〜40% | < 35% |
| 銘柄集中度 | 最大1銘柄 < 30% | 30〜50% | 50〜70% | ≥ 70% |

**市場別 平均値（比較の基準として使う）**

注記: run79 は `50` preset 中 `35` preset が `avg_* = null` だったため、平均との差は `full 指標が存在する 15 戦略` の算術平均を基準にした。

| 市場 | 戦略数 | avg_net_profit 平均 | avg_profit_factor 平均 | avg_max_drawdown 平均 |
|---|---|---|---|---|
| US 専用 | 15 | 3,283.66 | 2.5834 | 2,517.09 |
| JP 専用 | 0 | 対象なし | 対象なし | 対象なし |
| US+JP 両対応 | 0 | 対象なし | 対象なし | 対象なし |

---

## 全戦略スコア一覧

注記: artifact の `strategy-ranking.json` に `composite_score` 列が含まれていなかったため、本表では `n/a` とした。rank 16 以降の `n/a` は `full` 指標未算出を表す。

| rank | presetId | composite_score | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | markets |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high-atr05` | n/a | 1,914.41 | 5.974 | 1,082.51 | 11.39% | `US` |
| 2 | `emr-breakout-winrate-stopout-entry-confirm-volume20x15` | n/a | 2,174.93 | 3.706 | 1,166.28 | 9.87% | `US` |
| 3 | `emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high` | n/a | 3,152.78 | 3.434 | 1,890.50 | 9.18% | `US` |
| 4 | `emr-breakout-winrate-stopout-entry-confirm-20d-high-close-above-prev-high` | n/a | 3,152.78 | 3.434 | 1,890.50 | 9.18% | `US` |
| 5 | `emr-breakout-winrate-stopout-entry-rsi60-price-above-ema200` | n/a | 3,491.41 | 2.758 | 2,009.32 | 8.30% | `US` |
| 6 | `emr-breakout-winrate-stopout-entry-confirm-volume20x10` | n/a | 3,436.86 | 2.723 | 2,032.45 | 8.64% | `US` |
| 7 | `emr-breakout-winrate-stopout-entry-confirm-10d-high-close-above-fast-ema` | n/a | 3,384.82 | 2.565 | 2,494.61 | 8.18% | `US` |
| 8 | `emr-breakout-winrate-stopout-anchor-trend-price-above-ema200` | n/a | 4,832.44 | 1.942 | 4,252.70 | 7.90% | `US` |
| 9 | `emr-breakout-winrate-stopout-entry-rsi55-macd-positive` | n/a | 3,328.35 | 1.931 | 2,484.55 | 7.73% | `US` |
| 10 | `emr-breakout-winrate-stopout-entry-delay-1bar-high-break` | n/a | 700.90 | 1.889 | 1,974.45 | 7.18% | `US` |
| 11 | `emr-breakout-winrate-stopout-anchor-confirm-close-above-10d-high` | n/a | 4,989.15 | 1.886 | 2,947.96 | 7.89% | `US` |
| 12 | `emr-breakout-winrate-stopout-anchor-trend-ema50-above-ema200` | n/a | 3,879.18 | 1.867 | 3,790.70 | 7.49% | `US` |
| 13 | `emr-breakout-winrate-stopout-anchor-trend-price-above-ema200-rsi55` | n/a | 4,636.39 | 1.836 | 3,830.40 | 7.90% | `US` |
| 14 | `emr-breakout-winrate-stopout-anchor-confirm-close-above-5d-high` | n/a | 4,773.80 | 1.746 | 3,299.32 | 7.57% | `US` |
| 15 | `emr-breakout-winrate-stopout-entry-delay-2bar-high-break` | n/a | 1,406.76 | 1.060 | 2,610.08 | 5.85% | `US` |
| 16 | `emr-breakout-winrate-stopout-stop-grace-3bar-fixed8` | n/a | n/a | n/a | n/a | n/a | `US` |
| 17 | `emr-breakout-winrate-stopout-stop-grace-5bar-fixed8` | n/a | n/a | n/a | n/a | n/a | `US` |
| 18 | `emr-breakout-winrate-stopout-stop-until-plus2pct` | n/a | n/a | n/a | n/a | n/a | `US` |
| 19 | `emr-breakout-winrate-stopout-stop-until-breakout-high` | n/a | n/a | n/a | n/a | n/a | `US` |
| 20 | `emr-breakout-winrate-stopout-stop-signal-low-only-grace3` | n/a | n/a | n/a | n/a | n/a | `US` |
| 21 | `emr-breakout-winrate-stopout-stop-atr15-grace5` | n/a | n/a | n/a | n/a | n/a | `US` |
| 22 | `emr-breakout-winrate-stopout-stop-atr20-grace5` | n/a | n/a | n/a | n/a | n/a | `US` |
| 23 | `emr-breakout-winrate-stopout-stop-swinglow-atr05` | n/a | n/a | n/a | n/a | n/a | `US` |
| 24 | `emr-breakout-winrate-stopout-stop-signal-low-atr10` | n/a | n/a | n/a | n/a | n/a | `US` |
| 25 | `emr-breakout-winrate-stopout-stop-wider-fixed-signal-low-grace3` | n/a | n/a | n/a | n/a | n/a | `US` |
| 26 | `emr-breakout-winrate-stopout-reentry-10d-high-10bar` | n/a | n/a | n/a | n/a | n/a | `US` |
| 27 | `emr-breakout-winrate-stopout-reentry-20d-high-15bar` | n/a | n/a | n/a | n/a | n/a | `US` |
| 28 | `emr-breakout-winrate-stopout-reentry-fast-ema-reclaim` | n/a | n/a | n/a | n/a | n/a | `US` |
| 29 | `emr-breakout-winrate-stopout-reentry-macd-positive` | n/a | n/a | n/a | n/a | n/a | `US` |
| 30 | `emr-breakout-winrate-stopout-reentry-rsi55` | n/a | n/a | n/a | n/a | n/a | `US` |
| 31 | `emr-breakout-winrate-stopout-reentry-breakout-high-close` | n/a | n/a | n/a | n/a | n/a | `US` |
| 32 | `emr-breakout-winrate-stopout-reentry-grace3-plus-10d-high` | n/a | n/a | n/a | n/a | n/a | `US` |
| 33 | `emr-breakout-winrate-stopout-reentry-atr15-plus-breakout-high` | n/a | n/a | n/a | n/a | n/a | `US` |
| 34 | `emr-breakout-winrate-stopout-reentry-signal-low-trend-only` | n/a | n/a | n/a | n/a | n/a | `US` |
| 35 | `emr-breakout-winrate-stopout-reentry-breakout-high-halfsize` | n/a | n/a | n/a | n/a | n/a | `US` |
| 36 | `emr-breakout-winrate-stopout-exit-breakeven-plus6` | n/a | n/a | n/a | n/a | n/a | `US` |
| 37 | `emr-breakout-winrate-stopout-exit-minus2-after-plus4` | n/a | n/a | n/a | n/a | n/a | `US` |
| 38 | `emr-breakout-winrate-stopout-exit-half-tp8-ema20` | n/a | n/a | n/a | n/a | n/a | `US` |
| 39 | `emr-breakout-winrate-stopout-exit-half-tp10-ema20` | n/a | n/a | n/a | n/a | n/a | `US` |
| 40 | `emr-breakout-winrate-stopout-exit-close-below-ema10` | n/a | n/a | n/a | n/a | n/a | `US` |
| 41 | `emr-breakout-winrate-stopout-exit-close-below-ema15` | n/a | n/a | n/a | n/a | n/a | `US` |
| 42 | `emr-breakout-winrate-stopout-exit-macd-bear-after-plus6` | n/a | n/a | n/a | n/a | n/a | `US` |
| 43 | `emr-breakout-winrate-stopout-exit-rsi-loss55-after-plus8` | n/a | n/a | n/a | n/a | n/a | `US` |
| 44 | `emr-breakout-winrate-stopout-exit-trail-atr25` | n/a | n/a | n/a | n/a | n/a | `US` |
| 45 | `emr-breakout-winrate-stopout-exit-chandelier25-grace5` | n/a | n/a | n/a | n/a | n/a | `US` |
| 46 | `emr-breakout-winrate-stopout-hybrid-ema200-10dhigh-grace3` | n/a | n/a | n/a | n/a | n/a | `US` |
| 47 | `emr-breakout-winrate-stopout-hybrid-ema200-20dhigh-signal-low-atr` | n/a | n/a | n/a | n/a | n/a | `US` |
| 48 | `emr-breakout-winrate-stopout-hybrid-10dhigh-stopout-breakout-reentry` | n/a | n/a | n/a | n/a | n/a | `US` |
| 49 | `emr-breakout-winrate-stopout-hybrid-ema200-plus6-ema15` | n/a | n/a | n/a | n/a | n/a | `US` |
| 50 | `emr-breakout-winrate-stopout-hybrid-ema200-volume15-grace5` | n/a | n/a | n/a | n/a | n/a | `US` |

---

## Top 3 戦略

### 1位: `emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high-atr05`

- composite_score: `n/a` / markets: `US`
- avg_net_profit: `1,914.41` / avg_profit_factor: `5.9737` / avg_max_drawdown: `1,082.51`

**全銘柄の成績**

| 銘柄 | net_profit | profit_factor | max_drawdown | win_rate | trades |
|---|---:|---:|---:|---:|---:|
| `NVDA` | 38,852.58 | 18.123 | 2,427.93 | 17.65% | 17 |
| `TSLA` | 21,963.89 | 10.198 | 3,044.20 | 14.29% | 14 |
| `AAPL` | 8,287.41 | 21.401 | 335.29 | 33.33% | 15 |
| `MSTR` | 5,439.42 | 3.345 | 2,463.86 | 11.11% | 9 |
| `IBIT` | 2,756.79 | 113.685 | 132.35 | 50.00% | 2 |
| `QCOM` | 2,517.89 | 3.849 | 716.20 | 7.14% | 14 |
| `UBER` | 2,246.97 | 21.424 | 191.58 | 25.00% | 4 |
| `ARKK` | 1,952.86 | 2.279 | 1,741.22 | 7.69% | 13 |
| `SMH` | 1,921.96 | 3.593 | 497.49 | 15.38% | 13 |
| `PLTR` | 1,785.26 | 5.321 | 588.44 | 25.00% | 8 |
| `AVGO` | 1,277.19 | 2.735 | 753.50 | 12.50% | 8 |
| `KWEB` | 749.04 | 1.551 | 1,143.74 | 16.67% | 12 |
| `SPY` | 693.04 | 2.197 | 507.35 | 21.43% | 14 |
| `GLD` | 688.11 | 1.730 | 635.57 | 13.33% | 15 |
| `COIN` | 683.64 | 8.129 | 294.31 | 33.33% | 3 |
| `DIS` | 449.48 | 2.372 | 417.39 | 14.29% | 7 |
| `IWM` | 349.58 | 1.960 | 357.87 | 12.50% | 8 |
| `GOOGL` | 335.91 | 1.247 | 1,200.08 | 15.79% | 19 |
| `CRM` | 211.62 | 1.335 | 592.72 | 12.50% | 8 |
| `LLY` | 207.01 | 1.144 | 1,030.12 | 13.33% | 15 |
| `BA` | 0.00 | n/a | 0.00 | n/a | 0 |
| `ARM` | -19.56 | 0.000 | 19.56 | 0.00% | 1 |
| `AMD` | -105.29 | 0.972 | 1,818.37 | 18.75% | 16 |
| `SOXX` | -161.12 | 0.824 | 626.67 | 5.88% | 17 |
| `INTC` | -224.34 | 0.774 | 871.35 | 9.09% | 11 |
| `PFE` | -276.75 | 0.000 | 482.61 | 0.00% | 6 |
| `PANW` | -364.31 | 0.766 | 1,302.25 | 8.33% | 12 |
| `QQQ` | -410.69 | 0.446 | 559.61 | 5.00% | 20 |
| `RIVN` | -527.32 | 0.000 | 860.87 | 0.00% | 4 |
| `SNOW` | -615.32 | 0.479 | 1,206.24 | 10.00% | 10 |
| `AMZN` | -627.10 | 0.624 | 1,167.84 | 4.35% | 23 |
| `JPM` | -722.81 | 0.000 | 870.28 | 0.00% | 12 |
| `NKE` | -1,100.05 | 0.000 | 1,136.44 | 0.00% | 11 |
| `NFLX` | -1,118.38 | 0.411 | 1,991.90 | 5.56% | 18 |
| `MSOS` | -1,138.95 | 0.000 | 1,370.76 | 0.00% | 1 |
| `MSFT` | -1,241.90 | 0.058 | 1,352.00 | 5.00% | 20 |
| `META` | -1,296.63 | 0.000 | 1,449.86 | 0.00% | 14 |
| `PYPL` | -1,883.48 | 0.000 | 2,046.02 | 0.00% | 16 |
| `SNAP` | -2,396.67 | 0.000 | 2,494.16 | 0.00% | 12 |
| `BIDU` | -2,562.69 | 0.000 | 2,602.33 | 0.00% | 12 |

**他と比べて強かった点（同一市場平均との差で書く）**

- `avg_profit_factor が US平均(2.5834)より +3.3903 (+131.23%) 高く、判断基準「優秀」を満たす`
- `avg_max_drawdown が US平均(2,517.09)より -1,434.58 (-56.99%) 小さく、判断基準「優秀」に分類される`
- `avg_win_rate が US平均(8.28%)より +3.11 (+37.50%) 高いが、11.39% のため固定基準では「即除外」に分類される`
- `銘柄集中度 — NVDA が全利益の 50.7% を占めており「要注意（50〜70%）」に分類される`

---

### 2位: `emr-breakout-winrate-stopout-entry-confirm-volume20x15`

- composite_score: `n/a` / markets: `US`
- avg_net_profit: `2,174.93` / avg_profit_factor: `3.7055` / avg_max_drawdown: `1,166.28`

**他と比べて強かった点（同一市場平均との差で書く）**

- `avg_profit_factor が US平均(2.5834)より +1.1221 (+43.43%) 高く、判断基準「優秀」を満たす`
- `avg_max_drawdown が US平均(2,517.09)より -1,350.81 (-53.67%) 小さく、判断基準「優秀」に分類される`
- `avg_win_rate が US平均(8.28%)より +1.59 (+19.15%) 高いが、9.87% のため固定基準では「即除外」に分類される`
- `銘柄集中度 — NVDA が全利益の 46.3% を占めており「許容（30〜50%）」に分類される`

---

### 3位: `emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high`

- composite_score: `n/a` / markets: `US`
- avg_net_profit: `3,152.78` / avg_profit_factor: `3.4342` / avg_max_drawdown: `1,890.50`

**他と比べて強かった点（同一市場平均との差で書く）**

- `avg_net_profit が US平均(3,283.66)より -130.88 (-3.99%) 低いが、Top3 の中では最も平均利益に近い`
- `avg_profit_factor が US平均(2.5834)より +0.8508 (+32.93%) 高く、判断基準「優秀」を満たす`
- `avg_max_drawdown が US平均(2,517.09)より -626.59 (-24.89%) 小さく、判断基準「優秀」に分類される`
- `銘柄集中度 — NVDA が全利益の 33.6% を占めており「許容（30〜50%）」に分類される`

---

## 除外候補

注記: run79 は `35` preset が `avg_* null` のため、下表は「数値比較可能な除外候補」と「validation failure により評価不能な代表例」を分けて記載する。

| presetId | 分類 | 弱かった指標（平均との差） | 判断 |
|---|---|---|---|
| `emr-breakout-winrate-stopout-entry-delay-2bar-high-break` | `即除外` | `avg_net_profit が US平均(3,283.66)より -1,876.90 (-57.16%) 低く、avg_profit_factor も -1.5233 (-58.97%) 低い。avg_win_rate 5.85% も固定基準「即除外」` | `除外候補` |
| `emr-breakout-winrate-stopout-stop-grace-3bar-fixed8` | `評価不能` | `avg_* が未算出で、full/final-results.json では success_count 0 / 5 failures。failure reason は stop_loss.type validation failure` | `要修正。除外判断ではなく再実行前提` |

---

## 銘柄集中チェック

| presetId | 最大利益銘柄 | 集中度(%) | 判断基準分類 |
|---|---|---|---|
| `emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high-atr05` | `NVDA (38,852.58)` | `50.7%` | `要注意（50〜70%）` |
| `emr-breakout-winrate-stopout-entry-confirm-volume20x15` | `NVDA (40,307.82)` | `46.3%` | `許容（30〜50%）` |
| `emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high` | `NVDA (42,311.42)` | `33.6%` | `許容（30〜50%）` |

---

## 改善点と次回バックテスト確認事項

1. **`stop_loss.type` validation failure を先に解消する**  
   run79 は 36 blocked presets のうち大半が「stop_loss.type must be one of: hard_percent, atr_stop」で停止した。stop / reentry / exit / hybrid 群の preset 定義を点検し、validation を通したうえで同じ 50 pack を再実行し、まず 50/50 preset で avg_* が出る状態まで戻す。

2. **ATR0.5 追加で PF が伸びる代わりに利益が落ちる理由を切り分ける**  
   1位(atr05) は 3位(20d-high)より avg_profit_factor が +2.5395 高い一方、avg_net_profit は -1,238.37 低い。20d-high confirm を固定し、ATR0.5 あり/なしだけを切り替えた A/B を実施して、利食い効率改善と取り逃しのどちらが支配的か確認する。

3. **volume filter の強度差を単独比較する**  
   2位(volume20x15) は 6位(volume20x10)より avg_profit_factor が +0.9826 (+36.09%) 高く、avg_max_drawdown も -866.17 (-42.62%) 小さい一方、avg_net_profit は -1,261.93 低い。volume multiplier 1.5 と 1.0 の差だけを残した比較で、PF 優先か利益優先かの方針を決める。

4. **Top3 の低 win rate を exit 設計で補えるか検証する**  
   Top3 の avg_win_rate は 9.18〜11.39% で、US平均(8.28%)より高くても固定基準では全て「即除外」。Top3 の entry 条件を固定したまま、利用可能な exit だけを base / ema15 / ema20 / trail-atr に切り替えて、PF を大きく崩さずに win rate を引き上げられるか確認する。

5. **artifact 間の整合性ズレを解消してから次回比較する**  
   `final-results.json` では `emr-breakout-winrate-stopout-entry-rsi60-price-above-ema200` が `35 success / 5 failure / blocked` 扱いだが、`recovered-results.json` と `strategy-ranking.json` では `40 symbol` 分の avg_* が出ている。次回 run 前に summary 生成ロジックと recovered-results の関係を確認し、比較指標として使う JSON の正本を一本化する。
