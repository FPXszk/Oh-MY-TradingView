# Night Batch Self Hosted — Run 66 結果レポート

## 概要

| 項目 | 値 |
|---|---|
| workflow | `Night Batch Self Hosted` |
| branch | `main` |
| run_number | 66 |
| run_id | `24898124720` |
| 実行開始 | `2026-04-25 00:40:12 JST` |
| 実行完了 | `2026-04-25 02:00:09 JST` |
| workflow 結果 | **success** |
| backtest 結果 | **success** (`gha_24898124720_1-summary.json` / `recovered-summary.json` 上で確認) |
| artifact | `night-batch-24898124720-1` |

**結論: run66 も main run は success。**  
`selected-us40-10pack` の risk sizing 除去版 10pack は workflow / artifact summary の両方で成功し、smoke 10 + full 400 を 0 failure で完走しました。

---

## artifact ベースの結果サマリー

`night-batch/round30/gha_24898124720_1-summary.json` から取得した主要フィールド:

| フィールド | 値 | 説明 |
|---|---|---|
| `success` | `true` | `night_batch.py smoke-prod` は正常完了 |
| `termination_reason` | `success` | Python ランタイムは成功終了 |
| `failed_step` | `startup-check` | artifact 契約上の記録。workflow failure を意味しない |
| `last_checkpoint` | `artifacts/campaigns/selected-us40-10pack/full/checkpoint-400.json` | 最新 checkpoint |
| `round` | `30` | round-manifest 上の実行ラウンド |
| `command` | `smoke-prod` | 実行コマンド |
| `host` | `172.31.144.1` | 実行ホスト |
| `port` | `9223` | WSL 側 CDP ブリッジポート |

### Steps

| step | success | skipped | exit_code | timed_out | latest_checkpoint |
| --- | --- | --- | ---: | --- | --- |
| startup-check | False | False | 1 | False | — |
| launch | False | True | 1 | False | — |
| preflight | True | False | 0 | False | — |
| smoke | True | False | 0 | False | `artifacts/campaigns/selected-us40-10pack/smoke/checkpoint-10.json` |
| production | True | False | 0 | False | `artifacts/campaigns/selected-us40-10pack/full/checkpoint-400.json` |

### 読み方

- `startup-check` が `False` でも、これは最初の probe で既存 visible instance を掴めなかったことを示すだけです。
- 今回も `launch` は `skipped: true` ですが、その後の `preflight` と本番実行が通っているため workflow は正常継続できています。
- `success: true` と `termination_reason: success` が揃っているので、run66 は成功扱いで問題ありません。

---

## smoke テストの確認

今回の smoke は `selected-us40-10pack` campaign の **SPY 1 銘柄 × 10 戦略 = 10 runs** でした。

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

full phase は `selected-us40-10pack` の **40 銘柄 × 10 戦略 = 400 runs** です。

log と `recovered-summary.json` から確認できる production 最終集計:

- `Success: 400`
- `Failure: 0`
- `Unreadable: 0`
- `Total: 400`

今回の重要点は、**risk sizing を外した新しい 10 戦略すべてが smoke 1 + full 40 を最後まで完走したこと**です。

戦略別の execution 集計は以下です。

