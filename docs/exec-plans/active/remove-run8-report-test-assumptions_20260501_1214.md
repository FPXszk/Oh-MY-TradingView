# Exec-plan: remove-run8-report-test-assumptions_20260501_1214

## 概要

目的: `docs/reports/night-batch-self-hosted-run8.md` と `docs/reports/README.md` を欠落前提とする現方針に合わせて、`tests/windows-run-night-batch-self-hosted.test.js` の古い存在前提テストを削除または修正する。

計画作成時の確認結果:

- 現在 failing なのは `describe('docs: run 8 report')` 配下の 3 テスト
- 失敗理由は `docs/reports/night-batch-self-hosted-run8.md` と `docs/reports/README.md` の `ENOENT`
- ユーザー方針として欠落ファイルを戻すのではなく、テスト側を現状に合わせて修正する
- 既存の未追跡 artifact / research ディレクトリは今回の commit 対象に含めない

## 変更ファイル

- `docs/exec-plans/active/remove-run8-report-test-assumptions_20260501_1214.md` (本計画の作成)
- `tests/windows-run-night-batch-self-hosted.test.js` (run8 report 依存テストの削除または修正)
- `docs/exec-plans/completed/remove-run8-report-test-assumptions_20260501_1214.md` (COMMIT step で移動)

## 実装内容と影響範囲

- `docs: run 8 report` セクションを削除するか、欠落を許容する現方針に合わせた検証へ置き換える
- `tests/windows-run-night-batch-self-hosted.test.js` が `docs/reports` の消滅で失敗しない状態にする
- ほかの workflow / runner まわりのテスト意図は変えない

## 実装ステップ

- [ ] `tests/windows-run-night-batch-self-hosted.test.js` の run8 report 依存箇所を最小変更で修正する
- [ ] `node tests/windows-run-night-batch-self-hosted.test.js` で対象テストの失敗が解消したことを確認する
- [ ] 計画ファイルを `completed/` へ移動し、関連変更のみを Conventional Commits でコミットして `main` に push する

## テスト戦略

- `node tests/windows-run-night-batch-self-hosted.test.js`

## 検証コマンド

- `node tests/windows-run-night-batch-self-hosted.test.js`
- `git diff -- tests/windows-run-night-batch-self-hosted.test.js docs/exec-plans`

## リスク・注意点

- run8 report 由来の過去経緯確認点は失われるため、もし別の場所に移しているなら将来は別テストへ寄せる必要がある
- `docs/reports` 全体を前提にした別テストが今後残っていないかは、今回の最小修正範囲では追加調査しない

## 範囲外

- `docs/reports` の再作成
- workflow ロジックの変更
- 他テストファイルの整理

---

作成者: Codex
作成日時: 2026-05-01T12:14:00+09:00
