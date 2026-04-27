---

## ヘッダー

- run_id: `20260427_144835`
- status: `SUCCESS`
- 対象市場: `US`
- 目的: `strongest 基準に recovery reversal overlay を重ねた 9 variant が、baseline の tp25-27-tp100-50 と比べて収益性・PF・DD をどこまで改善するかを検証する`

---

## 結論

- **総合首位**: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi65` / composite_score `9` / avg_net_profit `20,661.38` / avg_profit_factor `1.6352`
- **US 本命**: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi65` / avg_net_profit `19,224.34` / avg_profit_factor `1.6315`
- **JP 本命**: `対象なし` / avg_net_profit `対象なし` / avg_profit_factor `対象なし`
- **ざっくり判断**: composite 首位は `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi65` だが avg_max_drawdown 7,470.70 が「即除外」閾値を超える。採用候補としては DD が 5,821.67 に収まり、集中度も 27.8% で優秀な `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi65` が最も扱いやすい。一方で 10 戦略すべて avg_profit_factor < 1.7 のため、固定基準では pack 全体がまだ「要注意〜即除外」帯にある。

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
| US 専用 | 10 | 18,509.32 | 1.5606 | 6,959.36 |
| JP 専用 | 0 | 対象なし | 対象なし | 対象なし |
| US+JP 両対応 | 0 | 対象なし | 対象なし | 対象なし |

---

## 全戦略スコア一覧

| rank | presetId | composite_score | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | markets |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi65` | 9 | 20,661.38 | 1.6352 | 7,470.70 | 48.55% | `US` |
| 2 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi65` | 9 | 19,224.34 | 1.6315 | 5,821.67 | 47.26% | `US` |
| 3 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi65` | 12 | 20,661.38 | 1.6352 | 7,470.70 | 48.55% | `US` |
| 4 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi60` | 12 | 19,173.64 | 1.6205 | 6,165.56 | 50.11% | `US` |
| 5 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi45-vixpeak-sma25-rsi65` | 17 | 20,149.94 | 1.5806 | 7,799.20 | 49.67% | `US` |
| 6 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma25-rsi65` | 18 | 18,937.58 | 1.5682 | 7,027.70 | 47.06% | `US` |
| 7 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-rsi2x10-sma25-rsi65` | 19 | 18,017.47 | 1.5014 | 6,908.37 | 45.47% | `US` |
| 8 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi35-vixpeak-sma25-rsi65` | 20 | 16,666.64 | 1.5311 | 7,027.34 | 46.96% | `US` |
| 9 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50` | 21 | 14,936.89 | 1.4489 | 5,403.26 | 44.12% | `US` |
| 10 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2x10-sma25-rsi65` | 28 | 16,663.90 | 1.4530 | 8,499.08 | 49.20% | `US` |

---

## Top 3 戦略

### 1位: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi65`

- composite_score: `9` / markets: `US`
- avg_net_profit: `20,661.38` / avg_profit_factor: `1.6352` / avg_max_drawdown: `7,470.70`

**他と比べて強かった点（同一市場平均との差で書く）**

- avg_net_profit が US平均(18,509.32)より +2,152.06 (+11.63%) 高い
- avg_profit_factor が US平均(1.5606)より +0.0746 (+4.78%) 高いが、判断基準「要注意」に分類される
- avg_max_drawdown が US平均(6,959.36)より +511.34 (+7.35%) 大きく、判断基準「即除外」に分類される
- 銘柄集中度 — TSLA が全利益の 30.6% を占めており「許容（30〜50%）」に分類される

---

### 2位: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi65`

- composite_score: `9` / markets: `US`
- avg_net_profit: `19,224.34` / avg_profit_factor: `1.6315` / avg_max_drawdown: `5,821.67`

**他と比べて強かった点（同一市場平均との差で書く）**

- avg_net_profit が US平均(18,509.32)より +715.02 (+3.86%) 高い
- avg_profit_factor が US平均(1.5606)より +0.0709 (+4.55%) 高いが、判断基準「要注意」に分類される
- avg_max_drawdown が US平均(6,959.36)より -1,137.69 (-16.35%) 小さく、判断基準「許容」に分類される
- 銘柄集中度 — TSLA が全利益の 27.8% で「優秀（最大1銘柄 < 30%）」に分類される

