---

## ヘッダー

- run_id: `20260428_010338`
- status: `FAILED`
- 対象市場: `US`
- 目的: `run70 の改善点を 50 strategies × 40 symbols の US40 campaign で深掘りし、SMA parity / confirm slicing / DD suppression / RSI2x10 ablation を一括比較する`

---

## 結論

- **総合首位**: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi65` / composite_score `21` / avg_net_profit `19,224.34` / avg_profit_factor `1.6315`
- **US 本命**: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi65` / avg_net_profit `19,224.34` / avg_profit_factor `1.6315`
- **JP 本命**: `対象なし` / avg_net_profit `対象なし` / avg_profit_factor `対象なし`
- **ざっくり判断**: run71 は workflow timeout で full 完走前に停止したが、`checkpoint-1730.json` から `1730 / 2000 runs` の途中結果を回収できた。比較対象は `43戦略完走 + 1戦略途中(10/40)` で、途中戦略 `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-and-rsi2x10-sma20-rsi65` は ranking から除外した。暫定順位では `vix28 + vixpeak + sma20/25 + rsi65` 系が DD と集中度のバランスで最も安定し、run70 で疑っていた `SMA20/SMA25` 差は今回も実効差を確認できなかった。一方で `sma15-rsi60/62` は DD 抑制候補として上位化し、`RSI2x10 / rsi2only / noconfirm / or-confirm` は下位に沈んだ。

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
| US 専用 | 43 | 18,291.49 | 1.5586 | 6,749.34 |
| JP 専用 | 0 | 対象なし | 対象なし | 対象なし |
| US+JP 両対応 | 0 | 対象なし | 対象なし | 対象なし |

---

## 全戦略スコア一覧

