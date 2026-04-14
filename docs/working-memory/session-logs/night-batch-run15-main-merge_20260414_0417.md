# Session log: night-batch-run15-main-merge_20260414_0417

## 目的

non-main branch で成功した最新 night batch run 15 の結果を repo 内 docs に固定し、main に統合して push する。

## 確認した証跡

1. GitHub Actions run `24377967655`
   - branch: `verify/night-batch-stale-round-fix`
   - workflow: `Night Batch Self Hosted`
   - conclusion: `success`
2. artifact summary
   - `success: true`
   - `termination_reason: success`
   - `last_checkpoint: results/campaigns/next-long-run-jp-12x10/full/checkpoint-120.json`
3. branch divergence
   - merge 前は `main` が 2 commit  पीछेで、`verify/night-batch-stale-round-fix` を fast-forward できる状態だった

## 実施内容

1. `docs/reports/night-batch-self-hosted-run15.md` を追加して run 15 の結果を保存
2. `verify/night-batch-stale-round-fix` を `main` に fast-forward merge
3. main 上に session log を残すため、このファイルを追加

## main に入った内容

- `docs/reports/night-batch-self-hosted-run15.md`
- `docs/working-memory/session-logs/night-batch-run15-main-merge_20260414_0417.md`
- `verify/night-batch-stale-round-fix` に含まれていた night-batch fix 一式

## 補足

- `failed_step: startup-check` は artifact contract 上の記録であり、workflow failure ではない
- 最新結果としては run 15 を採用して問題ない
