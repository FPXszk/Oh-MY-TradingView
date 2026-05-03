# Exec-plan: emr-ae-tpqty-100pack-workflow-fullrun_20260503_1108

## 概要

目的: `emr-ae-tpqty-100pack-focus8` について、

1. ローカルでの backtest / smoke 検証手順を root の `README.md` に追記する  
2. GitHub Actions `Night Batch Self Hosted` を `config/night_batch/emr-ae-tpqty-100pack-focus8-config.json` で dispatch し、8銘柄 × 100戦略の full run を開始する

前提:

- 本番実行は **workflow dispatch 前提** とする
- `README.md` は repo の一次入口なので、検証 runbook もここに追記する
- 直近 smoke の 6 本失敗は [src/core/pine.js](/home/fpxszk/code/Oh-MY-TradingView/src/core/pine.js) の apply fallback 修正でローカル実経路 6/6 success を確認済み
- 作業ツリーに `.codex/config.toml` の未依頼差分があるため、今回のコミットには含めない

## 既存 active plan との非衝突確認

- `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md`
- `docs/exec-plans/active/run-night-batch_20260429_2344.md`

今回の対象は `emr-ae-tpqty-100pack-focus8` 専用の runbook 追記と workflow dispatch であり、上記 active plan とは直接競合しない。

## 変更・作成・実行対象

| パス | 種別 | 内容 |
|---|---|---|
| `README.md` | 変更 | ローカル検証手順と full workflow dispatch 手順を追記 |
| `docs/exec-plans/active/emr-ae-tpqty-100pack-workflow-fullrun_20260503_1108.md` | 作成 | この計画 |
| `.github/workflows/night-batch-self-hosted.yml` | 参照のみ | dispatch 対象 workflow |
| `config/night_batch/emr-ae-tpqty-100pack-focus8-config.json` | 参照のみ | full run 用 `config_path` |

## 実装内容と影響範囲

- `README.md`
  - 「6本のような局所検証をローカルでどう再実行するか」を追記する
  - `tv backtest preset ... --symbol SPY` / `node src/cli/index.js backtest preset ...` / 必要に応じて `python/night_batch.py campaign ... --phase smoke` の位置づけを明文化する
  - smoke を通した campaign を full 本番へ送るときの `gh workflow run 'Night Batch Self Hosted' --ref main --field config_path=...` 手順を追記する
- 実行
  - `Night Batch Self Hosted` を `config/night_batch/emr-ae-tpqty-100pack-focus8-config.json` 指定で dispatch する
  - `gh run list` / `gh run view` で run 作成を確認する

## 範囲外

- `docs/research/` への結果取り込み
- workflow 完走後の artifact 解析
- campaign / preset / Pine の追加変更
- `.codex/config.toml` 既存差分の整理

## テスト戦略

- RED/GREEN はコード修正ではなく runbook 追記中心なので、既存回帰確認を最小で行う
- `README.md` 追記後も、直近の fix を壊していないことを targeted test で確認する

## 検証コマンド

- `node --test tests/pine.smart-compile.test.js tests/backtest.test.js`
- `gh workflow run 'Night Batch Self Hosted' --ref main --field config_path=config/night_batch/emr-ae-tpqty-100pack-focus8-config.json`
- `gh run list --workflow 'Night Batch Self Hosted' --limit 5`
- `gh run view <run-id>`

## リスク・注意点

- self-hosted Windows runner が offline だと dispatch 後も進まない
- workflow は `NIGHT_BATCH_SKIP_SMOKE=1` で foreground production を走らせるため、dispatch 後は長時間 run になる
- `README.md` にローカル検証と workflow 実行の責務を混ぜすぎると読みにくくなるので、追記は night-batch/manual launch 周辺に限定する
- 既存 active plan `run-night-batch_20260429_2344.md` も workflow dispatch を扱うため、今回のコミットは TP/QTY 100pack に限定した説明だけを追加する

## 実施手順

- [ ] `README.md` の night-batch/manual launch 近辺に、ローカル smoke/backtest 検証手順と full workflow dispatch 手順を追記する
- [ ] `node --test tests/pine.smart-compile.test.js tests/backtest.test.js` を実行し、直近 fix の回帰がないことを確認する
- [ ] `gh workflow run 'Night Batch Self Hosted' --ref main --field config_path=config/night_batch/emr-ae-tpqty-100pack-focus8-config.json` を実行する
- [ ] `gh run list --workflow 'Night Batch Self Hosted' --limit 5` で run 作成を確認する
- [ ] 必要に応じて `gh run view <run-id>` で初期状態を確認し、ユーザーへ run URL と状態を共有する

---

作成者: Codex  
作成日時: 2026-05-03 11:08 JST
