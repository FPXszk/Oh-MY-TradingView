---

## ヘッダー

- run_id: `20260428_233211`
- status: `SUCCESS`
- 対象市場: `US`
- 目的: `run71 の partial 結果で強かった recovery 系を、50 strategies × 40 symbols の US40 campaign で full 2000 / 2000 完走させ、baseline 2 本と派生 44 本の優劣を確定する`

---

## 結論

- **総合首位**: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma15-rsi60` / composite_score `n/a` / avg_net_profit `10,670.95` / avg_profit_factor `2.5118`
- **US 本命**: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma15-rsi60` / avg_net_profit `10,670.95` / avg_profit_factor `2.5118`
- **JP 本命**: `対象なし` / avg_net_profit `対象なし` / avg_profit_factor `対象なし`
- **ざっくり判断**: run72 は `deep-pullback-plus-recovery-us40-50pack` を `2000 / 2000 success` で完走し、run71 の partial 暫定順位を正式結果で置き換えた。上位は `vixpeak + sma15/sma20 + rsi60` が独占し、PF `2.5048〜2.5118` と DD `4,812.49〜4,831.81` で判断基準「優秀」を満たした。一方で `rsi2only` と `vixpeak-or-rsi2x10` は PF が `1.7819〜1.8813` まで低下し、DD も `6,773.61〜8,528.21` まで悪化したため、比較軸としては明確に劣後した。`donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` は 47 位だったが、DD `4,207.76` と低リスクだったため、攻め筋ではなく守りの baseline として残す価値はある。

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
| US 専用 | 50 | 10,281.69 | 2.1246 | 5,775.63 |
| JP 専用 | 0 | 対象なし | 対象なし | 対象なし |
| US+JP 両対応 | 0 | 対象なし | 対象なし | 対象なし |

---

## 全戦略スコア一覧

