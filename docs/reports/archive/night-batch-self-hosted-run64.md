# Night Batch Self Hosted — Run 64 結果レポート

## 概要

| 項目 | 値 |
|---|---|
| workflow | Night Batch Self Hosted |
| branch | `main` |
| run_number | 64 |
| run_id | `24872765258` |
| workflow 結果 | **success** |
| backtest 結果 | **success** (`summary.json` 上で確認) |
| artifact | `night-batch-24872765258-1` |

**結論: 最新 main run は success。**
`selected-us40-10pack` を対象にした night batch は workflow / artifact summary の両方で成功しました。

---

## artifact ベースの結果サマリー

`gha_24872765258_1-summary.json` から取得した主要フィールド:

| フィールド | 値 | 説明 |
|---|---|---|
| `success` | `true` | `night_batch.py smoke-prod` は正常完了 |
| `termination_reason` | `success` | Python ランタイムは成功終了 |
| `failed_step` | `startup-check` | artifact 契約上の記録。workflow failure を意味しない |
| `last_checkpoint` | `artifacts/campaigns/selected-us40-10pack/full/checkpoint-400.json` | 最新 checkpoint |
| `round` | `29` | round-manifest 上の実行ラウンド |
| `round_mode` | `advance-next-round` | 新規ラウンド開始で実行 |
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

- `startup-check` が `False` でも、これは最初の probe 時点で既存 visible instance を掴めなかったことを示すだけです。
- 今回は `launch` が `skipped: true` で、その後 `preflight` と本番実行が通っているため、workflow としては正常継続できています。
- `success: true` と `termination_reason: success` が揃っているので、run 64 は成功扱いで問題ありません。

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

log から確認できる production 最終集計:

- `Success: 400`
- `Failure: 0`
- `Unreadable: 0`
- `Total: 400`

今回の重要点は、**10 戦略すべてが smoke 1 + full 40 を最後まで完走したこと**です。run48 の 8pack では public 系の一部が failure budget で止まりましたが、今回の 10pack ではそれがありませんでした。

戦略別の execution 集計は以下です。

| strategy | total seen | success | failure | 読み方 |
|---|---:|---:|---:|---|
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50-risk1` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50-risk1` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp35-25-tp100-50-risk1` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50-risk1` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50-risk1` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp80-50-risk1` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp120-50-risk1` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-33-risk1` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-67-risk1` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50-risk2` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |

---

## 追加 10 戦略の内訳

今回の 10pack は、最強戦略のコア条件を固定しつつ、部分利確の閾値・部分利確率・リスク率だけを振った比較セットです。

| strategy | 変更点 |
|---|---|
| `tp30-25-tp100-50-risk1` | 基準線。追加要件そのまま |
| `tp25-25-tp100-50-risk1` | 1回目利確を 25% に前倒し |
| `tp35-25-tp100-50-risk1` | 1回目利確を 35% に後ろ倒し |
| `tp30-20-tp100-50-risk1` | 1回目利確比率を 20% に軽く |
| `tp30-33-tp100-50-risk1` | 1回目利確比率を 33% に重く |
| `tp30-25-tp80-50-risk1` | 2回目利確を 80% に前倒し |
| `tp30-25-tp120-50-risk1` | 2回目利確を 120% に後ろ倒し |
| `tp30-25-tp100-33-risk1` | 2回目利確比率を 33% に軽く |
| `tp30-25-tp100-67-risk1` | 2回目利確比率を 67% に重く |
| `tp30-25-tp100-50-risk2` | 許容リスクを 2% に拡大 |

---

## run48 との比較

run48 は `selected-us40-8pack` で **280 runs** まで到達し、public 2 戦略が failure budget で途中停止しました。

run64 は `selected-us40-10pack` で **400 runs を 0 failure で完走**しています。

比較すると:

- 実行安定性は run64 のほうが明確に上
- 比較対象が strongest 系 10 本に揃っているため、public 系ノイズがない
- 今回の 10 本は「強い戦略の派生比較」としてはかなり扱いやすい母集団になった

