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

## ここで何が強かったか

### execution 観点の結論

今回の run で最も強かったのは、**全 10 戦略が同率首位**です。差が付いたのは execution ではなく、あくまで後で確認すべき performance 側です。

### performance 観点の現時点の限界

今回の run artifact には、`full/recovered-summary.json` のパスは記録されていますが、**性能ランキング本体は同梱されていません**。

そのため、artifact 単体から断定できるのは以下までです。

- 10 戦略とも実行面では採用候補に残った
- run48 のように途中で脱落した戦略はなかった
- ただし「どれが最も儲かったか」「run48 の strongest に追随したか」は、この artifact だけでは確定できない

### 追随候補の暫定整理

run48 の strongest 戦略結果に **追随できそうな候補はある** と見てよいです。ただし、これは現時点では**構造上の候補**であって、**性能で確認済みの候補ではありません**。

優先候補として見るなら次の 4 本です。

1. `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50-risk1`
   - 最強戦略に対する最小変更版で、比較基準として最も自然
2. `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp120-50-risk1`
   - 超大型 winner を残しやすく、 strongest の伸びを壊しにくい
3. `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-33-risk1`
   - 2回目利確を軽くして追従玉を残すため、 strongest の上振れに近い形を維持しやすい
4. `donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50-risk1`
   - 1回目利確を軽くして、勝ちトレードの取りこぼしを抑える方向

逆に、`risk2` は return の見かけが上振れてもリスク条件が違うため、**run48 strongest への追随比較としては別枠**で見るべきです。

短く言うと、**追随候補は十分あるが、今回取得できた artifact だけでは「追随した」とまではまだ言えない**、というのが現時点の結論です。

---

## 関連リンク

- workflow: `.github/workflows/night-batch-self-hosted.yml`
- 比較元レポート: `docs/reports/night-batch-self-hosted-run48.md`
- current strongest summary: `docs/research/current/main-backtest-current-summary.md`
- artifact summary source: `/tmp/night-batch-24872765258/night-batch-24872765258-1/gha_24872765258_1-summary.json`
- artifact log source: `/tmp/night-batch-24872765258/night-batch-24872765258-1/gha_24872765258_1.log`