| rank | presetId | composite_score | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | markets |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma15-rsi60` | n/a | 10670.95 | 2.5118 | 4812.49 | 52.74% | `US` |
| 2 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma20-rsi60` | n/a | 10710.59 | 2.5048 | 4831.81 | 52.65% | `US` |
| 3 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi60` | n/a | 10710.59 | 2.5048 | 4831.81 | 52.65% | `US` |
| 4 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma15-rsi60` | n/a | 10710.59 | 2.5048 | 4831.81 | 52.65% | `US` |
| 5 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-noconfirm-sma25-rsi65` | n/a | 19024.58 | 2.4684 | 8477.77 | 55.46% | `US` |
| 6 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-and-rsi2x10-sma25-rsi60` | n/a | 8723.59 | 2.3641 | 3722.25 | 52.15% | `US` |
| 7 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-and-rsi2x10-sma25-rsi60` | n/a | 8723.59 | 2.3641 | 3722.25 | 52.15% | `US` |
| 8 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-and-rsi2x10-sma25-rsi60` | n/a | 8723.59 | 2.3641 | 3722.25 | 52.15% | `US` |
| 9 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi60` | n/a | 12139.65 | 2.2838 | 5190.94 | 54.67% | `US` |
| 10 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi60` | n/a | 12139.65 | 2.2838 | 5190.94 | 54.67% | `US` |
| 11 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi60` | n/a | 12139.65 | 2.2838 | 5190.94 | 54.67% | `US` |
| 12 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-rsi2x10-sma25-rsi65` | n/a | 9187.41 | 2.2482 | 3784.90 | 52.04% | `US` |
| 13 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-and-rsi2x10-sma25-rsi65` | n/a | 9187.41 | 2.2482 | 3784.90 | 52.04% | `US` |
| 14 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-and-rsi2x10-sma25-rsi65` | n/a | 9187.41 | 2.2482 | 3784.90 | 52.04% | `US` |
| 15 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-and-rsi2x10-sma25-rsi65` | n/a | 9187.41 | 2.2482 | 3784.90 | 52.04% | `US` |
| 16 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-and-rsi2x10-sma20-rsi65` | n/a | 9187.41 | 2.2482 | 3784.90 | 52.04% | `US` |
| 17 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-noconfirm-sma25-rsi65` | n/a | 14609.84 | 2.1835 | 9222.73 | 58.56% | `US` |
| 18 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi62` | n/a | 11606.95 | 2.1531 | 5340.59 | 53.74% | `US` |
| 19 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi62` | n/a | 11606.95 | 2.1531 | 5340.59 | 53.74% | `US` |
| 20 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi62` | n/a | 11606.95 | 2.1531 | 5340.59 | 53.74% | `US` |
| 21 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi45-vixpeak-sma25-rsi65` | n/a | 13804.45 | 2.1253 | 9377.86 | 57.04% | `US` |
| 22 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi45-vixpeak-sma20-rsi65` | n/a | 13804.45 | 2.1253 | 9377.86 | 57.04% | `US` |
| 23 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi65` | n/a | 10306.04 | 2.0996 | 6044.74 | 53.80% | `US` |
| 24 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi65` | n/a | 10306.04 | 2.0996 | 6044.74 | 53.80% | `US` |
| 25 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2x10-sma25-rsi65` | n/a | 11465.20 | 2.0919 | 8420.88 | 56.43% | `US` |
| 26 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2only-sma25-rsi65` | n/a | 11465.20 | 2.0919 | 8420.88 | 56.43% | `US` |
| 27 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2only-sma20-rsi65` | n/a | 11465.20 | 2.0919 | 8420.88 | 56.43% | `US` |
| 28 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma15-rsi62` | n/a | 9857.71 | 2.0460 | 4950.94 | 51.94% | `US` |
| 29 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma20-rsi62` | n/a | 9857.71 | 2.0460 | 4950.94 | 51.94% | `US` |
| 30 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma25-rsi62` | n/a | 9857.71 | 2.0460 | 4950.94 | 51.94% | `US` |
| 31 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma15-rsi62` | n/a | 9857.71 | 2.0460 | 4950.94 | 51.94% | `US` |
| 32 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi62` | n/a | 9857.71 | 2.0460 | 4950.94 | 51.94% | `US` |
| 33 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi62` | n/a | 9857.71 | 2.0460 | 4950.94 | 51.94% | `US` |
| 34 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50` | n/a | 7548.48 | 2.0025 | 3670.61 | 51.26% | `US` |
| 35 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi35-vixpeak-sma25-rsi65` | n/a | 7548.48 | 2.0025 | 3670.61 | 51.26% | `US` |
| 36 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi35-vixpeak-sma20-rsi65` | n/a | 7548.48 | 2.0025 | 3670.61 | 51.26% | `US` |
| 37 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi35-vixpeak-sma25-rsi60` | n/a | 7548.48 | 2.0025 | 3670.61 | 51.26% | `US` |
| 38 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2only-sma25-rsi60` | n/a | 10122.78 | 1.9715 | 7239.32 | 56.95% | `US` |
| 39 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-or-rsi2x10-sma25-rsi65` | n/a | 11824.16 | 1.9680 | 8225.87 | 54.09% | `US` |
| 40 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-rsi2only-sma25-rsi65` | n/a | 11928.70 | 1.9523 | 7928.16 | 54.07% | `US` |
| 41 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma25-rsi65` | n/a | 8092.07 | 1.9336 | 5574.01 | 51.48% | `US` |
| 42 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi65` | n/a | 8092.07 | 1.9336 | 5574.01 | 51.48% | `US` |
| 43 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma20-rsi65` | n/a | 8092.07 | 1.9336 | 5574.01 | 51.48% | `US` |
| 44 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi65` | n/a | 8092.07 | 1.9336 | 5574.01 | 51.48% | `US` |
| 45 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-rsi2only-sma25-rsi65` | n/a | 9338.57 | 1.9227 | 8315.90 | 54.60% | `US` |
| 46 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-noconfirm-sma25-rsi65` | n/a | 10777.21 | 1.9079 | 8885.10 | 55.44% | `US` |
| 47 | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | n/a | 7549.47 | 1.8985 | 4207.76 | 42.70% | `US` |
| 48 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-or-rsi2x10-sma25-rsi65` | n/a | 9282.62 | 1.8813 | 8528.21 | 54.83% | `US` |
| 49 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-rsi2only-sma25-rsi60` | n/a | 10795.55 | 1.8798 | 6773.61 | 54.61% | `US` |
| 50 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-rsi2only-sma25-rsi60` | n/a | 8355.66 | 1.7819 | 7191.14 | 54.85% | `US` |

注記: artifact の `strategy-ranking.json` には `composite_score` 列が含まれていなかったため、本表では `n/a` とした。

---

## Top 3 戦略

### 1位: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma15-rsi60`

- composite_score: `n/a` / markets: `US`
- avg_net_profit: `10,670.95` / avg_profit_factor: `2.5118` / avg_max_drawdown: `4,812.49`

**全銘柄の成績**

