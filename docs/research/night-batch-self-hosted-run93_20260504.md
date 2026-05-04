# Night Batch Self Hosted Run 93 — バックテスト結果まとめ

---

## ヘッダー

- run_id: `gha_25284212391_1`
- GHA run_number: `93`
- GHA run_id: `25284212391`
- round: `50`
- status: `SUCCESS`（workflow は成功。ただし派生戦略の metrics は読めていない）
- 実行日時: `2026-05-03T16:13:39Z` 〜 `2026-05-03T21:44:37Z`
- 対象市場: `US`（focus-8: MSTR / NVDA / BTCUSD / AAPL / TSLA / PLTR / QQQ / SPY）
- campaign_id: `emr-entry-quality-focus8-200pack`
- 目的: `EMA + MACD + RSI Strategy + SL を母体に、TP を使わず entry 条件・entry 前フィルタだけを変えた 10 family / 200 戦略で、ダマシ削減と期待値改善の候補を探索する`
- 戦略数: `200`
- 実行件数: `1003`（baseline 8件 + 派生199戦略 x 5件）
- compile/apply 成功: `1003 / 1003`
- metrics 読み取り成功: `8 / 1003`（baseline の 8銘柄のみ）
- metrics_unreadable: `995 / 1003`

---

## 結論

- **総合首位**: `ema-macd-rsi-sl-baseline` / composite_score `3` / avg_net_profit `534,109.93` / avg_profit_factor `1.905` / avg_max_drawdown `184,211.31`
- **US 本命**: 判定不可。metrics が読めたのは baseline のみで、派生199戦略は avg_net_profit / PF / DD がすべて `n/a`。
- **JP 本命**: 対象外。今回 run は US focus-8 のみ。
- **今回目的としていたものが見れたか**: **見れていない**。200戦略の compile/apply 成功可否は見れたが、目的である「entry 条件・entry 前フィルタ別の収益性比較」は、派生199戦略の Strategy Tester metrics が `metrics_unreadable` だったため評価不能。
- **結論として有望だったグループ**: **この run からは決められない**。唯一数値が読めた baseline は高収益だが BTCUSD 依存が 84.7% と極端で、entry 改善 family の優劣を示す材料にはならない。

---

## 判断基準（固定値）

| 指標 | 優秀 | 許容 | 要注意 | 即除外 |
|---|---|---|---|---|
| avg_profit_factor | >= 2.0 | 1.7〜2.0 | 1.5〜1.7 | < 1.5 |
| avg_max_drawdown | < 5,000 | 5,000〜6,200 | 6,200〜7,000 | > 7,000 |
| avg_win_rate | >= 45% | 40〜45% | 35〜40% | < 35% |
| 銘柄集中度 | 最大1銘柄 < 30% | 30〜50% | 50〜70% | >= 70% |

**市場別 平均値（有効 metrics のみ）**

| 市場 | 戦略数 | avg_net_profit 平均 | avg_profit_factor 平均 | avg_max_drawdown 平均 |
|---|---:|---:|---:|---:|
| US 専用 | 1 | 534,109.93 | 1.905 | 184,211.31 |
| JP 専用 | 0 | - | - | - |
| US+JP 両対応 | 0 | - | - | - |

**注意**: この平均は baseline 1戦略だけの値であり、200-pack 全体の比較基準としては使えない。

---

## 全戦略スコア一覧

composite_score は、metrics が存在する戦略だけで算出した。今回 metrics が読めたのは baseline のみなので、baseline の score は機械的に `3` になる。派生199戦略は composite 評価対象外。

| rank | presetId | composite_score | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | markets | metrics |
|---:|---|---:|---:|---:|---:|---:|---|---|
| 1 | `ema-macd-rsi-sl-baseline` | 3 | 534,109.93 | 1.905 | 184,211.31 | 36.99% | `US` | 8/8 |
| - | `emr-entry-base-*` ほか派生199戦略 | - | n/a | n/a | n/a | n/a | `US` | 0/995 |

**PF ランキング（artifact の公式順序）**

| artifact rank | presetId | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | success / runs |
|---:|---|---:|---:|---:|---:|---:|
| 1 | `ema-macd-rsi-sl-baseline` | 534,109.93 | 1.905 | 184,211.31 | 36.99% | 8 / 8 |
| 2〜200 | `emr-entry-*` 派生199戦略 | n/a | n/a | n/a | n/a | 995 / 995 |

---

## Family 別の実行状況

| family | 戦略数 | compile/apply 成功 | metrics 読み取り成功 | 判定 |
|---|---:|---:|---:|---|
| A Baseline/control | 1 | 8 / 8 | 8 | 数値あり。ただし BTCUSD 依存が極端 |
| A Baseline / sensitivity | 9 | 45 / 45 | 0 | 評価不能 |
| B Confluence | 25 | 125 / 125 | 0 | 評価不能 |
| C Delay / follow-through | 25 | 125 / 125 | 0 | 評価不能 |
| D Breakout structure | 25 | 125 / 125 | 0 | 評価不能 |
| E Trend / regime | 20 | 100 / 100 | 0 | 評価不能 |
| F Volume | 20 | 100 / 100 | 0 | 評価不能 |
| G Volatility quality | 20 | 100 / 100 | 0 | 評価不能 |
| H Extra momentum | 10 | 50 / 50 | 0 | 評価不能 |
| I Fakeout guard | 25 | 125 / 125 | 0 | 評価不能 |
| J Pullback resume | 20 | 100 / 100 | 0 | 評価不能 |

---

## Top 3 戦略

### 1位: `ema-macd-rsi-sl-baseline`