| strategy | total seen | success | failure | 読み方 |
|---|---:|---:|---:|---|
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp35-25-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp80-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp90-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp120-50` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-33` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-67` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |

---

## 10 戦略の比較軸

今回の 10pack は、最強戦略コア条件を固定したまま部分利確閾値と部分利確比率だけを振った比較セットです。run64 からの差分は **risk1 / risk2 を外し、`tp30-25-tp90-50` を追加したこと**です。

| strategy | 変更点 |
|---|---|
| `tp30-25-tp100-50` | 基準線 |
| `tp25-25-tp100-50` | 1回目利確を 25% に前倒し |
| `tp35-25-tp100-50` | 1回目利確を 35% に後ろ倒し |
| `tp30-20-tp100-50` | 1回目利確比率を 20% に軽く |
| `tp30-33-tp100-50` | 1回目利確比率を 33% に重く |
| `tp30-25-tp80-50` | 2回目利確を 80% に前倒し |
| `tp30-25-tp90-50` | 2回目利確を 90% に前倒し |
| `tp30-25-tp120-50` | 2回目利確を 120% に後ろ倒し |
| `tp30-25-tp100-33` | 2回目利確比率を 33% に軽く |
| `tp30-25-tp100-67` | 2回目利確比率を 67% に重く |

---

## run64 との比較

run64 は **risk sizing 付き** 10pack、run66 は **risk sizing を外した** 10pack です。  
したがって avg net profit や drawdown の絶対値はそのまま横比較せず、**順位の入れ替わり**を主に見るのが妥当です。

比較すると:

- run64 の首位は `tp30-25-tp120-50-risk1`、run66 の首位は `tp25-25-tp100-50`
- run64 で 4 位だった `tp25-25-tp100-50-risk1` が、run66 では 1 位へ上昇
- run64 の首位だった `tp30-25-tp120-50-risk1` は、run66 では 6 位まで後退
- run66 で新規追加された `tp30-25-tp90-50` は 9 位
- `tp35-25-tp100-50` は run64 / run66 の両方で最下位

短く言うと、**risk sizing を外した後は「TP2 を遠く置く案」より「TP1 を 25% に早める案」が最もバランスよくなった**、というのが今回の大きな変化です。

---

## performance ランキング

`artifacts/campaigns/selected-us40-10pack/full/strategy-ranking.md` から、full 40 銘柄の性能比較を確認できます。

| rank | strategy | avg net profit | avg profit factor | avg max drawdown | avg win rate | success / runs |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50` | 12858.23 | 1.468 | 4803.22 | 44.51% | 40 / 40 |
| 2 | `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50` | 12289.95 | 1.463 | 4687.08 | 43.93% | 40 / 40 |
| 3 | `donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50` | 12104.69 | 1.462 | 4604.94 | 44.00% | 40 / 40 |
| 4 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-67` | 12108.24 | 1.457 | 4652.06 | 43.88% | 40 / 40 |
| 5 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-33` | 12086.81 | 1.457 | 4648.17 | 43.88% | 40 / 40 |
| 6 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp120-50` | 11941.70 | 1.456 | 4620.70 | 43.85% | 40 / 40 |
| 7 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp80-50` | 11834.33 | 1.456 | 4602.23 | 43.84% | 40 / 40 |
| 8 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50` | 11656.58 | 1.456 | 4566.85 | 43.85% | 40 / 40 |
| 9 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp90-50` | 11796.99 | 1.454 | 4593.23 | 43.88% | 40 / 40 |
| 10 | `donchian-60-20-rsp-rsi14-regime60-tp35-25-tp100-50` | 11620.13 | 1.445 | 4680.80 | 43.38% | 40 / 40 |

### 結論

- **総合首位**: `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50`
- **上位は僅差**: 1 位から 9 位までの avg profit factor 差は `0.014`
- **ただし net profit の差は無視できない**: 1 位と 10 位の avg net profit 差は `1238.10`
- **最下位は一貫して `tp35-25-tp100-50`**: 1回目利確を遅らせる案は今回の 10pack では明確に弱い

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

### `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-67`

- avg_net_profit: `12108.24`
- avg_profit_factor: `1.457`
- avg_max_drawdown: `4652.06`
- avg_win_rate: `43.88`
- 上振れ銘柄: `TSLA 178467.44`, `NVDA 104445.20`, `AAPL 37562.25`
- 下振れ銘柄: `BA -3127.18`, `NKE -3470.36`, `INTC -6726.53`

### `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-33`

