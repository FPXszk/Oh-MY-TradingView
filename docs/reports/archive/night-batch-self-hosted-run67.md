# Night Batch Self Hosted — Run 67 結果レポート

## 概要

| 項目 | 値 |
|---|---|
| workflow | `Night Batch Self Hosted` |
| branch | `main` |
| run_number | 67 |
| run_id | `24948625082` |
| 実行開始 | `2026-04-26 13:54:18 JST` |
| 実行完了 | `2026-04-26 15:14:54 JST` |
| workflow 結果 | **success** |
| backtest 結果 | **success** (`gha_24948625082_1-summary.json` / `recovered-summary.json` 上で確認) |
| artifact | `night-batch-24948625082-1` |

**結論: run67 も main run は success。**  
`strongest-vs-profit-protect-us40-10pack` は workflow / artifact summary の両方で成功し、smoke 10 + full 400 を 0 failure で完走しました。

---

## artifact ベースの結果サマリー

`night-batch/round31/gha_24948625082_1-summary.json` から取得した主要フィールド:

| フィールド | 値 | 説明 |
|---|---|---|
| `success` | `true` | `night_batch.py smoke-prod` は正常完了 |
| `termination_reason` | `success` | Python ランタイムは成功終了 |
| `failed_step` | `startup-check` | artifact 契約上の記録。workflow failure を意味しない |
| `last_checkpoint` | `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/full/checkpoint-400.json` | 最新 checkpoint |
| `round` | `31` | round-manifest 上の実行ラウンド |
| `command` | `smoke-prod` | 実行コマンド |
| `host` | `172.31.144.1` | 実行ホスト |
| `port` | `9223` | WSL 側 CDP ブリッジポート |

### Steps

| step | success | skipped | exit_code | timed_out | latest_checkpoint |
| --- | --- | --- | ---: | --- | --- |
| startup-check | False | False | 1 | False | — |
| launch | False | True | 1 | False | — |
| preflight | True | False | 0 | False | — |
| smoke | True | False | 0 | False | `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/smoke/checkpoint-10.json` |
| production | True | False | 0 | False | `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/full/checkpoint-400.json` |

### 読み方

- `startup-check` が `False` でも、これは最初の probe で既存 visible instance を掴めなかったことを示すだけです。
- 今回も `launch` は `skipped: true` ですが、その後の `preflight` と本番実行が通っているため workflow は正常継続できています。
- `success: true` と `termination_reason: success` が揃っているので、run67 は成功扱いで問題ありません。

---

## smoke テストの確認

今回の smoke は `strongest-vs-profit-protect-us40-10pack` campaign の **SPY 1 銘柄 × 10 戦略 = 10 runs** でした。

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

full phase は `strongest-vs-profit-protect-us40-10pack` の **40 銘柄 × 10 戦略 = 400 runs** です。

log と `recovered-summary.json` から確認できる production 最終集計:

- `Success: 400`
- `Failure: 0`
- `Unreadable: 0`
- `Total: 400`

今回の重要点は、**strongest 非TP基準 1 本と profit-protect 9 本が同じ US40 条件でそのまま完走し、初めて直接比較できたこと**です。

戦略別の execution 集計は以下です。

| strategy | total seen | success | failure | 読み方 |
|---|---:|---:|---:|---|
| `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp35-25-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp80-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp120-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-33` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-67` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |

---

## strongest vs profit-protect の比較軸

今回の 10pack は、**strongest 非TP基準 1 本**と、そこから派生した **profit-protect 9 本**を同一 US40 universe で比較するセットでした。

| strategy | 位置づけ |
|---|---|
| `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | strongest 非TP基準 |
| `tp30-25-tp100-50` | profit-protect 基準線 |
| `tp25-25-tp100-50` | TP1 を 25% に前倒し |
| `tp35-25-tp100-50` | TP1 を 35% に後ろ倒し |
| `tp30-20-tp100-50` | TP1 比率を 20% に軽く |
| `tp30-33-tp100-50` | TP1 比率を 33% に重く |
| `tp30-25-tp80-50` | TP2 を 80% に前倒し |
| `tp30-25-tp120-50` | TP2 を 120% に後ろ倒し |
| `tp30-25-tp100-33` | TP2 比率を 33% に軽く |
| `tp30-25-tp100-67` | TP2 比率を 67% に重く |

---

## 何が分かったか

今回の比較で最も重要なのは、**profit-protect 勢が strongest 非TP基準より上位を占めたが、「圧勝」ではなくトレードオフ付きだった**ことです。

比較すると:

- strongest 非TP基準は **4 位**
- 1 位は `tp25-25-tp100-50`
- 2 位は `tp30-33-tp100-50`
- 3 位は `tp30-20-tp100-50`
- strongest 非TP基準より上に **profit-protect 3 本**が入った

ただし strongest 非TP基準と 1 位の差は次の通りです。

