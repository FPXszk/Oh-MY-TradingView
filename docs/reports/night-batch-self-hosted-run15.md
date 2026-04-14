# Night Batch Self Hosted — Run 15 結果レポート

## 概要

| 項目 | 値 |
|---|---|
| workflow | Night Batch Self Hosted |
| branch | `verify/night-batch-stale-round-fix` |
| run_number | 15 |
| run_id | 24377967655 |
| workflow 結果 | **success** |
| backtest 結果 | **success** (artifact 上で確認済み) |

**結論: non-main branch の最新 run は success。**
`smoke-prod` の smoke / production どちらも完走し、最後の checkpoint まで到達しています。

---

## artifact ベースの結果サマリー

`gha_24377967655_1-summary.md` から取得した主要フィールド:

| フィールド | 値 | 説明 |
|---|---|---|
| `success` | `true` | バックテスト本体は正常完了 |
| `termination_reason` | `success` | `night_batch.py` が正常終了で完走 |
| `failed_step` | `startup-check` | artifact contract 上の値。workflow 全体の失敗ではない |
| `last_checkpoint` | `docs/research/results/campaigns/next-long-run-jp-12x10/full/checkpoint-120.json` | 最終チェックポイント |
| `command` | `smoke-prod` | 実行コマンド |
| `host` | `172.31.144.1` | 実行ホスト |
| `port` | `9223` | 対象ポート |

### Steps

| step | success | skipped | exit_code | timed_out | latest_checkpoint |
| --- | --- | --- | ---: | --- | --- |
| startup-check | False | False | 1 | False | — |
| launch | True | False | 0 | False | — |
| preflight | True | False | 0 | False | — |
| smoke | True | False | 0 | False | `docs/research/results/campaigns/next-long-run-jp-12x10/smoke/checkpoint-30.json` |
| production | True | False | 0 | False | `docs/research/results/campaigns/next-long-run-jp-12x10/full/checkpoint-120.json` |

### 補足

- `failed_step: startup-check` は artifact 契約上の記録で、workflow の conclusion とは別です。
- 直近の main run は `failure` ですが、今回確認した非 main ブランチ run は `success` でした。
- 最新結果としてはこの run を採用できます。
