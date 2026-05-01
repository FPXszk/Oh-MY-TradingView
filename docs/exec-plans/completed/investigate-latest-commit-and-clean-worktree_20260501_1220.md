# Exec-plan: investigate-latest-commit-and-clean-worktree_20260501_1220

## 概要

目的: 最新コミット `caec28b` の変更内容を確認し、現在 `git status` を汚している未追跡物を整理して、push 済みかつクリーンな作業ツリー状態にする。

計画作成時の確認結果:

- 最新コミットは `caec28b` (`test: remove run8 report workflow assumptions`)
- 当該コミットの変更対象は `tests/windows-run-night-batch-self-hosted.test.js` と exec-plan 完了ファイルのみ
- 現在の未追跡物は以下の 3 ディレクトリ
  - `artifacts/campaigns/ema-breakout-winrate-stopout-failed-us40-pack/`
  - `artifacts/campaigns/ema-macd-rsi-breakout-us40-50pack/`
  - `docs/research/current/`
- ブランチは `main` で、直前コミットはすでに `origin/main` へ push 済み

## 変更ファイル

- `docs/exec-plans/active/investigate-latest-commit-and-clean-worktree_20260501_1220.md` (本計画の作成)
- `.gitignore` または関連 ignore 設定ファイル (未追跡物を ignore で解消する場合のみ)
- `docs/exec-plans/completed/investigate-latest-commit-and-clean-worktree_20260501_1220.md` (COMMIT step で移動)

## 実装内容と影響範囲

- 最新コミット `caec28b` の内容と影響範囲を確認する
- 未追跡ディレクトリが生成物なのか恒久ファイルなのかを切り分ける
- 必要に応じて削除または ignore で整理し、`git status` がクリーンになるようにする
- 必要な追加変更があれば commit / push し、最終的に `main` をクリーンな状態に揃える

## 実装ステップ

- [ ] 最新コミット `caec28b` の差分と意図を確認し、追加対応の必要有無を整理する
- [ ] 未追跡の 3 ディレクトリの内容を確認し、削除対象と ignore 対象を判定する
- [ ] 最小変更で作業ツリーをクリーンにする
- [ ] `git status --short` でクリーンな状態を確認する
- [ ] 計画ファイルを `completed/` へ移動し、必要な変更のみを Conventional Commits でコミットして `main` に push する

## テスト戦略

- コード変更が入る場合のみ、該当範囲の最小テストを実行する
- 状態確認は `git status --short` を主要検証とする

## 検証コマンド

- `git show --stat caec28b`
- `find artifacts/campaigns/ema-breakout-winrate-stopout-failed-us40-pack -maxdepth 2 -type f | head`
- `find artifacts/campaigns/ema-macd-rsi-breakout-us40-50pack -maxdepth 2 -type f | head`
- `find docs/research/current -maxdepth 2 -type f | head`
- `git status --short`

## リスク・注意点

- 未追跡ディレクトリの中にユーザーが保持したい手動成果物がある可能性がある
- 削除ではなく ignore に寄せる場合、repo ポリシーと噛み合わない ignore を追加しないよう注意する
- 既存の未追跡物は今回の自動実行や調査で生成されたものを含む可能性があるため、内容確認前に雑に消さない

## 範囲外

- 最新コミット以前の履歴整理
- research / artifact の内容要約作成
- workflow の再実行

---

作成者: Codex
作成日時: 2026-05-01T12:20:00+09:00