| 項目 | 1位 `tp25-25-tp100-50` | strongest 非TP基準 | 差分 |
|---|---:|---:|---:|
| avg net profit | 12858.23 | 13063.48 | **-205.25** |
| avg profit factor | 1.468 | 1.460 | **+0.007** |
| avg max drawdown | 4803.22 | 4827.14 | **-23.92** |
| avg win rate | 44.51% | 42.82% | **+1.69pt** |

短く言うと、**1 位の profit-protect 案は net profit では strongest 非TP基準に少し負けたが、profit factor・drawdown・win rate では少し良かった**、という形です。

---

## performance ランキング

`artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/full/strategy-ranking.md` から、full 40 銘柄の性能比較を確認できます。

| rank | strategy | avg net profit | avg profit factor | avg max drawdown | avg win rate | success / runs |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50` | 12858.23 | 1.468 | 4803.22 | 44.51% | 40 / 40 |
| 2 | `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50` | 12289.95 | 1.463 | 4687.08 | 43.93% | 40 / 40 |
| 3 | `donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50` | 12104.69 | 1.462 | 4604.94 | 44.00% | 40 / 40 |
| 4 | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 13063.48 | 1.460 | 4827.14 | 42.82% | 40 / 40 |
| 5 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-67` | 12108.24 | 1.457 | 4652.06 | 43.88% | 40 / 40 |
| 6 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-33` | 12086.81 | 1.457 | 4648.17 | 43.88% | 40 / 40 |
| 7 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp120-50` | 11941.70 | 1.456 | 4620.70 | 43.85% | 40 / 40 |
| 8 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp80-50` | 11834.33 | 1.456 | 4602.23 | 43.84% | 40 / 40 |
| 9 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50` | 11656.58 | 1.456 | 4566.85 | 43.85% | 40 / 40 |
| 10 | `donchian-60-20-rsp-rsi14-regime60-tp35-25-tp100-50` | 11620.13 | 1.445 | 4680.80 | 43.38% | 40 / 40 |

### 結論

- **総合首位**: `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50`
- **strongest 非TP基準は 4 位**で、profit-protect 3 本がその上に来た
- **ただし net profit 単独では strongest 非TP基準が最大**: 1 位との差は `205.25`
- **安全性寄りの微差改善**: 1 位は strongest 非TP基準より profit factor と drawdown と win rate が少し良い
- **最下位は `tp35-25-tp100-50`**: TP1 を遅らせる案は今回も弱い

この ranking は `avg profit factor` 降順を最優先に、次に `avg net profit` 降順、最後に `avg max drawdown` 昇順で並ぶ deterministic な順位として読むのが妥当です。

---

## Top 5 戦略の中身

### `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50`

- avg_net_profit: `12858.23`
- avg_profit_factor: `1.468`
- avg_max_drawdown: `4803.22`
- avg_win_rate: `44.51`
- 上振れ銘柄: `TSLA 201375.46`, `NVDA 100133.05`, `AAPL 36702.82`
- 下振れ銘柄: `BA -3127.18`, `NKE -3470.36`, `INTC -6800.78`

### `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50`

- avg_net_profit: `12289.95`
- avg_profit_factor: `1.463`
- avg_max_drawdown: `4687.08`
- avg_win_rate: `43.93`
- 上振れ銘柄: `TSLA 174091.37`, `NVDA 113130.15`, `AAPL 37884.85`
- 下振れ銘柄: `BA -3127.18`, `NKE -3470.36`, `INTC -6711.81`

### `donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50`

- avg_net_profit: `12104.69`
- avg_profit_factor: `1.462`
- avg_max_drawdown: `4604.94`
- avg_win_rate: `44.00`
- 上振れ銘柄: `TSLA 167812.29`, `NVDA 110839.90`, `AAPL 37386.44`
- 下振れ銘柄: `BA -3127.18`, `NKE -3470.36`, `INTC -6731.73`

### `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`

- avg_net_profit: `13063.48`
- avg_profit_factor: `1.460`
- avg_max_drawdown: `4827.14`
- avg_win_rate: `42.82`
- 上振れ銘柄: `TSLA 212676.73`, `NVDA 108393.04`, `AAPL 36633.53`
- 下振れ銘柄: `BA -3127.18`, `NKE -3470.36`, `INTC -6755.91`

### `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-67`

- avg_net_profit: `12108.24`
- avg_profit_factor: `1.457`
- avg_max_drawdown: `4652.06`
- avg_win_rate: `43.88`
- 上振れ銘柄: `TSLA 178467.44`, `NVDA 104445.20`, `AAPL 37562.25`
- 下振れ銘柄: `BA -3127.18`, `NKE -3470.36`, `INTC -6726.53`

---

## 銘柄横断で見えた傾向

40 銘柄の各戦略結果を横断すると、平均 net profit の上位と下位は次のとおり。

### 上位 5 銘柄

