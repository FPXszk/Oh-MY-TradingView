# Exec-plan: fix-run79-failed-presets-and-remove-ci_20260501_1128

## 概要

目的: `Night Batch Self Hosted #79` で失敗した戦略を洗い出し、smoke が通るように preset 定義を修正し、失敗戦略だけを集めた専用 campaign を設定値として登録する。あわせて `.github/workflows/ci.yml` の役割を確認したうえで、依頼どおり workflow を削除する。

計画作成時の確認結果:

- 最新の失敗一覧は run79 artifact `full/final-results.json` の `failure_budget.blocked_presets` にあり、blocked は `36` 件
- `35` 件は `stop_loss.type must be one of: hard_percent, atr_stop` で停止しており、`stop_loss.type = custom` を持つ preset 群が原因
- 残り `1` 件は `emr-breakout-winrate-stopout-entry-rsi60-price-above-ema200` で、理由は `Strategy not verified in chart studies after compile + retry`
- 既存 50-pack campaign は `config/backtest/campaigns/ema-breakout-winrate-stopout-us40-50pack.json`
- `ci.yml` は現在 `push(main)` / `pull_request` / `workflow_dispatch` で `npm run test:ci` を回す最小限の自動回帰 workflow
- 進行中の active plan は `repo-structure-align-and-archive-rules_20260424_2015.md` と `run-night-batch_20260429_2344.md` で、今回の変更対象とは重ならない

## 変更ファイル

- `docs/exec-plans/active/fix-run79-failed-presets-and-remove-ci_20260501_1128.md` (本計画の作成)
- `config/backtest/strategy-presets.json` (run79 失敗 preset の stop_loss 定義修正)
- `config/backtest/strategy-catalog.json` (preset/campaign 整合性維持のため必要最小限更新)
- `config/backtest/campaigns/ema-breakout-winrate-stopout-failed-us40-pack.json` (失敗戦略だけを集めた新規 campaign)
- `tests/preset-validation.test.js` (失敗原因だった stop_loss schema の回帰テスト追加/補強)
- `tests/campaign.test.js` (新規 failed-pack campaign の smoke/full 構成テスト追加)
- `tests/strategy-catalog.test.js` または関連整合性テスト (catalog/preset 更新に伴い必要なら最小限更新)
- `.github/workflows/ci.yml` (削除)
- `docs/exec-plans/completed/fix-run79-failed-presets-and-remove-ci_20260501_1128.md` (COMMIT step で移動)

## 実装内容と影響範囲

- run79 blocked preset 一覧を根拠に、`ema-breakout-winrate-stopout` 系の失敗戦略だけを campaign 化する
- `stop_loss.type = custom` を validator が受理する形へ寄せるか、各 preset を `hard_percent` / `atr_stop` の既存 schema に合わせて修正する
- `entry-rsi60-price-above-ema200` の smoke failure は preset / source / compile 前提を確認し、最低でも smoke で 1 銘柄通る状態まで直す
- 新 campaign は smoke を `SPY` 1 銘柄にし、失敗戦略数ぶんだけ実行する構成にする
- `.github/workflows/ci.yml` を削除すると GitHub 上の自動 `npm run test:ci` がなくなるため、その影響は明示してコミットする

## 実装ステップ

- [x] run79 の blocked preset 一覧を codebase 上の preset 定義へ対応付け、修正対象 strategy id を確定する
- [x] `strategy-presets.json` と必要なら `strategy-catalog.json` の stop_loss 定義を validator 整合へ修正する
- [x] `entry-rsi60-price-above-ema200` の smoke failure 原因を確認し、smoke 通過を阻害する設定不整合があれば修正する
- [x] 失敗戦略だけを集めた `ema-breakout-winrate-stopout-failed-us40-pack` campaign を新規追加する
- [x] preset validation / campaign 構成のテストを追加または更新し、失敗戦略 pack の smoke 行列と stop_loss schema 回帰を固定する
- [x] `.github/workflows/ci.yml` を削除する
- [x] 関連テストを実行し、必要なら failed-pack campaign の smoke をローカル実行して通過を確認する
- [x] 計画ファイルを `completed/` へ移動し、関連変更のみを Conventional Commits でコミットして `main` に push する

## テスト戦略

- RED: run79 failure を再現できる preset validation / campaign 構成テストを先に確認し、失敗条件を固定する
- GREEN: stop_loss schema 修正後に `tests/preset-validation.test.js`、`tests/campaign.test.js`、必要な catalog 整合テストを通す
- REFACTOR: なし。run79 failure 修正、failed-pack 登録、CI workflow 削除の最小変更に限定する

## 検証コマンド

- `node --test tests/preset-validation.test.js tests/campaign.test.js tests/strategy-catalog.test.js`
- `node --test tests/windows-run-night-batch-self-hosted.test.js`
- `node scripts/backtest/run-finetune-bundle.mjs --phases smoke --us-campaign ema-breakout-winrate-stopout-failed-us40-pack`
- `git diff -- config/backtest tests .github/workflows docs/exec-plans`

## リスク・注意点

- `strategy-presets.json` と `strategy-catalog.json` のどちらも live data として扱われているため、片側だけ直すと整合性テストが壊れる可能性が高い
- `entry-rsi60-price-above-ema200` の compile/apply failure は stop_loss schema とは別系統で、preset JSON だけでは直らない可能性がある
- `.github/workflows/ci.yml` を削除すると、GitHub 上で自動的に repo 全体テストを回す標準経路がなくなる
- 作業ツリーには未追跡の `artifacts/campaigns/ema-macd-rsi-breakout-us40-50pack/` と `docs/research/current/` があるため、commit 対象を広げないよう注意する

## 範囲外

- Night Batch Self Hosted workflow 自体の再設計
- 失敗戦略 pack の full 40 銘柄本実行
- `ci.yml` 削除の代替 workflow 追加

---

作成者: Codex
作成日時: 2026-05-01T11:28:00+09:00