| rank | presetId | composite_score | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | markets |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi65` | 21 | 19,224.34 | 1.6315 | 5,821.67 | 47.26% | `US` |
| 2 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi65` | 24 | 19,224.34 | 1.6315 | 5,821.67 | 47.26% | `US` |
| 3 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi62` | 34 | 19,979.67 | 1.6256 | 6,546.83 | 49.21% | `US` |
| 4 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi60` | 35 | 19,173.64 | 1.6205 | 6,165.56 | 50.11% | `US` |
| 5 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi65` | 36 | 20,661.38 | 1.6352 | 7,470.70 | 48.55% | `US` |
| 6 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi62` | 37 | 19,979.67 | 1.6256 | 6,546.83 | 49.21% | `US` |
| 7 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi60` | 38 | 19,173.64 | 1.6205 | 6,165.56 | 50.11% | `US` |
| 8 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi65` | 39 | 20,661.38 | 1.6352 | 7,470.70 | 48.55% | `US` |
| 9 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma15-rsi60` | 39 | 18,869.90 | 1.6120 | 5,680.39 | 47.77% | `US` |
| 10 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi62` | 40 | 19,979.67 | 1.6256 | 6,546.83 | 49.21% | `US` |
| 11 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma15-rsi62` | 40 | 18,543.86 | 1.6035 | 5,652.32 | 47.59% | `US` |
| 12 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi60` | 41 | 19,173.64 | 1.6205 | 6,165.56 | 50.11% | `US` |
| 13 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi60` | 42 | 18,869.90 | 1.6120 | 5,680.39 | 47.77% | `US` |
| 14 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi62` | 43 | 18,543.86 | 1.6035 | 5,652.32 | 47.59% | `US` |
| 15 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi62` | 46 | 18,543.86 | 1.6035 | 5,652.32 | 47.59% | `US` |
| 16 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma15-rsi60` | 48 | 19,096.37 | 1.5834 | 6,018.76 | 48.02% | `US` |
| 17 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-rsi2only-sma25-rsi65` | 50 | 20,868.14 | 1.5905 | 7,371.31 | 48.60% | `US` |
| 18 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma20-rsi60` | 51 | 19,096.37 | 1.5834 | 6,018.76 | 48.02% | `US` |
| 19 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma15-rsi62` | 54 | 19,010.50 | 1.5880 | 6,370.16 | 47.97% | `US` |
| 20 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma20-rsi62` | 57 | 19,010.50 | 1.5880 | 6,370.16 | 47.97% | `US` |
| 21 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma25-rsi62` | 60 | 19,010.50 | 1.5880 | 6,370.16 | 47.97% | `US` |
| 22 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-or-rsi2x10-sma25-rsi65` | 60 | 17,896.67 | 1.5991 | 6,026.91 | 46.88% | `US` |
| 23 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi45-vixpeak-sma20-rsi65` | 63 | 20,149.94 | 1.5806 | 7,799.20 | 49.67% | `US` |
| 24 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-or-rsi2x10-sma25-rsi65` | 65 | 20,058.51 | 1.5645 | 7,329.25 | 48.85% | `US` |
| 25 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi45-vixpeak-sma25-rsi65` | 66 | 20,149.94 | 1.5806 | 7,799.20 | 49.67% | `US` |
| 26 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-and-rsi2x10-sma25-rsi65` | 68 | 17,173.73 | 1.4902 | 5,491.62 | 44.71% | `US` |
| 27 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-rsi2only-sma25-rsi65` | 74 | 16,545.38 | 1.5722 | 5,991.69 | 46.52% | `US` |
| 28 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma20-rsi65` | 75 | 18,937.58 | 1.5682 | 7,027.70 | 47.06% | `US` |
| 29 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma25-rsi65` | 78 | 18,937.58 | 1.5682 | 7,027.70 | 47.06% | `US` |
| 30 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-and-rsi2x10-sma25-rsi65` | 84 | 18,017.47 | 1.5014 | 6,908.37 | 45.47% | `US` |
| 31 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50` | 85 | 14,936.89 | 1.4489 | 5,403.26 | 44.12% | `US` |
| 32 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-rsi2x10-sma25-rsi65` | 87 | 18,017.47 | 1.5014 | 6,908.37 | 45.47% | `US` |
| 33 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi35-vixpeak-sma25-rsi60` | 90 | 12,996.65 | 1.4613 | 5,929.33 | 46.86% | `US` |
| 34 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-and-rsi2x10-sma25-rsi65` | 91 | 17,558.81 | 1.4813 | 6,849.41 | 44.91% | `US` |
| 35 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi35-vixpeak-sma25-rsi65` | 91 | 16,666.64 | 1.5311 | 7,027.34 | 46.96% | `US` |
| 36 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi35-vixpeak-sma20-rsi65` | 96 | 13,685.86 | 1.4752 | 6,280.12 | 46.48% | `US` |
| 37 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-noconfirm-sma25-rsi65` | 101 | 18,009.54 | 1.4901 | 8,053.62 | 50.12% | `US` |
| 38 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-noconfirm-sma25-rsi65` | 105 | 16,448.16 | 1.5122 | 7,595.65 | 47.11% | `US` |
| 39 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-noconfirm-sma25-rsi65` | 113 | 17,210.85 | 1.4560 | 9,240.97 | 51.43% | `US` |
| 40 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2only-sma20-rsi65` | 114 | 16,663.90 | 1.4530 | 8,499.08 | 49.20% | `US` |
| 41 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2only-sma25-rsi65` | 117 | 16,663.90 | 1.4530 | 8,499.08 | 49.20% | `US` |
| 42 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2x10-sma25-rsi65` | 120 | 16,663.90 | 1.4530 | 8,499.08 | 49.20% | `US` |
| 43 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-or-rsi2x10-sma25-rsi65` | 120 | 16,449.70 | 1.4497 | 8,475.75 | 49.58% | `US` |

注記: `checkpoint-1730` 時点で `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-and-rsi2x10-sma20-rsi65` は `10/40` の途中だったため、暫定 ranking から除外した。

---

## Top 3 戦略

### 1位: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi65`

- composite_score: `21` / markets: `US`
- avg_net_profit: `19,224.34` / avg_profit_factor: `1.6315` / avg_max_drawdown: `5,821.67`

**他と比べて強かった点（同一市場平均との差で書く）**

- `avg_net_profit が US平均(18,291.49)より +932.85 (+5.10%) 高い`
- `avg_profit_factor が US平均(1.5586)より +0.0729 (+4.68%) 高いが、判断基準は「要注意」に留まる`
- `avg_max_drawdown が US平均(6,749.34)より -927.67 (-13.74%) 小さく、判断基準「許容」に分類される`
- `銘柄集中度 — TSLA が全利益の 27.8% を占めており「優秀（最大1銘柄 < 30%）」に分類される`

---

### 2位: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi65`

- composite_score: `24` / markets: `US`
- avg_net_profit: `19,224.34` / avg_profit_factor: `1.6315` / avg_max_drawdown: `5,821.67`

**他と比べて強かった点（同一市場平均との差で書く）**

- `avg_net_profit が US平均(18,291.49)より +932.85 (+5.10%) 高い`
- `avg_profit_factor が US平均(1.5586)より +0.0729 (+4.68%) 高いが、判断基準は「要注意」に留まる`
- `avg_max_drawdown が US平均(6,749.34)より -927.67 (-13.74%) 小さく、判断基準「許容」に分類される`
- `銘柄集中度 — TSLA が全利益の 27.8% を占めており「優秀（最大1銘柄 < 30%）」に分類される`

---

### 3位: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi62`

