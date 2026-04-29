# Exec-plan: run-night-batch_20260429_2344

## 概要

目的: GitHub Actions の `Night Batch Self Hosted` ワークフローを**余計な変更を行わずにそのまま**実行（workflow_dispatch）する。

- 実行対象ワークフロー: .github/workflows/night-batch-self-hosted.yml (Night Batch Self Hosted)
- 実行ブランチ: main
- 使用 config_path: config/night_batch/bundle-foreground-reuse-config.json (既定)

## 変更ファイル（本プランで作成/変更するもの）

- docs/exec-plans/active/run-night-batch_20260429_2344.md (このファイルを作成)

※ コード変更は一切行わない。ワークフロー起動のみ。

## 実施手順

1. 本ファイルを `docs/exec-plans/active/` に作成してコミット（docs: exec-plan ...）
2. `gh workflow run .github/workflows/night-batch-self-hosted.yml --ref main --field config_path=config/night_batch/bundle-foreground-reuse-config.json` を実行して workflow_dispatch をトリガー
3. `gh run list --workflow .github/workflows/night-batch-self-hosted.yml --limit 5` で直近実行状況を確認
4. 必要に応じて `gh run view <run-id>` でログを確認し、問題があれば報告する

## 検証コマンド（実行後）

- gh run list --workflow .github/workflows/night-batch-self-hosted.yml --limit 5
- gh run view <run-id>

## リスク・注意点

- Self-hosted runner がオフラインだとジョブが失敗またはキューに入る（要監視）
- ワークフローは長時間走る可能性があるため、リソース消費を監視する
- 非意図的な環境変更は行わない（config_path は既定を使用）

## 範囲

- 実行のみ。ワークフロー内の処理内容には踏み込まない。

---

作成者: Copilot
作成日時: 2026-04-29T23:44:04+09:00
