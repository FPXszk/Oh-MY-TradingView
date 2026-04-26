# Night Batch Self Hosted — Run 68 結果レポート

## 概要

| 項目 | 値 |
|---|---|
| workflow | `Night Batch Self Hosted` |
| branch | `main` |
| run_number | 68 |
| run_id | `24953124968` |
| 実行開始 | `2026-04-26 18:17:15 JST` |
| 実行完了 | `2026-04-26 19:38:23 JST` |
| workflow 結果 | **success** |
| backtest 結果 | **success** (`gha_24953124968_1-summary.json` / `recovered-summary.json` 上で確認) |
| artifact | `night-batch-24953124968-1` |

**結論: run68 も main run は success。**  
`strongest-vs-profit-protect-tp1-focus-us40-10pack` は workflow / artifact summary の両方で成功し、smoke 10 + full 400 を 0 failure で完走しました。

---

## artifact ベースの結果サマリー

`night-batch/round32/gha_24953124968_1-summary.json` から取得した主要フィールド:

| フィールド | 値 | 説明 |
|---|---|---|
| `success` | `true` | `night_batch.py smoke-prod` は正常完了 |
| `termination_reason` | `success` | Python ランタイムは成功終了 |
| `failed_step` | `startup-check` | artifact 契約上の記録。workflow failure を意味しない |
| `last_checkpoint` | `artifacts/campaigns/strongest-vs-profit-protect-tp1-focus-us40-10pack/full/checkpoint-400.json` | 最新 checkpoint |
| `round` | `32` | round-manifest 上の実行ラウンド |
| `command` | `smoke-prod` | 実行コマンド |
| `host` | `172.31.144.1` | 実行ホスト |
| `port` | `9223` | WSL 側 CDP ブリッジポート |

### Steps

| step | success | skipped | exit_code | timed_out | latest_checkpoint |
| --- | --- | --- | ---: | --- | --- |
| startup-check | False | False | 1 | False | — |
| launch | False | True | 1 | False | — |
| preflight | True | False | 0 | False | — |
| smoke | True | False | 0 | False | `artifacts/campaigns/strongest-vs-profit-protect-tp1-focus-us40-10pack/smoke/checkpoint-10.json` |
| production | True | False | 0 | False | `artifacts/campaigns/strongest-vs-profit-protect-tp1-focus-us40-10pack/full/checkpoint-400.json` |

### 読み方

- `startup-check` が `False` でも、これは最初の probe で既存 visible instance を掴めなかったことを示すだけです。
- 今回も `launch` は `skipped: true` ですが、その後の `preflight` と本番実行が通っているため workflow は正常継続できています。
- `success: true` と `termination_reason: success` が揃っているので、run68 は成功扱いで問題ありません。

---

## smoke テストの確認

今回の smoke は `strongest-vs-profit-protect-tp1-focus-us40-10pack` campaign の **SPY 1 銘柄 × 10 戦略 = 10 runs** でした。

summary の captured lines で確認できた内容:

- `Phase: smoke`
- `Strategies: 10`
- `Symbols: 1`
- `Date range: 2015-01-01 → 2025-12-31`
- `Total runs: 10`
- `Success: 10 / Failure: 0 / Unreadable: 0`

smoke は全戦略が通過しています。

---

## production の確認

full phase は `strongest-vs-profit-protect-tp1-focus-us40-10pack` の **40 銘柄 × 10 戦略 = 400 runs** です。

log と `recovered-summary.json` から確認できる production 最終集計:

- `Success: 400`
- `Failure: 0`
- `Unreadable: 0`
- `Total: 400`

今回の重要点は、**run67 で強かった `tp25-25` を基点に、TP1 発動位置と TP1 比率の細分化を直接比較できたこと**です。

戦略別の execution 集計は以下です。

