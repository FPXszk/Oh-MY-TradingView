# Exec-plan: remove-preset-validation-test-and-run-failed36-workflow_20260501_1153

## 概要

目的: `tests/preset-validation.test.js` を削除し、run79 で失敗していた 36 戦略だけを集めた campaign を使って実ワークフローを実行し、実行可否と結果を確認する。

計画作成時の確認結果:

- 対象 campaign は `config/backtest/campaigns/ema-breakout-winrate-stopout-failed-us40-pack.json`
- 前回修正で `src/core/preset-validation.js` に `raw_source` 向けの `stop_loss.type = custom` 許可を追加済み
- `tests/preset-validation.test.js` には今回修正と無関係な既存失敗が 2 件残っている
- 実 smoke 実行では `artifacts/campaigns/ema-breakout-winrate-stopout-failed-us40-pack/smoke/checkpoint-30.json` 時点で `30/36, 0 failures` まで確認済み
- 作業ツリーには未追跡の artifact / research ディレクトリがあるため、commit 対象を明示的に絞る必要がある

## 変更ファイル

- `docs/exec-plans/active/remove-preset-validation-test-and-run-failed36-workflow_20260501_1153.md` (本計画の作成)
- `tests/preset-validation.test.js` (削除)
- `docs/exec-plans/completed/remove-preset-validation-test-and-run-failed36-workflow_20260501_1153.md` (COMMIT step で移動)

## 実装内容と影響範囲

- `tests/preset-validation.test.js` を削除し、preset validation の個別テスト経路をなくす
- run79 failed 36 専用 campaign を対象に、既存の backtest workflow 相当コマンドを実行する
- 実行結果は checkpoint / final artifact を確認し、36 戦略が smoke で完走したか、どこで止まったかを記録する
- artifact 出力は検証用途にとどめ、生成物自体は commit しない

## 実装ステップ

- [x] `tests/preset-validation.test.js` を削除する
- [x] 削除影響を受ける参照や test コマンドを確認し、今回必要な範囲だけ整合を取る
- [x] failed 36 campaign の実行コマンドを確定し、smoke workflow を起動する
- [x] checkpoint / final artifact を確認し、成功件数・失敗件数・失敗戦略を整理する
- [x] 計画ファイルを `completed/` へ移動し、関連変更のみを Conventional Commits でコミットして `main` に push する

## テスト戦略

- `tests/preset-validation.test.js` 削除後、少なくとも campaign 構成テストが壊れていないことを確認する
- 実 backtest 実行結果をもって smoke workflow の検証とする

## 検証コマンド

- `node --test tests/campaign.test.js`
- `node scripts/backtest/run-finetune-bundle.mjs --phases smoke --us-campaign ema-breakout-winrate-stopout-failed-us40-pack`
- `git diff -- tests docs/exec-plans`

## リスク・注意点

- workflow 実行はローカル環境の TradingView 接続や長時間実行に依存するため、完走まで時間がかかる可能性がある
- artifact は未追跡ファイルとして残るため、commit 範囲に含めないよう注意する
- `tests/preset-validation.test.js` を削除すると preset validator の単体回帰点が減る

## 範囲外

- failed 36 campaign の full 40 銘柄実行
- validator 実装の追加変更
- 既存の未追跡 artifact / research ディレクトリの整理

---

作成者: Codex
作成日時: 2026-05-01T11:53:00+09:00