| 銘柄 | net_profit | profit_factor | max_drawdown | win_rate | trades |
|---|---:|---:|---:|---:|---:|
| `NVDA` | 108621.73 | 4.938 | 8570.46 | 65.71% | 35 |
| `META` | 47844.98 | 20.808 | 2735.68 | 73.91% | 23 |
| `TSLA` | 45606.00 | 3.170 | 8673.15 | 61.54% | 26 |
| `AVGO` | 24751.79 | 4.711 | 3223.45 | 66.67% | 27 |
| `LLY` | 23221.10 | 4.127 | 3736.63 | 70.83% | 24 |
| `AAPL` | 21906.47 | 4.852 | 2870.81 | 62.96% | 27 |
| `KWEB` | 18665.39 | 4.014 | 2988.49 | 71.43% | 21 |
| `AMD` | 15951.86 | 2.063 | 4635.45 | 55.56% | 27 |
| `QQQ` | 14494.81 | 4.032 | 1621.42 | 74.07% | 27 |
| `SMH` | 14126.49 | 2.481 | 3961.50 | 66.67% | 30 |
| `CRM` | 13561.53 | 4.510 | 3495.20 | 71.43% | 21 |
| `MSTR` | 11768.90 | 1.757 | 10866.43 | 40.91% | 22 |
| `MSFT` | 11252.40 | 2.119 | 3909.07 | 57.14% | 28 |
| `UBER` | 10919.98 | 2.204 | 7235.73 | 56.25% | 16 |
| `NFLX` | 9524.13 | 1.476 | 12408.00 | 60.71% | 28 |
| `BIDU` | 9501.97 | 2.027 | 3861.20 | 45.45% | 22 |
| `ARKK` | 9050.96 | 2.221 | 8303.60 | 61.11% | 18 |
| `GOOGL` | 8664.63 | 2.800 | 2436.78 | 63.64% | 22 |
| `AMZN` | 8242.73 | 2.350 | 3044.92 | 65.00% | 20 |
| `JPM` | 7296.51 | 1.742 | 5044.02 | 58.33% | 24 |
| `SOXX` | 6647.03 | 2.125 | 2239.00 | 62.96% | 27 |
| `SPY` | 6096.79 | 2.433 | 1841.22 | 59.26% | 27 |
| `PYPL` | 4882.80 | 1.518 | 5181.54 | 55.00% | 20 |
| `IBIT` | 2656.93 | 3.291 | 1159.93 | 75.00% | 4 |
| `PLTR` | 1440.69 | 1.229 | 6631.89 | 45.45% | 11 |
| `GLD` | 1089.43 | 1.280 | 2594.47 | 45.45% | 22 |
| `IWM` | 780.30 | 1.174 | 2792.47 | 48.15% | 27 |
| `DIS` | 777.31 | 1.102 | 5439.46 | 50.00% | 20 |
| `BA` | 0.00 | 0.000 | 0.00 | 0.00% | 0 |
| `QCOM` | -1467.13 | 0.788 | 3138.27 | 30.00% | 20 |
| `PANW` | -1737.98 | 0.832 | 4067.41 | 38.71% | 31 |
| `PFE` | -1796.63 | 0.750 | 4353.77 | 29.41% | 17 |
| `RIVN` | -1801.28 | 0.279 | 2736.65 | 20.00% | 5 |
| `NKE` | -1875.30 | 0.735 | 3854.74 | 42.86% | 21 |
| `ARM` | -2459.09 | 0.030 | 2634.40 | 25.00% | 4 |
| `COIN` | -2926.43 | 0.556 | 7387.92 | 72.73% | 11 |
| `INTC` | -2942.53 | 0.716 | 6685.06 | 34.48% | 29 |
| `MSOS` | -4874.01 | 0.000 | 4874.01 | 0.00% | 4 |
| `SNAP` | -4914.67 | 0.711 | 15552.64 | 50.00% | 18 |
| `SNOW` | -5712.78 | 0.011 | 5712.78 | 23.08% | 13 |

**他と比べて強かった点（同一市場平均との差で書く）**

- `avg_net_profit が US平均(10,281.69)より +389.26 (+3.79%) 高い`
- `avg_profit_factor が US平均(2.1246)より +0.3872 (+18.22%) 高く、判断基準「優秀」を満たす`
- `avg_max_drawdown が US平均(5,775.63)より -963.14 (-16.68%) 小さく、判断基準「優秀」に分類される`
- `銘柄集中度 — NVDA が全利益の 25.4% を占めており「優秀（最大1銘柄 < 30%）」に分類される`

---

### 2位: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma20-rsi60`

- composite_score: `n/a` / markets: `US`
- avg_net_profit: `10,710.59` / avg_profit_factor: `2.5048` / avg_max_drawdown: `4,831.81`

**他と比べて強かった点（同一市場平均との差で書く）**

- `avg_net_profit が US平均(10,281.69)より +428.90 (+4.17%) 高い`
- `avg_profit_factor が US平均(2.1246)より +0.3802 (+17.89%) 高く、判断基準「優秀」を満たす`
- `avg_max_drawdown が US平均(5,775.63)より -943.82 (-16.34%) 小さく、判断基準「優秀」に分類される`
- `銘柄集中度 — NVDA が全利益の 25.4% を占めており「優秀（最大1銘柄 < 30%）」に分類される`

