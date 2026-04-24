# Night Batch Self Hosted — Run 17 結果レポート

## 概要

| 項目 | 値 |
|---|---|
| workflow | Night Batch Self Hosted |
| branch | `main` |
| run_number | 17 |
| run_id | 24705526295 |
| workflow 結果 | **success** |
| backtest 結果 | **success** (`summary.json` 上で確認) |
| artifact | `night-batch-24705526295-1` |

**結論: manual-only / visible-window 化後の main run は success。**
`workflow_dispatch` で起動した最新 run は workflow conclusion / artifact summary ともに成功でした。

---

## artifact ベースの結果サマリー

`gha_24705526295_1-summary.json` から取得した主要フィールド:

| フィールド | 値 | 説明 |
|---|---|---|
| `success` | `true` | `night_batch.py smoke-prod` は正常完了 |
| `termination_reason` | `success` | Python ランタイムは成功終了 |
| `failed_step` | `startup-check` | artifact 契約上の記録。workflow failure を意味しない |
| `last_checkpoint` | `artifacts/campaigns/public-top10-us-40x10/full/checkpoint-245.json` | 最新 checkpoint |
| `round` | `17` | round-manifest 上の実行ラウンド |
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
| smoke | True | False | 0 | False | `artifacts/campaigns/public-top10-us-40x10/smoke/checkpoint-13.json` |
| production | True | False | 0 | False | `artifacts/campaigns/public-top10-us-40x10/full/checkpoint-245.json` |

### 読み方

- `startup-check` が `False` でも、これは「既存の visible TradingView インスタンスが最初の probe で見つからなかった」ことを示すだけです。
- その後の `launch` と `preflight` は成功しているため、workflow は visible window 起動後に継続できています。
- `success: true` と `termination_reason: success` が揃っているので、今回の run は workflow / artifact の両面で成功扱いにできます。

---

## smoke テストの確認

今回の smoke では `public-top10-us-40x10` campaign が **SPY 1 銘柄 × 10 戦略 = 10 runs** で実行されました。

summary の captured lines では以下が確認できます。

- `Phase: smoke`
- `Strategies: 10`
- `Symbols: 1`
- `Total runs: 10`

1 回目で失敗した戦略に対して rerun は発生していますが、対象行列そのものは 10 runs です。

---

## 補足

- この run は `schedule` ではなく `workflow_dispatch` で起動された
- artifact summary 上の launch command は shortcut 経由で TradingView を起動している
- `failed_step: startup-check` は残るが、Run 8 のような workflow summary 書き込み失敗とは別で、今回は workflow conclusion 自体が `success`

## 関連リンク

- workflow: `.github/workflows/night-batch-self-hosted.yml`
- run archive: `docs/reports/night-batch-self-hosted-run15.md`
- artifact summary source: `/tmp/night-batch-24705526295/night-batch-24705526295-1/gha_24705526295_1-summary.json`