---

### 3位: `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi65`

- composite_score: `12` / markets: `US`
- avg_net_profit: `20,661.38` / avg_profit_factor: `1.6352` / avg_max_drawdown: `7,470.70`

**他と比べて強かった点（同一市場平均との差で書く）**

- avg_net_profit が US平均(18,509.32)より +2,152.06 (+11.63%) 高い
- avg_profit_factor が US平均(1.5606)より +0.0746 (+4.78%) 高いが、判断基準「要注意」に分類される
- avg_max_drawdown が US平均(6,959.36)より +511.34 (+7.35%) 大きく、判断基準「即除外」に分類される
- 銘柄集中度 — TSLA が全利益の 30.6% を占めており「許容（30〜50%）」に分類される

---

## 除外候補

| presetId | 分類 | 弱かった指標（平均との差） | 判断 |
|---|---|---|---|
| `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-rsi2x10-sma25-rsi65` | `即除外` | `avg_profit_factor が US平均(1.5606)より -0.1076 (-6.89%) 低く「即除外」、avg_max_drawdown も US平均(6,959.36)より +1,539.72 (+22.12%) 大きく「即除外」` | `除外候補` |
| `donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50` | `即除外` | `avg_net_profit が US平均(18,509.32)より -3,572.43 (-19.30%) 低く、avg_profit_factor も -0.1117 (-7.16%) 下振れて「即除外」` | `除外候補` |

---

## 銘柄集中チェック

| presetId | 最大利益銘柄 | 集中度(%) | 判断基準分類 |
|---|---|---|---|
| `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi65` | `TSLA (189,481.22)` | `30.6%` | `許容（30〜50%）` |
| `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi65` | `TSLA (160,481.20)` | `27.8%` | `優秀（最大1銘柄 < 30%）` |
| `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi65` | `TSLA (189,481.22)` | `30.6%` | `許容（30〜50%）` |

---

## 改善点と次回バックテスト確認事項

1. **SMA20 と SMA25 の実効差分確認**  
   `1位 (donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma20-rsi65) と 3位 (donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix20-rsi40-vixpeak-sma25-rsi65) は avg_net_profit 20,661.38 / avg_profit_factor 1.6352 / avg_max_drawdown 7,470.70 が完全一致した。SMA20 と SMA25 の切替が実際に注文ロジックへ効いているかを、同一 40 銘柄でシグナル件数と約定履歴を比較して確認する。差分が出なければ preset 軸として統合する。`

2. **recovery overlay の純増効果を baseline と比較**  
   `US 本命 (donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma25-rsi65) は baseline (donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50) より avg_net_profit が +4,287.45 (+28.70%)、avg_profit_factor が +0.1826 (+12.60%) 改善した。次回は recovery 条件だけを ON/OFF した 2 本比較で、改善分がどの銘柄群から来ているかを切り分ける。`

3. **DD 7,000 超の抑制検証**  
   `Top 5 のうち 1位 / 3位 / 5位 は avg_max_drawdown が 7,470.70〜7,799.20 で「即除外」に入った。次回は VIX 閾値または recovery exit 条件だけを tighten した variant を 3 本追加し、avg_net_profit 19,000 超を維持したまま DD を 7,000 未満へ戻せるかを確認する。`

4. **TSLA 依存の健全性確認**  
   `Top 3 の最大利益銘柄はすべて TSLA で、集中度は 30.6% / 27.8% / 30.6% だった。分類上は許容〜優秀だが寄与銘柄が固定なので、TSLA を除いた 39 銘柄で再集計し、US 本命の avg_net_profit が US平均を維持できるかを確認する。`

5. **RSI2x10 派生の取捨選別**  
   `RSI2x10 を含む 7位 と 10位 は composite_score 19 / 28 で、10位は avg_max_drawdown 8,499.08 の「即除外」だった。次回は RSI2x10 entry と vixpeak 条件を別々に外した A/B を実施し、PF 改善がない側は preset 候補から外す。`