---

## performance ランキング

`artifacts/campaigns/selected-us40-10pack/full/strategy-ranking.md` から、full 40 銘柄の性能比較を確認できる。

| rank | strategy | avg net profit | avg profit factor | avg max drawdown | avg win rate | success / runs |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp120-50-risk1` | 722.50 | 1.548 | 399.92 | 43.68% | 40 / 40 |
| 2 | `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50-risk1` | 717.72 | 1.548 | 399.68 | 43.68% | 40 / 40 |
| 3 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp80-50-risk1` | 721.63 | 1.547 | 399.92 | 43.71% | 40 / 40 |
| 4 | `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50-risk1` | 719.41 | 1.547 | 400.07 | 44.28% | 40 / 40 |
| 5 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-33-risk1` | 717.15 | 1.546 | 399.92 | 43.68% | 40 / 40 |
| 6 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50-risk1` | 716.73 | 1.545 | 399.92 | 43.68% | 40 / 40 |
| 7 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-67-risk1` | 716.30 | 1.545 | 399.92 | 43.68% | 40 / 40 |
| 8 | `donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50-risk1` | 715.82 | 1.544 | 399.90 | 43.68% | 40 / 40 |
| 9 | `donchian-60-20-rsp-rsi14-regime60-tp35-25-tp100-50-risk1` | 716.79 | 1.544 | 399.48 | 43.23% | 40 / 40 |
| 10 | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50-risk2` | 1608.28 | 1.527 | 841.59 | 43.68% | 40 / 40 |

### 結論

- **総合首位**: `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp120-50-risk1`
- **risk1 群の差はかなり小さい**: 1 位から 9 位までの avg net profit 差は `6.68`
- **risk2 は別枠**: avg net profit は最大だが、profit factor 低下と drawdown 拡大で順位は 10 位

この ranking は `avg profit factor` 降順を最優先に、次に `avg net profit` 降順、最後に `avg max drawdown pct` 昇順で並ぶ deterministic な順位として読むのが妥当。

---

## Top 5 戦略の中身

### `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp120-50-risk1`

- avg_net_profit: `722.50`
- avg_profit_factor: `1.548`
- avg_max_drawdown: `399.92`
- avg_win_rate: `43.68`
- 上振れ銘柄: `TSLA 5741.02`, `NVDA 4377.69`, `AAPL 2278.31`
- 下振れ銘柄: `NKE -378.49`, `BA -447.08`, `INTC -1262.30`

### `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50-risk1`

- avg_net_profit: `717.72`
- avg_profit_factor: `1.547`
- avg_max_drawdown: `399.68`
- avg_win_rate: `43.68`
- 上振れ銘柄: `TSLA 5412.52`, `NVDA 4404.42`, `AAPL 2288.64`
- 下振れ銘柄: `NKE -378.49`, `BA -447.08`, `INTC -1253.15`

### `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp80-50-risk1`

- avg_net_profit: `721.63`
- avg_profit_factor: `1.547`
- avg_max_drawdown: `399.92`
- avg_win_rate: `43.71`
- 上振れ銘柄: `TSLA 5555.15`, `NVDA 4377.69`, `AAPL 2278.31`
- 下振れ銘柄: `NKE -378.49`, `BA -447.08`, `INTC -1262.30`

### `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50-risk1`

- avg_net_profit: `719.41`
- avg_profit_factor: `1.547`
- avg_max_drawdown: `400.07`
- avg_win_rate: `44.28`
- 上振れ銘柄: `TSLA 5443.45`, `NVDA 4316.56`, `AAPL 2248.33`
- 下振れ銘柄: `NKE -378.49`, `BA -447.08`, `INTC -1273.44`

### `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-33-risk1`

- avg_net_profit: `717.15`
- avg_profit_factor: `1.546`
- avg_max_drawdown: `399.92`
- avg_win_rate: `43.68`
- 上振れ銘柄: `TSLA 5527.00`, `NVDA 4377.69`, `AAPL 2278.31`
- 下振れ銘柄: `NKE -378.49`, `BA -447.08`, `INTC -1262.30`

