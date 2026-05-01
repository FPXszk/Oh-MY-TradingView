# Exec-plan: fix-failed36-strategy-and-dispatch-night-batch_20260501_1158

## 概要

目的: failed 36 専用 campaign の残存失敗戦略 `emr-breakout-winrate-stopout-reentry-breakout-high-halfsize` を戦略側で修正し、36 戦略専用の night batch config を用意したうえで、GitHub Actions `Night Batch Self Hosted` workflow を手動起動する。

計画作成時の確認結果:

- 手動起動対象 workflow は `.github/workflows/night-batch-self-hosted.yml`
- workflow_dispatch の input は `config_path` 1 つで、repo ルート相対の JSON config を受ける
- 既定 config `config/night_batch/bundle-foreground-reuse-config.json` は `bundle.us_campaign = ema-breakout-winrate-stopout-us40-50pack`
- 36 戦略専用 campaign は `config/backtest/campaigns/ema-breakout-winrate-stopout-failed-us40-pack.json`
- 直近の local smoke 実行では `36` 件中 `35 success / 1 failure`、残件は `emr-breakout-winrate-stopout-reentry-breakout-high-halfsize`
- 残件 failure の理由は `Strategy not verified in chart studies after compile + retry`
- 対象戦略 source は `docs/references/pine/ema-breakout-winrate-stopout-us40-50pack/emr-breakout-winrate-stopout-reentry-breakout-high-halfsize.pine`

## 変更ファイル

- `docs/exec-plans/active/fix-failed36-strategy-and-dispatch-night-batch_20260501_1158.md` (本計画の作成)
- `docs/references/pine/ema-breakout-winrate-stopout-us40-50pack/emr-breakout-winrate-stopout-reentry-breakout-high-halfsize.pine` (残存 failure の戦略修正)
- `config/backtest/strategy-presets.json` (必要なら source / preset 整合の最小更新)
- `config/backtest/strategy-catalog.json` (必要なら catalog 整合の最小更新)
- `config/night_batch/bundle-foreground-reuse-failed36-config.json` (36 戦略専用 workflow_dispatch 用 config の新規作成)
- `tests/campaign.test.js` (campaign / config 参照整合が必要なら最小限更新)
- `tests/windows-run-night-batch-self-hosted.test.js` (新規 night batch config の整合確認が必要なら最小限更新)
- `docs/exec-plans/completed/fix-failed36-strategy-and-dispatch-night-batch_20260501_1158.md` (COMMIT step で移動)

## 実装内容と影響範囲

- `reentry-breakout-high-halfsize` の Pine source を見直し、apply 後に strategy として認識されない原因を潰す
- local smoke は再実行を試み、fresh artifact を取得できる場合は failed 36 campaign の結果を確認する
- workflow_dispatch 用に `bundle.us_campaign = ema-breakout-winrate-stopout-failed-us40-pack` の専用 config を追加する
- `gh workflow run` で `Night Batch Self Hosted` を手動起動し、run id と初期状態を確認する

## 実装ステップ

- [x] `emr-breakout-winrate-stopout-reentry-breakout-high-halfsize` の Pine source と関連 preset を確認し、strategy apply failure の原因を特定する
- [x] 戦略 source を最小変更で修正し、必要なら preset / catalog の整合を更新する
- [x] local smoke の再実行を試み、fresh artifact 取得可否を確認する
- [x] failed 36 専用の `config/night_batch/bundle-foreground-reuse-failed36-config.json` を追加する
- [x] 必要な整合テストを実行する
- [x] `gh workflow run .github/workflows/night-batch-self-hosted.yml --ref main --field config_path=config/night_batch/bundle-foreground-reuse-failed36-config.json` で workflow を手動起動する
- [x] 起動した workflow の run id / URL / 初期状態を確認する
- [x] 計画ファイルを `completed/` へ移動し、関連変更のみを Conventional Commits でコミットして `main` に push する

## テスト戦略

- local: `node --test tests/campaign.test.js tests/windows-run-night-batch-self-hosted.test.js`
- local smoke: `node scripts/backtest/run-finetune-bundle.mjs --phases smoke --us-campaign ema-breakout-winrate-stopout-failed-us40-pack`
- remote: GitHub Actions `Night Batch Self Hosted` を `config/night_batch/bundle-foreground-reuse-failed36-config.json` 指定で workflow_dispatch

## 検証コマンド

- `node --test tests/campaign.test.js tests/windows-run-night-batch-self-hosted.test.js`
- `node scripts/backtest/run-finetune-bundle.mjs --phases smoke --us-campaign ema-breakout-winrate-stopout-failed-us40-pack`
- `gh workflow run .github/workflows/night-batch-self-hosted.yml --ref main --field config_path=config/night_batch/bundle-foreground-reuse-failed36-config.json`
- `gh run list --workflow night-batch-self-hosted.yml --limit 5`

## リスク・注意点

- apply failure は Pine source のロジックではなく TradingView 側の UI 遷移条件で起きている可能性があり、source 修正だけで消えない場合がある
- workflow は self-hosted Windows runner と TradingView 稼働状態に依存する
- workflow_dispatch は `main` 上の config / source を読むため、dispatch 前に変更を push する必要がある
- artifact と `docs/research/current/` は未追跡のまま残っているため、commit 対象を広げないよう注意する
- `tests/windows-run-night-batch-self-hosted.test.js` には今回変更と無関係な既存失敗 (`docs/reports/night-batch-self-hosted-run8.md`, `docs/reports/README.md` 欠落) がある

## 実行メモ

- `gh workflow run night-batch-self-hosted.yml --ref main --field config_path=config/night_batch/bundle-foreground-reuse-failed36-config.json` を実行済み
- 最新 run は `25200274527`
- URL: `https://github.com/FPXszk/Oh-MY-TradingView/actions/runs/25200274527`
- 状態確認時点では `in_progress`

## 範囲外

- failed 36 campaign の full 結果要約作成
- 他 campaign への横展開
- night batch workflow 自体の再設計

---

作成者: Codex
作成日時: 2026-05-01T11:58:00+09:00
