# Exec-plan: emr-ae-tpqty-54pack-plus-baseline-fullrun_20260503_1739

## 概要

目的: `emr-ae-tpqty-54pack-plus-baseline-focus8` について、smoke 成功を前提に GitHub Actions `Night Batch Self Hosted` を `config/night_batch/emr-ae-tpqty-54pack-plus-baseline-focus8-config.json` で dispatch し、8銘柄 × 55戦略の full run を開始する。

前提:

- 対象 campaign は [config/backtest/campaigns/emr-ae-tpqty-54pack-plus-baseline-focus8.json](/home/fpxszk/code/Oh-MY-TradingView/config/backtest/campaigns/emr-ae-tpqty-54pack-plus-baseline-focus8.json) に登録済み
- 本番 config は [config/night_batch/emr-ae-tpqty-54pack-plus-baseline-focus8-config.json](/home/fpxszk/code/Oh-MY-TradingView/config/night_batch/emr-ae-tpqty-54pack-plus-baseline-focus8-config.json) を使用する
- 直前の `Night Batch Smoke` はこの 55戦略 config で成功済み
- 作業ツリーに未依頼差分が生じた場合でも、本件では workflow dispatch に必要な範囲以外は触らない

## 既存 active plan との非衝突確認

- `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md`
- `docs/exec-plans/active/run-night-batch_20260429_2344.md`

今回の対象は `emr-ae-tpqty-54pack-plus-baseline-focus8` 専用の full workflow dispatch と run 起動確認のみであり、上記 active plan とは直接競合しない。

## 変更・作成・実行対象

| パス | 種別 | 内容 |
|---|---|---|
| `docs/exec-plans/active/emr-ae-tpqty-54pack-plus-baseline-fullrun_20260503_1739.md` | 作成 | この計画 |
| `.github/workflows/night-batch-self-hosted.yml` | 参照のみ | dispatch 対象 workflow |
| `config/night_batch/emr-ae-tpqty-54pack-plus-baseline-focus8-config.json` | 参照のみ | full run 用 `config_path` |

## 実装内容と影響範囲

- 実行
  - `Night Batch Self Hosted` を `config/night_batch/emr-ae-tpqty-54pack-plus-baseline-focus8-config.json` 指定で dispatch する
  - `gh run list` / `gh run view` で run 作成と初期状態を確認する
- 影響範囲
  - リポジトリファイルの追加修正は行わず、workflow 実行状態のみが増える

## 範囲外

- `docs/research/` への結果取り込み
- full run 完走後の artifact 解析
- campaign / preset / Pine / test の追加修正
- 既存 active plan の整理

## 検証コマンド

- `gh workflow run night-batch-self-hosted.yml --ref main -f config_path=config/night_batch/emr-ae-tpqty-54pack-plus-baseline-focus8-config.json`
- `gh run list --workflow night-batch-self-hosted.yml --limit 5`
- `gh run view <run-id>`

## リスク・注意点

- self-hosted runner が offline の場合、dispatch 後も queue のまま進まない
- full run は長時間実行になるため、初期起動確認と run ID 共有までを今回の完了条件とする
- 同時期に別の night batch が動いている場合、runner 待ちで開始が遅れる可能性がある

## 実施手順

- [ ] `gh workflow run night-batch-self-hosted.yml --ref main -f config_path=config/night_batch/emr-ae-tpqty-54pack-plus-baseline-focus8-config.json` を実行する
- [ ] `gh run list --workflow night-batch-self-hosted.yml --limit 5` で run 作成を確認する
- [ ] 必要に応じて `gh run view <run-id>` で初期状態を確認し、run ID と状態を共有する

---

作成者: Codex  
作成日時: 2026-05-03 17:39 JST