| rank | symbol | avg net profit | best variant | best net | spread |
| ---: | --- | ---: | --- | ---: | ---: |
| 1 | `TSLA` | 177814.67 | `strongest 非TP基準` | 212676.73 | 52275.79 |
| 2 | `NVDA` | 105612.02 | `...tp30-33-tp100-50` | 113130.15 | 12997.10 |
| 3 | `AAPL` | 37368.53 | `...tp30-33-tp100-50` | 37884.85 | 1251.32 |
| 4 | `AVGO` | 22305.63 | `...tp25-25-tp100-50` | 22889.84 | 987.89 |
| 5 | `AMD` | 20479.40 | `...tp25-25-tp100-50` | 27110.00 | 12955.38 |

### 下位 5 銘柄

| rank | symbol | avg net profit | best variant | best net | spread |
| ---: | --- | ---: | --- | ---: | ---: |
| 36 | `T` | -1129.31 | `strongest 非TP基準` | -1129.31 | 0.00 |
| 37 | `WBA` | -1637.56 | `strongest 非TP基準` | -1637.56 | 0.00 |
| 38 | `BA` | -3127.18 | `strongest 非TP基準` | -3127.18 | 0.00 |
| 39 | `NKE` | -3470.36 | `strongest 非TP基準` | -3470.36 | 0.00 |
| 40 | `INTC` | -6738.88 | `...tp30-33-tp100-50` | -6711.81 | 88.97 |

短く言うと、今回も **大型 winner をどう守りながら伸ばすか**が勝負で、弱い銘柄側は variant を変えても改善幅がかなり小さいです。

---

## ここで何が強かったか

### execution 観点

**全 10 戦略が首位タイ**で、実行安定性に差は出ていません。

### performance 観点

今回の重要な発見は次の 4 点です。

1. **profit-protect は不要ではなかった**  
   strongest 非TP基準を同一条件で直接当てた結果、profit-protect 3 本がそれを上回りました。
2. **ただし「大きく勝った」わけではない**  
   1 位の `tp25-25-tp100-50` は ranking では首位ですが、avg net profit 単独では strongest 非TP基準に `205.25` 届きません。
3. **早い TP1 は有効、遅い TP1 は弱い**  
   `tp25-25-tp100-50` は首位、`tp35-25-tp100-50` は最下位でした。
4. **比較価値が高いのは TP1 まわり**  
   TP2 の遠近差より、まず TP1 の発動位置・比率差の方が順位に効いています。

よって今回の短い結論は次の 3 点です。

1. **「利益保護を入れない方がいい」とは言えない**
2. **現時点の本命は `tp25-25-tp100-50` だが、 strongest 非TP基準もまだ十分強い**
3. **次の比較は TP1 近傍を狭く刻み、 strongest 非TP基準との 2 軸比較に寄せるべき**

---

## 次の改善候補 / 比較案

今回の結果から、次に優先度が高い候補は以下です。

### 改善候補

- `tp25-25-tp100-50` を中心に、**TP1 発動を 25% 前後で細かく刻む**
- `tp30-33-tp100-50` と `tp30-20-tp100-50` の中間として、**TP1 比率 25% / 28% / 30%** 近辺を比較する
- strongest 非TP基準の **TSLA 大勝ち依存** が強いので、巨大 winner を削りすぎず PF を保つ設定を探す

### 次の比較案

1. **TP1 発動レンジ比較**  
   `tp22-25-tp100-50`, `tp25-25-tp100-50`, `tp27-25-tp100-50`, `tp30-25-tp100-50`
2. **TP1 比率比較**  
   `tp25-20-tp100-50`, `tp25-25-tp100-50`, `tp25-30-tp100-50`, `tp25-33-tp100-50`
3. **strongest 非TP基準との絞り込み再戦**  
   strongest 非TP基準 + run67 上位 3 本 + 下位 1 本だけを使った 5-pack / 6-pack 比較
4. **winner 偏重検証**  
   TSLA / NVDA を除いた集計か、mega-winner 比重を抑えた別 universe で再比較

今回の結果だけで言えば、次に切ってよさそうなのは `tp35-25-tp100-50` です。  
逆に残すべき軸は `tp25-25-tp100-50`、`tp30-33-tp100-50`、`tp30-20-tp100-50`、そして strongest 非TP基準です。

---

## 参照

- workflow artifact summary: `night-batch/round31/gha_24948625082_1-summary.json`
- workflow artifact summary md: `night-batch/round31/gha_24948625082_1-summary.md`
- full ranking: `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/full/strategy-ranking.md`
- full ranking json: `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/full/strategy-ranking.json`
- full recovered summary: `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/full/recovered-summary.json`
- full recovered results: `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/full/recovered-results.json`
- smoke ranking: `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/smoke/strategy-ranking.md`
- smoke recovered summary: `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/smoke/recovered-summary.json`
- strongest summary reference: `docs/research/archive/main-backtest-current-summary.md`
