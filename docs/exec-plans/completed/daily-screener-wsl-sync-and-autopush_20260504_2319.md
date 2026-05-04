# Exec-plan: daily-screener-wsl-sync-and-autopush_20260504_2319

## 概要

目的: GitHub Actions の `Daily Fundamental Screener` ワークフロー完了時に、Windows self-hosted runner 上で生成した `docs/reports/screener/daily-ranking.md` を WSL 側の live checkout にコピーし、`main` へ自動 commit / push できる状態にする。

- push 先は `main`
- レポート差分がなくても、workflow run 情報を書いた補助ファイルを毎回更新して commit を発生させる
- 既存の artifact upload は維持し、スマホからはリモートリポジトリ上の最新結果を確認できるようにする
- `docs/exec-plans/active/` の既存 plan（`repo-structure-align-and-archive-rules_20260424_2015.md`, `run-night-batch_20260429_2344.md`）とは対象が重ならない

## 変更ファイル（作成 / 変更 / 実行時更新）

- 変更: `.github/workflows/daily-screener.yml`
- 作成: `scripts/windows/github-actions/sync-daily-screener-report-to-wsl.ps1`
- 変更: `tests/daily-screener-report.test.js`
- 作成または実行時更新: `docs/reports/screener/daily-ranking-run.json`

## 実装方針

1. `daily-screener.yml` に、スクリーナー実行後の metadata 生成 + WSL 同期 step を追加する
2. Windows checkout から WSL repo path を `wsl.exe wslpath` で解決し、`daily-ranking.md` と `daily-ranking-run.json` を WSL 側へ反映する PowerShell スクリプトを追加する
3. 同期スクリプト内で対象 2 ファイルだけを `git add` し、workflow run 情報を含む commit message で `main` に push する
4. artifact upload は report と metadata の両方が確認できる形へ調整し、失敗時は step を黙殺せずエラーを返す

## 範囲

含む:

- Daily Fundamental Screener workflow の publish 自動化
- WSL 側 repo へのファイル同期
- `main` への自動 commit / push
- 毎回 commit を成立させるための run metadata 管理

含まない:

- スクリーナーの選定ロジック変更
- night batch や他 workflow への横展開
- PR ベース配信や branch 切り替えフローの追加
- 過去レポートの backfill

## 実装ステップ

- [ ] `tests/daily-screener-report.test.js` を拡張し、workflow に metadata 生成 / WSL 同期 / artifact 維持が入ることを先に落とす
- [ ] `scripts/windows/github-actions/sync-daily-screener-report-to-wsl.ps1` を追加し、Windows checkout → WSL checkout のコピーと限定 commit / push を実装する
- [ ] `.github/workflows/daily-screener.yml` を更新し、report 生成後に metadata 作成・同期・upload が流れるよう接続する
- [ ] 実行経路を見直し、commit 対象が 2 ファイルに限定されることと、失敗時に異常終了することを確認する

## テスト戦略

RED:

- `tests/daily-screener-report.test.js` を先に拡張し、workflow に publish step が未実装の状態で失敗させる

GREEN:

- workflow と PowerShell スクリプトを追加して、Node test が通る状態にする

REFACTOR:

- path / step 名 / metadata キーを整理し、workflow の可読性を維持する

## 検証コマンド

- `node --test tests/daily-screener-report.test.js`
- `npm test`
- `gh workflow run .github/workflows/daily-screener.yml --ref main`
- `gh run list --workflow .github/workflows/daily-screener.yml --limit 5`

## リスク・注意点

- GitHub Actions runner サービスから見た WSL 環境に SSH push 権限がないと、自動 push は失敗する
- WSL 側 checkout が `main` 以外、または対象ファイルに未コミット差分がある場合、意図しない競合や commit 失敗が起きる
- workflow から `main` へ直接 push するため、同時刻の手動 push と競合する可能性がある
- 差分なし日も毎回 commit する設計なので、補助 metadata ファイルの更新ルールを明示的に保つ必要がある

---

作成者: Copilot
作成日時: 2026-05-04T23:19:25+09:00
