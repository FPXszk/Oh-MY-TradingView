# Night Batch Self Hosted — Run 48 結果レポート

## 概要

| 項目 | 値 |
|---|---|
| workflow | Night Batch Self Hosted |
| branch | `main` |
| run_number | 48 |
| run_id | 24770503385 |
| workflow 結果 | **success** |
| backtest 結果 | **success** (`summary.json` 上で確認) |
| artifact | `night-batch-24770503385-1` |

**結論: 最新 main run は success。**
`workflow_dispatch` で起動した最新 run は workflow conclusion / artifact summary ともに成功でした。

---

## artifact ベースの結果サマリー

`gha_24770503385_1-summary.json` から取得した主要フィールド:

| フィールド | 値 | 説明 |
|---|---|---|
| `success` | `true` | `night_batch.py smoke-prod` は正常完了 |
| `termination_reason` | `success` | Python ランタイムは成功終了 |
| `failed_step` | `startup-check` | artifact 契約上の記録。workflow failure を意味しない |
| `last_checkpoint` | `artifacts/campaigns/selected-us40-8pack/full/checkpoint-280.json` | 最新 checkpoint |
| `round` | `21` | round-manifest 上の実行ラウンド |
| `round_mode` | `advance-next-round` | 新規ラウンド開始で実行 |
| `command` | `smoke-prod` | 実行コマンド |
| `host` | `172.31.144.1` | 実行ホスト |
| `port` | `9223` | WSL 側 CDP ブリッジポート |

### Steps

| step | success | skipped | exit_code | timed_out | latest_checkpoint |
| --- | --- | --- | ---: | --- | --- |
| startup-check | False | False | 1 | False | — |
| launch | True | False | 0 | False | — |
| preflight | True | False | 0 | False | — |
| smoke | True | False | 0 | False | `artifacts/campaigns/selected-us40-8pack/smoke/checkpoint-8.json` |
| production | True | False | 0 | False | `artifacts/campaigns/selected-us40-8pack/full/checkpoint-280.json` |

### 読み方

- `startup-check` が `False` でも、これは「既存の visible TradingView インスタンスが最初の probe で見つからなかった」ことを示すだけです。
- その後の `launch` と `preflight` は成功しているため、workflow は visible window 起動後に継続できています。
- `success: true` と `termination_reason: success` が揃っているので、今回の run は workflow / artifact の両面で成功扱いにできます。

---

## smoke テストの確認

今回の smoke では `selected-us40-8pack` campaign が **SPY 1 銘柄 × 8 戦略 = 8 runs** で実行されました。

summary の captured lines では以下が確認できます。

- `Phase: smoke`
- `Strategies: 8`
- `Symbols: 1`
- `Total runs: 8`
- `Success: 8 / Failure: 0 / Unreadable: 0`

smoke は全戦略が通過しています。

---

## production の確認

full phase は `selected-us40-8pack` の **40 銘柄 × 8 戦略 = 320 runs** を初期投入していますが、今回の production は failure budget により 2 preset が途中停止され、最終結果は **280 runs** で終了しています。

log から確認できる production 最終集計:

- `Success: 270`
- `Failure: 10`
- `Unreadable: 0`
- `Total: 280`

failure budget による block:

- `tv-public-agni-momentum` が primary 中に 5 連続 failure で block
- `tv-public-gold-hft-hybrid` が primary 中に 5 連続 failure で block

戦略別の execution 集計は以下です。

| strategy | total seen | success | failure | 読み方 |
|---|---:|---:|---:|---|
| `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `tv-public-kdj-l2` | 41 | 41 | 0 | smoke 1 + full 40 を完走 |
| `tv-public-agni-momentum` | 36 | 31 | 5 | smoke 1 は成功、full で 31 success 後に 5 連続 failure で停止 |
| `tv-public-gold-hft-hybrid` | 6 | 1 | 5 | smoke 1 は成功、full 冒頭 5 failure で即停止 |

### 補足

- 今回の run artifact には full phase の performance 集計ファイル自体は含まれておらず、確実に確認できるのは execution 成功/失敗と checkpoint 到達です。
- したがって production で「どの戦略が最も儲かったか」はこの run artifact 単体では断定できません。

---

## ここで何が強かったか

### execution 観点の結論

今回の run で最も強かったのは、**full 40 銘柄まで崩れず完走した 6 戦略**です。

1. `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
2. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow`
3. `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early`
4. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
5. `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late`
6. `tv-public-kdj-l2`
7. `tv-public-agni-momentum`
8. `tv-public-gold-hft-hybrid`

6 位までを同列首位にしてもよいですが、既存の strongest 比較を踏まえると practical には上の並びが妥当です。

### performance ヒント込みの暫定ランキング

今回の execution 実績に、既存の `docs/research/current/main-backtest-current-summary.md` と `docs/reports/night-batch-public-vs-strongest.md` の比較を重ねると、現時点の暫定順位は以下です。

1. `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
   - current summary の総合首位
   - 今回も smoke 1 + full 40 を完走
2. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow`
   - current summary の総合 2 位
   - 今回も smoke 1 + full 40 を完走
3. `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early`
   - current summary の総合 3 位
   - 今回も smoke 1 + full 40 を完走
4. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
   - current summary の総合 4 位
   - 今回も smoke 1 + full 40 を完走
5. `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late`
   - current summary の総合 5 位
   - 今回も smoke 1 + full 40 を完走
6. `tv-public-kdj-l2`
   - public 側では最有力
   - 今回も smoke 1 + full 40 を完走
7. `tv-public-agni-momentum`
   - smoke 比較では public 次点
   - ただし今回は full 中盤で failure budget に到達
8. `tv-public-gold-hft-hybrid`
   - smoke 比較でも優位性は弱め
   - 今回は full 冒頭で failure budget に到達

短く言うと、**今回も strongest / finetune 系 5 本が上位を維持し、public では `tv-public-kdj-l2` だけが追随候補として残った** という整理です。

---

## 関連リンク

- workflow: `.github/workflows/night-batch-self-hosted.yml`
- previous latest successful main run archive: `docs/reports/night-batch-self-hosted-run17.md`
- current strongest summary: `docs/research/current/main-backtest-current-summary.md`
- public vs strongest comparison: `docs/reports/night-batch-public-vs-strongest.md`
- artifact summary source: `/tmp/night-batch-24770503385/night-batch-24770503385-1/gha_24770503385_1-summary.json`
- artifact log source: `/tmp/night-batch-24770503385/night-batch-24770503385-1/gha_24770503385_1.log`
