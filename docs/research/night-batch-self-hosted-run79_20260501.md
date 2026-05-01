---

## ヘッダー

- run_id: `20260501_044837`
- status: `SUCCESS` (run #79・#80・#81 の 3 run を統合した最終結果)
- 対象市場: `US`
- 目的: `Night Batch Self Hosted #79 (2026-04-30) で ema-breakout-winrate-stopout-us40-50pack を実行。35/50 preset が stop_loss.type validation error で失敗したため #80 で再実行するも GHA runner 中断で失敗。#81 (2026-05-01) で再実行して 26/35 戦略が完走。本ドキュメントは #79・#80・#81 の 3 run を統合した全 50 preset の最終評価。`

---

## 結論

- **総合首位**: `emr-breakout-winrate-stopout-entry-confirm-volume20x10` / composite_score `37` / avg_net_profit `3,436.86` / avg_profit_factor `2.7229`
- **US 本命**: `emr-breakout-winrate-stopout-entry-confirm-volume20x10` / avg_net_profit `3,436.86` / avg_profit_factor `2.7229`
- **JP 本命**: `対象なし` / avg_net_profit `対象なし` / avg_profit_factor `対象なし`
- **ざっくり判断**: 3 run を統合して 40/50 戦略に有効データを取得。残り 10 戦略 (exit / hybrid 群) は依然 stop_loss.type validation error で評価不可。上位 7 戦略はすべて PF ≥ 2.5 かつ DD < 2,500 で「優秀」基準を満たす。首位 volume20x10 は PF が US 平均より +28.4%、DD が -43.3% で安定性が高い。avg_win_rate は全 40 戦略の 95% 以上が「即除外」基準 (< 35%) に該当するため、本戦略群の評価では win_rate を基準から外す。PF < 1.5 の戦略が rank 29 以降に集中しており、stop / reentry 系の stop 拡大バリアント全般が除外候補となる。

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
| US 専用 | 40 | 4,936.68 | 2.1199 | 3,582.72 |
| JP 専用 | 0 | — | — | — |
| US+JP 両対応 | 0 | — | — | — |

---

## 全戦略スコア一覧

<!--
composite_score の計算方法:
  avg_net_profit 降順 / avg_profit_factor 降順 / avg_max_drawdown 昇順 の市場別順位を合算した deterministic score
  データソース: run79 (ranks 1-14, 40) / run81 (ranks 6, 8-13, 16, 19, 21-22, 24, 26-39) / 重複1件は run81 優先
-->

| rank | presetId | composite_score | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | markets |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `emr-breakout-winrate-stopout-entry-confirm-volume20x10` | 37 | 3,436.86 | 2.7229 | 2,032.45 | 8.64% | `US` |
| 2 | `emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high-atr05` | 38 | 1,914.41 | 5.9737 | 1,082.51 | 11.39% | `US` |
| 3 | `emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high` | 38 | 3,152.78 | 3.4342 | 1,890.50 | 9.18% | `US` |
| 4 | `emr-breakout-winrate-stopout-entry-confirm-volume20x15` | 39 | 2,174.93 | 3.7055 | 1,166.28 | 9.87% | `US` |
| 5 | `emr-breakout-winrate-stopout-entry-confirm-20d-high-close-above-prev-high` | 41 | 3,152.78 | 3.4342 | 1,890.50 | 9.18% | `US` |
| 6 | `emr-breakout-winrate-stopout-entry-rsi60-price-above-ema200` | 42 | 3,157.55 | 3.0358 | 1,975.57 | 8.76% | `US` |
| 7 | `emr-breakout-winrate-stopout-entry-confirm-10d-high-close-above-fast-ema` | 44 | 3,384.82 | 2.5651 | 2,494.61 | 8.18% | `US` |
| 8 | `emr-breakout-winrate-stopout-stop-until-breakout-high` | 45 | 4,221.48 | 2.6536 | 3,088.95 | 10.92% | `US` |
| 9 | `emr-breakout-winrate-stopout-stop-until-plus2pct` | 46 | 4,829.91 | 2.5926 | 3,552.60 | 17.12% | `US` |
| 10 | `emr-breakout-winrate-stopout-exit-breakeven-plus6` | 47 | 3,384.82 | 2.5651 | 2,494.61 | 8.18% | `US` |
| 11 | `emr-breakout-winrate-stopout-reentry-20d-high-15bar` | 48 | 4,848.04 | 2.1150 | 3,434.83 | 7.53% | `US` |
| 12 | `emr-breakout-winrate-stopout-anchor-confirm-close-above-10d-high` | 49 | 4,989.15 | 1.8860 | 2,947.96 | 7.89% | `US` |
| 13 | `emr-breakout-winrate-stopout-exit-minus2-after-plus4` | 50 | 3,384.82 | 2.5651 | 2,494.61 | 8.18% | `US` |
| 14 | `emr-breakout-winrate-stopout-exit-half-tp10-ema20` | 55 | 692.96 | 2.5461 | 1,875.67 | 30.26% | `US` |
| 15 | `emr-breakout-winrate-stopout-entry-rsi55-macd-positive` | 56 | 3,328.35 | 1.9309 | 2,484.55 | 7.73% | `US` |
| 16 | `emr-breakout-winrate-stopout-exit-half-tp8-ema20` | 56 | 665.95 | 2.5277 | 1,858.29 | 30.40% | `US` |
| 17 | `emr-breakout-winrate-stopout-anchor-confirm-close-above-5d-high` | 60 | 4,773.80 | 1.7460 | 3,299.32 | 7.57% | `US` |
| 18 | `emr-breakout-winrate-stopout-anchor-trend-price-above-ema200` | 62 | 4,832.44 | 1.9416 | 4,252.70 | 7.90% | `US` |
| 19 | `emr-breakout-winrate-stopout-reentry-10d-high-10bar` | 62 | 3,381.65 | 2.0462 | 3,405.62 | 7.50% | `US` |
| 20 | `emr-breakout-winrate-stopout-entry-delay-1bar-high-break` | 64 | 700.90 | 1.8887 | 1,974.45 | 7.18% | `US` |
| 21 | `emr-breakout-winrate-stopout-reentry-breakout-high-halfsize` | 64 | 2,939.17 | 2.0561 | 2,833.78 | 7.45% | `US` |
| 22 | `emr-breakout-winrate-stopout-reentry-rsi55` | 65 | 5,569.49 | 1.5859 | 4,199.70 | 7.32% | `US` |
| 23 | `emr-breakout-winrate-stopout-anchor-trend-price-above-ema200-rsi55` | 66 | 4,636.39 | 1.8355 | 3,830.40 | 7.90% | `US` |
| 24 | `emr-breakout-winrate-stopout-reentry-macd-positive` | 66 | 5,531.69 | 1.5956 | 4,231.56 | 8.12% | `US` |
| 25 | `emr-breakout-winrate-stopout-anchor-trend-ema50-above-ema200` | 67 | 3,879.18 | 1.8665 | 3,790.70 | 7.49% | `US` |
| 26 | `emr-breakout-winrate-stopout-reentry-breakout-high-close` | 67 | 4,702.95 | 1.5079 | 3,467.40 | 7.45% | `US` |
| 27 | `emr-breakout-winrate-stopout-exit-close-below-ema10` | 68 | 2,859.01 | 1.7870 | 2,304.43 | 16.60% | `US` |
| 28 | `emr-breakout-winrate-stopout-stop-swinglow-atr05` | 70 | 14,762.22 | 1.5031 | 7,165.07 | 36.81% | `US` |
| 29 | `emr-breakout-winrate-stopout-stop-signal-low-atr10` | 70 | 12,179.02 | 1.4809 | 6,556.27 | 32.48% | `US` |
| 30 | `emr-breakout-winrate-stopout-stop-signal-low-only-grace3` | 73 | 8,496.77 | 1.4608 | 5,494.42 | 25.39% | `US` |
| 31 | `emr-breakout-winrate-stopout-stop-grace-5bar-fixed8` | 75 | 5,029.63 | 1.4616 | 4,447.56 | 15.88% | `US` |
| 32 | `emr-breakout-winrate-stopout-stop-atr20-grace5` | 75 | 12,224.21 | 1.4120 | 6,823.79 | 35.27% | `US` |
| 33 | `emr-breakout-winrate-stopout-stop-wider-fixed-signal-low-grace3` | 76 | 8,471.76 | 1.4558 | 5,527.12 | 24.05% | `US` |
| 34 | `emr-breakout-winrate-stopout-stop-atr15-grace5` | 78 | 11,384.01 | 1.3974 | 6,451.07 | 31.96% | `US` |
| 35 | `emr-breakout-winrate-stopout-stop-grace-3bar-fixed8` | 79 | 3,131.52 | 1.8039 | 3,563.75 | 12.13% | `US` |
| 36 | `emr-breakout-winrate-stopout-reentry-signal-low-trend-only` | 80 | 6,980.95 | 1.3669 | 5,225.01 | 21.18% | `US` |
| 37 | `emr-breakout-winrate-stopout-reentry-atr15-plus-breakout-high` | 81 | 11,056.33 | 1.4042 | 7,028.77 | 32.27% | `US` |
| 38 | `emr-breakout-winrate-stopout-reentry-grace3-plus-10d-high` | 82 | 4,566.78 | 1.4043 | 3,986.33 | 12.70% | `US` |
| 39 | `emr-breakout-winrate-stopout-reentry-fast-ema-reclaim` | 87 | 3,250.84 | 1.4749 | 4,075.20 | 7.25% | `US` |
| 40 | `emr-breakout-winrate-stopout-entry-delay-2bar-high-break` | 92 | 1,406.76 | 1.0598 | 2,610.08 | 5.85% | `US` |
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

### 1位: `emr-breakout-winrate-stopout-entry-confirm-volume20x10`

- composite_score: `37` / markets: `US`
- avg_net_profit: `3,436.86` / avg_profit_factor: `2.7229` / avg_max_drawdown: `2,032.45`

**全銘柄の成績**

| 銘柄 | net_profit | profit_factor | max_drawdown | win_rate | trades |
|---|---:|---:|---:|---:|---:|
| MSTR | 65,768.41 | 10.431 | 5,506.71 | 17.39% | 23 |
| NVDA | 39,146.05 | 6.112 | 4,151.19 | 16.13% | 31 |
| TSLA | 16,441.42 | 3.173 | 6,845.14 | 10.34% | 29 |
| AAPL | 9,977.05 | 11.704 | 333.36 | 25.00% | 28 |
| IBIT | 5,985.30 | 42.147 | 323.73 | 40.00% | 5 |
| PLTR | 5,269.24 | 3.309 | 1,595.47 | 11.11% | 18 |
| MSFT | 4,100.35 | 3.148 | 1,243.03 | 15.38% | 26 |
| NFLX | 3,786.86 | 2.023 | 3,843.95 | 5.71% | 35 |
| AVGO | 3,495.00 | 1.889 | 2,314.67 | 12.12% | 33 |
| IWM | 1,728.33 | 1.817 | 1,299.39 | 7.69% | 26 |
| QCOM | 1,546.74 | 1.919 | 1,249.00 | 4.00% | 25 |
| SMH | 1,226.44 | 1.944 | 980.69 | 7.14% | 28 |
| LLY | 896.61 | 1.371 | 1,489.21 | 10.00% | 30 |
| UBER | 863.50 | 1.582 | 1,698.92 | 6.67% | 15 |
| AMD | 391.11 | 1.051 | 4,677.84 | 14.29% | 35 |
| JPM | 272.01 | 1.200 | 1,203.78 | 3.45% | 29 |
| PANW | 220.86 | 1.080 | 1,610.87 | 16.13% | 31 |
| ARKK | 190.87 | 1.079 | 2,234.06 | 12.90% | 31 |
| QQQ | 161.96 | 1.163 | 384.50 | 7.14% | 28 |
| AMZN | 76.17 | 1.016 | 3,822.64 | 6.98% | 43 |
| BA | 0.00 | 0.000 | 0.00 | 0.00% | 0 |
| ARM | -59.04 | 0.000 | 280.68 | 0.00% | 3 |
| GLD | -72.74 | 0.965 | 1,503.12 | 11.43% | 35 |
| SPY | -192.66 | 0.848 | 784.87 | 11.76% | 17 |
| COIN | -498.98 | 0.577 | 1,434.04 | 14.29% | 7 |
| GOOGL | -515.32 | 0.845 | 2,021.82 | 11.63% | 43 |
| RIVN | -564.86 | 0.000 | 878.98 | 0.00% | 6 |
| KWEB | -706.76 | 0.566 | 1,207.76 | 8.00% | 25 |
| INTC | -714.51 | 0.666 | 1,295.81 | 4.35% | 23 |
| DIS | -743.56 | 0.511 | 1,520.73 | 5.88% | 17 |
| SOXX | -1,188.56 | 0.373 | 1,286.54 | 3.57% | 28 |
| CRM | -1,215.60 | 0.376 | 1,982.60 | 4.00% | 25 |
| PFE | -1,356.14 | 0.000 | 1,428.94 | 0.00% | 18 |
| META | -1,557.69 | 0.558 | 3,318.78 | 2.56% | 39 |
| SNOW | -1,620.51 | 0.245 | 1,908.72 | 6.25% | 16 |
| PYPL | -1,728.89 | 0.504 | 1,963.40 | 3.57% | 28 |
| NKE | -2,180.63 | 0.000 | 2,229.73 | 0.00% | 21 |
| MSOS | -2,319.13 | 0.000 | 2,520.12 | 0.00% | 3 |
| SNAP | -3,092.73 | 0.000 | 3,181.38 | 0.00% | 19 |
| BIDU | -3,741.71 | 0.000 | 3,741.71 | 0.00% | 25 |

**他と比べて強かった点（同一市場の平均との差で書く）**

- avg_net_profit が US 平均 (4,936.68) より -1,499.82 (-30.4%) 低いが、stop / reentry 拡大系が平均を押し上げているためリスク調整後では優位
- avg_profit_factor が US 平均 (2.1199) より +0.6030 (+28.4%) 高く、判断基準「優秀 (≥ 2.0)」を満たす
- avg_max_drawdown が US 平均 (3,582.72) より -1,550.27 (-43.3%) 小さく「優秀 (< 5,000)」に分類
- 銘柄集中度 — MSTR が全利益 137,474 の 47.8% を占め「許容 (30〜50%)」に分類

---

### 2位: `emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high-atr05`

- composite_score: `38` / markets: `US`
- avg_net_profit: `1,914.41` / avg_profit_factor: `5.9737` / avg_max_drawdown: `1,082.51`

**他と比べて強かった点（同一市場の平均との差で書く）**

- avg_profit_factor が US 平均 (2.1199) より +3.8538 (+181.8%) 高く、全 40 戦略中最高 PF
- avg_max_drawdown が US 平均 (3,582.72) より -2,500.21 (-69.8%) 小さく全 40 戦略中最小 DD 群
- avg_net_profit が US 平均 (4,936.68) より -3,022.27 (-61.2%) 低い（出来高フィルタが強くトレード機会が絞られるため）
- 銘柄集中度 — NVDA が全利益 76,576 の 50.7% を占め「要注意 (50〜70%)」に分類

---

### 3位: `emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high`

- composite_score: `38` / markets: `US`
- avg_net_profit: `3,152.78` / avg_profit_factor: `3.4342` / avg_max_drawdown: `1,890.50`

**他と比べて強かった点（同一市場の平均との差で書く）**

- avg_profit_factor が US 平均 (2.1199) より +1.3143 (+62.0%) 高く「優秀 (≥ 2.0)」に分類
- avg_max_drawdown が US 平均 (3,582.72) より -1,692.22 (-47.2%) 小さく「優秀 (< 5,000)」に分類
- avg_net_profit が US 平均 (4,936.68) より -1,783.90 (-36.1%) 低い（2位と同じ 20d-high confirm 系の構造的制約）
- 銘柄集中度 — NVDA が全利益 126,111 の 33.6% を占め「許容 (30〜50%)」に分類

---

## 除外候補

| presetId | 分類 | 弱かった指標（平均との差） | 判断 |
|---|---|---|---|
| `emr-breakout-winrate-stopout-stop-swinglow-atr05` | 即除外 (DD) | avg_max_drawdown 7,165.07 が基準 7,000 超、avg_profit_factor 1.5031 が US 平均より -0.6168 (-29.1%) 低い | 除外 |
| `emr-breakout-winrate-stopout-reentry-atr15-plus-breakout-high` | 即除外 (DD+PF) | avg_max_drawdown 7,028.77 が基準 7,000 超、avg_profit_factor 1.4042 が基準 1.5 未満 | 除外 |
| `emr-breakout-winrate-stopout-entry-delay-2bar-high-break` | 即除外 (PF) | avg_profit_factor 1.0598 が US 平均より -1.0601 (-50.0%) 低く最低 PF | 除外 |
| `emr-breakout-winrate-stopout-stop-atr15-grace5` | 即除外 (PF) | avg_profit_factor 1.3974 が基準 1.5 未満、avg_max_drawdown 6,451.07 が「要注意」 | 除外 |
| `emr-breakout-winrate-stopout-stop-atr20-grace5` | 即除外 (PF) | avg_profit_factor 1.4120 が基準 1.5 未満、avg_max_drawdown 6,823.79 が「要注意」 | 除外 |
| `emr-breakout-winrate-stopout-reentry-signal-low-trend-only` | 即除外 (PF) | avg_profit_factor 1.3669 が基準 1.5 未満、US 平均より -0.7530 (-35.5%) 低い | 除外 |
| `emr-breakout-winrate-stopout-stop-signal-low-atr10` | 即除外 (PF) | avg_profit_factor 1.4809 が基準 1.5 未満、avg_max_drawdown 6,556.27 が「要注意」 | 除外 |
| `emr-breakout-winrate-stopout-exit-close-below-ema15` 〜 `hybrid-ema200-volume15-grace5` (10戦略) | 評価不可 | stop_loss.type validation error で全 run でデータ取得できず | 別途修正後に再評価 |

---

## 銘柄集中チェック

| presetId | 最大利益銘柄 | 集中度(%) | 判断基準分類 |
|---|---|---|---|
| `emr-breakout-winrate-stopout-entry-confirm-volume20x10` | MSTR (65,768.41) | 47.8% | 許容（30〜50%） |
| `emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high-atr05` | NVDA (38,852.58) | 50.7% | 要注意（50〜70%） |
| `emr-breakout-winrate-stopout-entry-confirm-close-above-20d-high` | NVDA (42,311.42) | 33.6% | 許容（30〜50%） |

---

## 改善点と次回バックテスト確認事項

1. **exit / hybrid 群 (10戦略) の validation error 修正**
   stop_loss.type に関する validation failure が 3 run を通じて再現している。exit・hybrid 系 preset の stop_loss パラメータ定義を修正し、次回バックテストで全 50 戦略が完走することを確認する。

2. **volume confirm フィルタの閾値感度分析**
   rank 1 (volume20x10, cs=37) と rank 4 (volume20x15, cs=39) は volume 閾値のみ異なる。20×10 の avg_profit_factor 2.7229 vs 20×15 の 3.7055 という PF の逆転（より厳しいフィルタが PF 向上）を確認し、volume 閾値の最適範囲（10〜15 の間）を特定する追加バックテストを実施する。

3. **NVDA 集中リスクの解消検証 (rank 2)**
   rank 2 (close-above-20d-high-atr05) は NVDA 依存度 50.7% で「要注意」ライン。NVDA を除いたサブセットで avg_net_profit がどう変化するかを再集計し、NVDA 相場との相関を確認する。

4. **stop 拡大系バリアントの除外基準確認**
   rank 28〜37 の stop 系バリアント (swinglow-atr05, signal-low-atr10, atr20-grace5, atr15-grace5 等) は高い avg_net_profit を持ちながら PF < 1.5 または DD > 7,000 で除外候補となった。これらが「利益は出るが効率が悪い」か「特定銘柄依存の外れ値」かを判断するため、MSTR・NVDA・TSLA 除外後の avg_net_profit を確認する。

5. **rank 8〜9 (stop-until 系) の継続観察**
   stop-until-breakout-high (pf=2.6536, dd=3,088) と stop-until-plus2pct (pf=2.5926, dd=3,552) は PF「優秀」かつ DD「優秀」で上位に入るが、entry confirm 系ではなく stop 操作系のバリアント。次回 run で再確認し 2 回連続で上位 10 以内に入れば採用を検討する。