---

## 銘柄横断で見えた傾向

40 銘柄の各戦略結果を横断すると、平均 net profit の上位と下位は次のとおり。

### 上位 5 銘柄

| rank | symbol | avg net profit | best variant | best net | spread |
| ---: | --- | ---: | --- | ---: | ---: |
| 1 | `TSLA` | 6354.19 | `...tp100-50-risk2` | 13712.15 | 8299.63 |
| 2 | `NVDA` | 4989.46 | `...tp100-50-risk2` | 10487.77 | 6171.21 |
| 3 | `AAPL` | 2557.84 | `...tp100-50-risk2` | 5113.41 | 2865.08 |
| 4 | `AMD` | 2210.20 | `...tp100-50-risk2` | 4239.52 | 2302.63 |
| 5 | `AVGO` | 1860.71 | `...tp100-50-risk2` | 3651.41 | 1995.47 |

### 下位 5 銘柄

| rank | symbol | avg net profit | best variant | best net | spread |
| ---: | --- | ---: | --- | ---: | ---: |
| 36 | `IBIT` | -48.48 | `...tp30-33-tp100-50-risk1` | -32.96 | 50.89 |
| 37 | `WBA` | -321.79 | `...tp100-50-risk1` | -292.86 | 289.26 |
| 38 | `NKE` | -415.91 | `...tp100-50-risk1` | -378.49 | 374.24 |
| 39 | `BA` | -490.08 | `...tp100-50-risk1` | -447.08 | 430.04 |
| 40 | `INTC` | -1377.58 | `...tp30-33-tp100-50-risk1` | -1253.15 | 1144.77 |

短く言うと、今回の 10pack は **大型 winner をどれだけ伸ばせるかの勝負**になっており、弱い銘柄側の改善余地はどの variant でもあまり大きくない。

---

## ここで何が強かったか

### execution 観点

**全 10 戦略が首位タイ**で、実行安定性に差は出ていない。

### performance 観点

現時点の首位は `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp120-50-risk1`。  
ただし 1 位から 9 位まではかなり密集しており、今回の主要示唆は「勝者 1 本を断定する」ことより、**risk1 の範囲では部分利確パラメータの差が小さい**ことにある。

その一方で `risk2` は、リターンを大きく押し上げる代わりに drawdown も大きく増やしている。

- `risk1` 首位の avg max drawdown: `399.92`
- `risk2` の avg max drawdown: `841.59`

よって今回の短い結論は次の 3 点。

1. **最もバランスがよかったのは** `tp30-25-tp120-50-risk1`
2. **risk1 の微調整差は小さく、勝負は僅差**
3. **return 最大化だけなら risk2 だが、 strongest 後継の本命としては別枠評価**

---

## 次回確認ポイント

1. `risk1` 上位 5 本を同条件で再走し、順位の再現性があるか確認する
2. `risk2` は return 優位が drawdown 増加に見合うか、資金曲線ベースで切り分ける
3. `TSLA` と `NVDA` への依存が強いため、 winner 依存を弱める調整余地があるか確認する
4. `INTC`, `BA`, `NKE` の下振れが固定的なので、損失側の改善余地を別軸で見る

---

## 関連リンク

- workflow: `.github/workflows/night-batch-self-hosted.yml`
- 比較元レポート: `docs/reports/night-batch-self-hosted-run48.md`
- current strongest summary: `docs/research/archive/main-backtest-current-summary.md`
- full ranking: `artifacts/campaigns/selected-us40-10pack/full/strategy-ranking.md`
- full ranking json: `artifacts/campaigns/selected-us40-10pack/full/strategy-ranking.json`
- full recovered summary: `artifacts/campaigns/selected-us40-10pack/full/recovered-summary.json`
- full recovered results: `artifacts/campaigns/selected-us40-10pack/full/recovered-results.json`