- composite_score: `34` / markets: `US`
- avg_net_profit: `19,979.67` / avg_profit_factor: `1.6256` / avg_max_drawdown: `6,546.83`

**他と比べて強かった点（同一市場平均との差で書く）**

- `avg_net_profit が US平均(18,291.49)より +1,688.18 (+9.23%) 高い`
- `avg_profit_factor が US平均(1.5586)より +0.0670 (+4.30%) 高いが、判断基準は「要注意」に留まる`
- `avg_max_drawdown が US平均(6,749.34)より -202.51 (-3.00%) 小さく、判断基準「要注意」に分類される`
- `銘柄集中度 — TSLA が全利益の 31.5% を占めており「許容（30〜50%）」に分類される`

---

## 除外候補

| presetId | 分類 | 弱かった指標（平均との差） | 判断 |
|---|---|---|---|
| `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-or-rsi2x10-sma25-rsi65` | `即除外` | `avg_net_profit が US平均(18,291.49)より -1,841.79 (-10.07%) 低く、avg_profit_factor も -0.1089 (-6.99%) 下振れて「即除外」、avg_max_drawdown は +1,726.41 (+25.58%) 大きく「即除外」` | `除外候補` |
| `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2x10-sma25-rsi65` | `即除外` | `avg_net_profit が US平均(18,291.49)より -1,627.59 (-8.90%) 低く、avg_profit_factor も -0.1056 (-6.78%) 下振れて「即除外」、avg_max_drawdown は +1,749.74 (+25.92%) 大きく「即除外」` | `除外候補` |

---

## 銘柄集中チェック

| presetId | 最大利益銘柄 | 集中度(%) | 判断基準分類 |
|---|---|---|---|
| `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi65` | `TSLA (160,481.20)` | `27.8%` | `優秀（最大1銘柄 < 30%）` |
| `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi65` | `TSLA (160,481.20)` | `27.8%` | `優秀（最大1銘柄 < 30%）` |
| `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma15-rsi62` | `TSLA (188,667.97)` | `31.5%` | `許容（30〜50%）` |

---

## 改善点と次回バックテスト確認事項

1. **SMA20 / SMA25 の統合可否を確定する**  
   `1位 と 2位 は avg_net_profit 19,224.34 / avg_profit_factor 1.6315 / avg_max_drawdown 5,821.67 が完全一致し、5位 と 8位 も avg_net_profit 20,661.38 / avg_profit_factor 1.6352 / avg_max_drawdown 7,470.70 が完全一致した。次回は vix20 系と vix28 系で SMA20/SMA25 だけを切り替えた 4 本の signal count と trade list を比較し、差分 0 が再現されるなら preset 軸から統合する。`

2. **DD suppression 候補を `sma15-rsi60/62` に絞って詰める**  
   `3位 と 4位 の sma15 系は avg_net_profit 19,979.67 / 19,173.64 を維持しながら avg_max_drawdown 6,546.83 / 6,165.56 まで抑え、5位 の sma20-rsi65 (7,470.70) より DD を -923.87 / -1,305.14 改善した。次回は vix20 固定で sma15-rsi60 と sma15-rsi62 を baseline 2 本として、exit 条件だけを追加で tighten して DD 7,000 未満を安定維持できるか確認する。`

3. **recovery overlay の純増効果を baseline 31位と再比較する**  
   `暫定1位 は baseline (31位, avg_net_profit 14,936.89 / avg_profit_factor 1.4489 / avg_max_drawdown 5,403.26) より avg_net_profit +4,287.45 (+28.70%)、avg_profit_factor +0.1826 (+12.60%) 改善した一方、avg_max_drawdown は +418.41 (+7.74%) 悪化した。次回は vix28 + vixpeak 本命系で recovery ON/OFF の 2 本比較を行い、増益分が DD 悪化を上回るかを再確認する。`

4. **RSI2x10 / rsi2only / noconfirm / or-confirm を棚卸しする**  
   `下位 5 本のうち 39位〜43位 は noconfirm / rsi2only / rsi2x10 / vixpeak-or-rsi2x10 が占め、avg_profit_factor は 1.4497〜1.4560、avg_max_drawdown は 8,475.75〜9,240.97 に沈んだ。次回は同系列をまとめて再走するのではなく、vixpeak-and-rsi2x10 (30位, PF 1.5014, DD 6,908.37) だけを残し、他は除外候補として整理する。`

5. **未完 1 戦略を含む Cohort E を timeout 修正後に完走させる**  
   run71 は checkpoint-1730 で止まり、`donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-and-rsi2x10-sma20-rsi65` が 10/40 の途中だった。timeout-minutes 540 反映後の再実行では、まず full 50戦略すべてで strategy-ranking と recovered-summary を生成し、今回の暫定 Top 3 が Cohort E 完走後も維持されるかを確認する。