- composite_score: `3` / markets: `US`
- avg_net_profit: `534,109.93` / avg_profit_factor: `1.905` / avg_max_drawdown: `184,211.31`
- metrics: `8/8`

**全銘柄の成績**

| 銘柄 | net_profit | profit_factor | max_drawdown | win_rate | trades |
|---|---:|---:|---:|---:|---:|
| BTCUSD | 3,618,443.02 | 1.934 | 1,167,801.68 | 43.94% | 66 |
| NVDA | 328,029.39 | 1.947 | 125,726.33 | 37.04% | 54 |
| MSTR | 133,365.61 | 2.209 | 46,974.17 | 27.42% | 62 |
| TSLA | 122,888.86 | 1.570 | 110,243.02 | 29.09% | 55 |
| AAPL | 39,824.70 | 1.917 | 10,391.54 | 49.02% | 51 |
| QQQ | 16,802.90 | 2.054 | 5,580.25 | 43.14% | 51 |
| SPY | 9,494.65 | 2.319 | 2,120.83 | 47.06% | 51 |
| PLTR | 4,030.34 | 1.289 | 4,852.66 | 19.23% | 26 |

**他と比べて強かった点（同一市場の平均との差）**

- 比較可能な派生戦略が存在しないため、平均との差による優劣判定は不可。
- avg_profit_factor は 1.905 で判断基準「許容（1.7〜2.0）」。
- avg_max_drawdown は 184,211.31 で判断基準「即除外（>7,000）」に該当するが、BTCUSD の価格スケール影響が大きく、focus-8 混合集計では絶対値比較に注意が必要。
- 銘柄集中度は BTCUSD が全利益の 84.7% を占め、判断基準「即除外（>=70%）」。

### 2位: 判定不可

- 派生199戦略は compile/apply 成功だが、avg_net_profit / avg_profit_factor / avg_max_drawdown が `n/a`。
- Strategy Tester は開いたが、内部 API / DOM から metrics を読めていない。

### 3位: 判定不可

- 同上。今回 artifact から entry family 間の優劣は出せない。

---

## 除外候補

| presetId | 分類 | 弱かった指標（平均との差） | 判断 |
|---|---|---|---|
| `ema-macd-rsi-sl-baseline` | 集中リスク / DD 過大 | BTCUSD が全利益の 84.7%。avg_max_drawdown 184,211.31 は固定基準では即除外水準 | 採用候補ではなく control。BTCUSD 依存の分離が必要 |
| `emr-entry-*` 派生199戦略 | metrics_unreadable | 995 / 995 で収益・PF・DD が欠損 | 戦略内容では除外しない。再実行または metrics 読み取り修正が必要 |

---

## 銘柄集中チェック

| presetId | 最大利益銘柄 | 集中度(%) | top3 集中度(%) | 判断基準分類 |
|---|---|---:|---:|---|
| `ema-macd-rsi-sl-baseline` | BTCUSD (3,618,443.02) | 84.7% | 95.5% | 即除外（>=70%） |

**観察**: baseline の利益は BTCUSD にほぼ依存している。NVDA / MSTR も利益上位だが、BTCUSD を除いた時点で全体像が大きく変わるため、entry 改善の優劣を見る control としては不安定。

---

## 今回の主要発見

1. **目的の検証は未達**
   200-pack の主目的は entry 条件・entry 前フィルタの比較だったが、派生199戦略の metrics がすべて欠損したため、収益性比較はできていない。

2. **compile/apply の配線は通っている**
   派生199戦略 x 5銘柄の `995 / 995` は success。Pine のコンパイルやチャート追加ではなく、Strategy Tester metrics 読み取り側の問題が濃厚。

3. **baseline は高収益だが採用判断には不適**
   avg_net_profit は 534,109.93 と大きい一方、BTCUSD 集中度 84.7% と avg_max_drawdown 184,211.31 が大きく、entry 改善 family の比較対象としてはリスクが強い。

4. **focus-8 全銘柄ではなく派生戦略は5銘柄のみ実行**
   baseline は 8銘柄で metrics あり。派生戦略は各5銘柄の success が記録されており、BTCUSD / QQQ / SPY まで評価できた形跡がない。次回は universe 展開と checkpoint の対象銘柄も確認する必要がある。

---

## 改善点と次回バックテスト確認事項

1. **metrics_unreadable の再現条件を切り分ける**
   派生戦略1本（候補: `emr-entry-conf-score3-rsi50`）だけを MSTR / NVDA / AAPL で再実行し、Strategy Tester metrics が読めない原因が Pine 内容・TradingView UI・DOM/API 読み取りのどこにあるかを確認する。

2. **小さい代表 subset で再実行する**
   200本を再度 full で回す前に、各 family から1〜2本ずつ選んだ 10〜20本 subset を focus-8 で実行し、metrics 読み取り成功率が 100% になることを完了条件にする。

3. **BTCUSD 依存を分離する**
   baseline は BTCUSD が全利益の 84.7% を占めるため、次回比較は `focus-8 全体` と `BTCUSD 除外7銘柄` の2系統で avg_net_profit / PF / DD / concentration を分けて見る。

4. **派生戦略の対象銘柄不足を確認する**
   今回は派生戦略が各5銘柄で止まっている。campaign / checkpoint / worker failure budget を確認し、8銘柄すべてで結果が揃うまで composite ranking を作らない。

5. **有望グループ判定は次回に持ち越す**
   次回 run では family 別に avg_net_profit / avg_profit_factor / avg_max_drawdown / metrics success rate を出し、baseline を上回る family だけを候補化する。