| strategy | total seen | success | failure | 読み方 |
|---|---:|---:|---:|---|
| `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp22-25-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp27-25-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp25-20-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp25-30-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp25-33-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |

---

## TP1 focus 10pack の比較軸

今回の 10pack は、**strongest 非TP基準 1 本**、**run67 既存上位群 3 本**、**TP1 発動位置比較 2 本**、**TP1 比率比較 3 本**、**profit-protect 基準線 1 本**を同一 US40 universe で比較するセットでした。

| strategy | 位置づけ |
|---|---|
| `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | strongest 非TP基準 |
| `tp30-25-tp100-50` | profit-protect 基準線 |
| `tp22-25-tp100-50` | TP1 発動を 22% に前倒し |
| `tp27-25-tp100-50` | TP1 発動を 27% に後ろ寄せ |
| `tp25-20-tp100-50` | TP1 比率を 20% に軽く |
| `tp25-25-tp100-50` | run67 首位 |
| `tp25-30-tp100-50` | TP1 比率を 30% に重く |
| `tp25-33-tp100-50` | TP1 比率を 33% に重く |
| `tp30-20-tp100-50` | run67 上位の比較残し |
| `tp30-33-tp100-50` | run67 上位の比較残し |

---

## 何が分かったか

今回の比較で最も重要なのは、**「TP1 を 25% 付近で早めに発動し、利確比率を 30% から 33% へ重くした案」が最も良かった**ことです。

比較すると:

- strongest 非TP基準は **7 位**
- 1 位は `tp25-33-tp100-50`
- 2 位は `tp25-30-tp100-50`
- 3 位は `tp25-20-tp100-50`
- run67 首位 `tp25-25-tp100-50` は **4 位**

ただし strongest 非TP基準と 1 位の差は次の通りです。

| 項目 | 1位 `tp25-33-tp100-50` | strongest 非TP基準 | 差分 |
|---|---:|---:|---:|
| avg net profit | 12426.41 | 13063.48 | **-637.07** |
| avg profit factor | 1.479 | 1.460 | **+0.019** |
| avg max drawdown | 4670.98 | 4827.14 | **-156.16** |
| avg win rate | 44.62% | 42.82% | **+1.80pt** |

また、run67 首位 `tp25-25-tp100-50` と比べると:

| 項目 | 1位 `tp25-33-tp100-50` | `tp25-25-tp100-50` | 差分 |
|---|---:|---:|---:|
| avg net profit | 12426.41 | 12858.23 | **-431.82** |
| avg profit factor | 1.479 | 1.468 | **+0.011** |
| avg max drawdown | 4670.98 | 4803.22 | **-132.24** |
| avg win rate | 44.62% | 44.51% | **+0.11pt** |

短く言うと、**run68 の首位案は net profit を少し削る代わりに、PF と drawdown をより明確に改善した**、という形です。

---

## performance ランキング

`artifacts/campaigns/strongest-vs-profit-protect-tp1-focus-us40-10pack/full/strategy-ranking.md` から、full 40 銘柄の性能比較を確認できます。