---

### 3位: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi60`

- composite_score: `n/a` / markets: `US`
- avg_net_profit: `10,710.59` / avg_profit_factor: `2.5048` / avg_max_drawdown: `4,831.81`

**他と比べて強かった点（同一市場平均との差で書く）**

- `avg_net_profit が US平均(10,281.69)より +428.90 (+4.17%) 高い`
- `avg_profit_factor が US平均(2.1246)より +0.3802 (+17.89%) 高く、判断基準「優秀」を満たす`
- `avg_max_drawdown が US平均(5,775.63)より -943.82 (-16.34%) 小さく、判断基準「優秀」に分類される`
- `銘柄集中度 — NVDA が全利益の 25.4% を占めており「優秀（最大1銘柄 < 30%）」に分類される`

---

## 除外候補

| presetId | 分類 | 弱かった指標（平均との差） | 判断 |
|---|---|---|---|
| `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-or-rsi2x10-sma25-rsi65` | `即除外` | `avg_net_profit が US平均(10,281.69)より -999.07 (-9.72%) 低く、avg_profit_factor も -0.2433 (-11.45%) 低い。avg_max_drawdown は +2,752.58 (+47.66%) 大きく、判断基準「即除外」` | `除外候補` |
| `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-rsi2only-sma25-rsi60` | `即除外` | `avg_net_profit が US平均(10,281.69)より -1,926.03 (-18.73%) 低く、avg_profit_factor も -0.3427 (-16.13%) 低い。avg_max_drawdown は +1,415.51 (+24.51%) 大きく、判断基準「即除外」` | `除外候補` |

---

## 銘柄集中チェック

| presetId | 最大利益銘柄 | 集中度(%) | 判断基準分類 |
|---|---|---|---|
| `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma15-rsi60` | `NVDA (108,621.73)` | `25.4%` | `優秀（最大1銘柄 < 30%）` |
| `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma20-rsi60` | `NVDA (108,621.73)` | `25.4%` | `優秀（最大1銘柄 < 30%）` |
| `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi60` | `NVDA (108,621.73)` | `25.4%` | `優秀（最大1銘柄 < 30%）` |

---

## 改善点と次回バックテスト確認事項

1. **`sma15-rsi60` と `sma20-rsi60` の差分要因を切り分ける**  
   `1位 は 2位/3位 より avg_profit_factor が +0.0070、avg_max_drawdown が -19.32 改善している一方で、avg_net_profit は -39.64 低い。vix24 / vix28 を固定し、SMA 長さだけを 15 / 20 に切り替えた 4 本で trade list と signal count を比較し、PF 改善が偶然か entry timing 差かを確認する。`

2. **`noconfirm` 系の増益と DD 悪化の交換条件を定量化する**  
   `5位 の noconfirm は avg_net_profit 19,024.58 で US平均より +8,742.89 (+85.03%) 高いが、avg_max_drawdown は 8,477.77 で +2,702.14 (+46.79%) 悪化している。次回は同一 vix28 系で confirm / noconfirm の 2 本比較を行い、DD 増加 2,700 超を許容するだけの利益改善かを判定する。`

3. **baseline 2 本を recovery 上位と再比較して役割分担を固定する**  
   `profit-protect baseline 34位 は avg_profit_factor 2.0025 と最低限を維持しつつ avg_max_drawdown 3,670.61 で上位 3 本よりさらに低い。deep-pullback baseline 47位 は avg_net_profit 7,549.47 と弱いが avg_max_drawdown 4,207.76 は優秀だった。次回は recovery 本命 3 本に対し、baseline 2 本を「守り比較群」として固定し、増益と DD の交換比率を追跡する。`

4. **`rsi2only` と `vixpeak-or-rsi2x10` を縮小して探索枠を空ける**  
   `48位〜50位 は PF 1.7819〜1.8813、DD 6,773.61〜8,528.21 に沈み、US平均を明確に下回った。次回は `rsi2only-sma25-rsi60` と `vixpeak-or-rsi2x10-sma25-rsi65` 系を原則除外し、空いた 2〜4 枠を `sma15/20 + rsi60` 周辺の confirm 条件比較へ振り向ける。`

5. **次回比較指標を 4 本に固定して run71 由来のノイズを切る**  
   `run71 は partial、run72 は full 完走で前提条件が違うため、次回からは avg_net_profit / avg_profit_factor / avg_max_drawdown / 銘柄集中度 の 4 指標だけで継続比較する。特に run72 Top 3 の集中度 25.4% を基準値にし、30% を超えたら本命から外す運用ルールを試す。`