- avg_net_profit: `12086.81`
- avg_profit_factor: `1.457`
- avg_max_drawdown: `4648.17`
- avg_win_rate: `43.88`
- 上振れ銘柄: `TSLA 177610.45`, `NVDA 104445.20`, `AAPL 37562.25`
- 下振れ銘柄: `BA -3127.18`, `NKE -3470.36`, `INTC -6726.53`

---

## 銘柄横断で見えた傾向

40 銘柄の各戦略結果を横断すると、平均 net profit の上位と下位は次のとおり。

### 上位 5 銘柄

| rank | symbol | avg net profit | best variant | best net | spread |
| ---: | --- | ---: | --- | ---: | ---: |
| 1 | `TSLA` | 173148.76 | `...tp25-25-tp100-50` | 201375.46 | 40974.52 |
| 2 | `NVDA` | 105217.24 | `...tp30-33-tp100-50` | 113130.15 | 12997.10 |
| 3 | `AAPL` | 37461.40 | `...tp30-33-tp100-50` | 37884.85 | 1182.03 |
| 4 | `AVGO` | 22340.68 | `...tp25-25-tp100-50` | 22889.84 | 704.60 |
| 5 | `AMD` | 20271.88 | `...tp25-25-tp100-50` | 27110.00 | 12955.38 |

### 下位 5 銘柄

| rank | symbol | avg net profit | best variant | best net | spread |
| ---: | --- | ---: | --- | ---: | ---: |
| 36 | `T` | -1129.31 | `...tp30-25-tp100-50` | -1129.31 | 0.00 |
| 37 | `WBA` | -1637.56 | `...tp30-25-tp100-50` | -1637.56 | 0.00 |
| 38 | `BA` | -3127.18 | `...tp30-25-tp100-50` | -3127.18 | 0.00 |
| 39 | `NKE` | -3470.36 | `...tp30-25-tp100-50` | -3470.36 | 0.00 |
| 40 | `INTC` | -6735.94 | `...tp30-33-tp100-50` | -6711.81 | 88.97 |

短く言うと、今回の 10pack でも **大型 winner をどれだけ伸ばせるかが勝負**で、弱い銘柄側は variant を変えても改善幅がかなり小さいです。

---

## ここで何が強かったか

### execution 観点

**全 10 戦略が首位タイ**で、実行安定性に差は出ていません。

### performance 観点

現時点の首位は `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50`。  
今回の主要示唆は、**1回目利確を 25% に早める案が、TP2 の遠近や比率差よりも強く効いた**ことです。

一方で:

- `tp30-25-tp120-50` は run64 首位から run66 では 6 位へ後退
- `tp30-25-tp90-50` は中間案として追加されたが 9 位止まり
- `tp35-25-tp100-50` は最下位で、1回目利確の後ろ倒しは不利

よって今回の短い結論は次の 3 点です。

1. **最もバランスがよかったのは** `tp25-25-tp100-50`
2. **上位群は profit factor で僅差だが、TP1 を早める案が最終的に頭一つ抜けた**
3. **次に削る候補は `tp35-25-tp100-50` と `tp30-25-tp90-50`**

---

## 参照

- workflow artifact summary: `night-batch/round30/gha_24898124720_1-summary.json`
- workflow artifact summary md: `night-batch/round30/gha_24898124720_1-summary.md`
- full ranking: `artifacts/campaigns/selected-us40-10pack/full/strategy-ranking.md`
- full ranking json: `artifacts/campaigns/selected-us40-10pack/full/strategy-ranking.json`
- full recovered summary: `artifacts/campaigns/selected-us40-10pack/full/recovered-summary.json`
- full recovered results: `artifacts/campaigns/selected-us40-10pack/full/recovered-results.json`
- smoke ranking: `artifacts/campaigns/selected-us40-10pack/smoke/strategy-ranking.md`
- smoke recovered summary: `artifacts/campaigns/selected-us40-10pack/smoke/recovered-summary.json`