| rank | strategy | avg net profit | avg profit factor | avg max drawdown | avg win rate | success / runs |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | `donchian-60-20-rsp-rsi14-regime60-tp25-33-tp100-50` | 12426.41 | 1.479 | 4670.98 | 44.62% | 40 / 40 |
| 2 | `donchian-60-20-rsp-rsi14-regime60-tp25-30-tp100-50` | 11908.82 | 1.474 | 4589.19 | 44.58% | 40 / 40 |
| 3 | `donchian-60-20-rsp-rsi14-regime60-tp25-20-tp100-50` | 12109.02 | 1.471 | 4590.81 | 44.68% | 40 / 40 |
| 4 | `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50` | 12858.23 | 1.468 | 4803.22 | 44.51% | 40 / 40 |
| 5 | `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50` | 12289.95 | 1.463 | 4687.08 | 43.93% | 40 / 40 |
| 6 | `donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50` | 12104.69 | 1.462 | 4604.94 | 44.00% | 40 / 40 |
| 7 | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 13063.48 | 1.460 | 4827.14 | 42.82% | 40 / 40 |
| 8 | `donchian-60-20-rsp-rsi14-regime60-tp22-25-tp100-50` | 11501.80 | 1.457 | 4601.15 | 44.91% | 40 / 40 |
| 9 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50` | 11656.58 | 1.456 | 4566.85 | 43.85% | 40 / 40 |
| 10 | `donchian-60-20-rsp-rsi14-regime60-tp27-25-tp100-50` | 11409.36 | 1.453 | 4568.75 | 44.13% | 40 / 40 |

### 結論

- **総合首位**: `donchian-60-20-rsp-rsi14-regime60-tp25-33-tp100-50`
- **run67 首位 `tp25-25` は 4 位へ後退**し、TP1 比率を厚くした 2 本がその上に来た
- **strongest 非TP基準は 7 位**で、今回は PF 基準ではかなり後ろに下がった
- **ただし net profit 単独では strongest 非TP基準が最大**: 1 位との差は `637.07`
- **TP1 発動 25% は妥当、発動位置の前後調整は弱め**: `tp22-25` は 8 位、`tp27-25` は 10 位

この ranking は `avg profit factor` 降順を最優先に、次に `avg net profit` 降順、最後に `avg max drawdown` 昇順で並ぶ deterministic な順位として読むのが妥当です。

---

## Top 5 戦略の中身

### `donchian-60-20-rsp-rsi14-regime60-tp25-33-tp100-50`

- avg_net_profit: `12426.41`
- avg_profit_factor: `1.479`
- avg_max_drawdown: `4670.98`
- avg_win_rate: `44.62`
- 上振れ銘柄: `TSLA 171310.31`, `NVDA 111880.26`, `AAPL 36782.13`
- 下振れ銘柄: `INTC -6938.33`, `NKE -3470.36`, `BA -3127.18`

### `donchian-60-20-rsp-rsi14-regime60-tp25-30-tp100-50`

- avg_net_profit: `11908.82`
- avg_profit_factor: `1.474`
- avg_max_drawdown: `4589.19`
- avg_win_rate: `44.58`
- 上振れ銘柄: `TSLA 155766.92`, `NVDA 108859.70`, `AAPL 36424.75`
- 下振れ銘柄: `INTC -6756.71`, `NKE -3470.36`, `BA -3127.18`

### `donchian-60-20-rsp-rsi14-regime60-tp25-20-tp100-50`

- avg_net_profit: `12109.02`
- avg_profit_factor: `1.471`
- avg_max_drawdown: `4590.81`
- avg_win_rate: `44.68`
- 上振れ銘柄: `TSLA 164715.68`, `NVDA 105849.53`, `AAPL 36666.16`
- 下振れ銘柄: `INTC -6922.36`, `NKE -3470.36`, `BA -3127.18`

### `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50`

- avg_net_profit: `12858.23`
- avg_profit_factor: `1.468`
- avg_max_drawdown: `4803.22`
- avg_win_rate: `44.51`
- 上振れ銘柄: `TSLA 201375.46`, `NVDA 100133.05`, `AAPL 36702.82`
- 下振れ銘柄: `INTC -6800.78`, `NKE -3470.36`, `BA -3127.18`

### `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50`

- avg_net_profit: `12289.95`
- avg_profit_factor: `1.463`
- avg_max_drawdown: `4687.08`
- avg_win_rate: `43.93`
- 上振れ銘柄: `TSLA 174091.37`, `NVDA 113130.15`, `AAPL 37884.85`
- 下振れ銘柄: `INTC -6711.81`, `NKE -3470.36`, `BA -3127.18`

---

## 銘柄横断で見えた傾向

40 銘柄の各戦略結果を横断すると、平均 net profit の上位と下位は次のとおり。

### 上位 5 銘柄

| rank | symbol | avg net profit | best variant | best net | spread |
| ---: | --- | ---: | --- | ---: | ---: |
| 1 | `TSLA` | 171060.53 | `strongest 非TP基準` | 212676.73 | 61732.78 |
| 2 | `NVDA` | 106129.20 | `...tp30-33-tp100-50` | 113130.15 | 18545.46 |
| 3 | `AAPL` | 36937.01 | `...tp30-33-tp100-50` | 37884.85 | 1779.02 |
| 4 | `AMD` | 23581.16 | `...tp25-25-tp100-50` | 27110.00 | 7408.98 |
| 5 | `AVGO` | 22701.86 | `...tp27-25-tp100-50` | 23462.65 | 1560.70 |

### 下位 5 銘柄

| rank | symbol | avg net profit | best variant | best net | spread |
| ---: | --- | ---: | --- | ---: | ---: |
| 36 | `T` | -1129.31 | `strongest 非TP基準` | -1129.31 | 0.00 |
| 37 | `WBA` | -1637.56 | `strongest 非TP基準` | -1637.56 | 0.00 |
| 38 | `BA` | -3127.18 | `strongest 非TP基準` | -3127.18 | 0.00 |
| 39 | `NKE` | -3433.86 | `...tp22-25-tp100-50` | -3105.37 | 364.99 |
| 40 | `INTC` | -6789.09 | `...tp30-33-tp100-50` | -6711.81 | 226.52 |

短く言うと、今回も **大型 winner をどう守るか**が主戦場ですが、run67 よりも **TP1 比率の調整が PF 改善に効く**ことがかなりはっきりしました。

---

## ここで何が強かったか

### execution 観点

**全 10 戦略が首位タイ**で、実行安定性に差は出ていません。

### performance 観点

今回の重要な発見は次の 4 点です。

1. **TP1 発動位置 25% 付近は維持でよさそう**  
   `tp22-25` と `tp27-25` はどちらも下位で、25% 近辺から動かす価値は現時点では低めでした。
2. **TP1 比率は厚めが優勢**  
   `tp25-33` と `tp25-30` が 1 位・2 位に入り、`tp25-25` を上回りました。
3. **strongest 非TP基準は net の天井としては依然強い**  
   ただし PF 基準では 7 位まで下がり、今回の比較軸では安全性寄りの改善に負けています。
4. **run67 の改善仮説は半分当たり**  
   「TP1 を早くする」は維持された一方で、勝ち筋は `tp25-25` ではなく **その TP1 比率をもう少し厚くする側**にありました。

よって今回の短い結論は次の 3 点です。

1. **次の本命は `tp25-33-tp100-50`**
2. **TP1 発動位置の探索より、TP1 比率の精密化を優先すべき**
3. **strongest 非TP基準は比較対象として残すが、主戦場は TP1 25% 周辺の ratio 調整**

---

## 次の改善候補 / 比較案

今回の結果から、次に優先度が高い候補は以下です。

### 改善候補

- `tp25-33-tp100-50` を中心に、**TP1 比率 28% / 30% / 33% / 35%** を細かく比較する
- `tp25-25` と `tp25-33` の間で、**TP1 比率だけを振った 4-pack** を作る
- strongest 非TP基準は残しつつ、**PF と drawdown を改善しながら net profit の落ち幅をどこまで抑えられるか**を主目的に比較する

### 次の比較案

1. **TP1 ratio micro sweep**  
   `tp25-28-tp100-50`, `tp25-30-tp100-50`, `tp25-33-tp100-50`, `tp25-35-tp100-50`
2. **top contender 再戦**  
   strongest 非TP基準 + `tp25-25` + `tp25-30` + `tp25-33` + `tp30-33`
3. **winner 偏重検証**  
   TSLA の寄与を分離して、PF 改善が mega-winner 依存ではないかを確認する
4. **損失側改善確認**  
   `INTC`, `NKE`, `BA` の下振れ改善が小さいので、損失側だけ別軸のフィルタ改善余地を観察する

今回の結果だけで言えば、次に優先度を下げてよさそうなのは `tp27-25-tp100-50` です。  
逆に残すべき軸は `tp25-33-tp100-50`、`tp25-30-tp100-50`、`tp25-25-tp100-50`、`tp25-20-tp100-50`、そして strongest 非TP基準です。

---

## 参照

- workflow artifact summary: `night-batch/round32/gha_24953124968_1-summary.json`
- workflow artifact summary md: `night-batch/round32/gha_24953124968_1-summary.md`
- full ranking: `artifacts/campaigns/strongest-vs-profit-protect-tp1-focus-us40-10pack/full/strategy-ranking.md`
- full ranking json: `artifacts/campaigns/strongest-vs-profit-protect-tp1-focus-us40-10pack/full/strategy-ranking.json`
- full recovered summary: `artifacts/campaigns/strongest-vs-profit-protect-tp1-focus-us40-10pack/full/recovered-summary.json`
- full recovered results: `artifacts/campaigns/strongest-vs-profit-protect-tp1-focus-us40-10pack/full/recovered-results.json`
- smoke ranking: `artifacts/campaigns/strongest-vs-profit-protect-tp1-focus-us40-10pack/smoke/strategy-ranking.md`
- smoke recovered summary: `artifacts/campaigns/strongest-vs-profit-protect-tp1-focus-us40-10pack/smoke/recovered-summary.json`
- previous latest summary: `docs/research/night-batch-self-hosted-run67_20260426.md`
