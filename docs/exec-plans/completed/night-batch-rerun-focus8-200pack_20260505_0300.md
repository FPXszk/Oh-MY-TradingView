# Exec-plan: night-batch-rerun-focus8-200pack_20260505_0300

## 概要

目的: `Night Batch Self Hosted` 本番 workflow を、**200戦略 × 8銘柄** の対象で再実行する。

今回の実行対象:

- workflow: `.github/workflows/night-batch-self-hosted.yml`
- branch: `main`
- config_path: `config/night_batch/emr-entry-quality-focus8-200pack-production-config.json`

根拠:

- `config/night_batch/emr-entry-quality-focus8-200pack-production-config.json` の `bundle.us_campaign` は `emr-entry-quality-focus8-200pack`
- `tests/campaign.test.js` ではこの campaign が **8 symbols × 200 strategies = 1600 runs** になることを固定している
- したがって、今回の依頼「修正後のもので再度 200戦略 8銘柄をやり直す」に一致する

補足:

- GitHub API 上では `Night Batch Self Hosted #93` は現在 `success` 表示だが、依頼どおり **修正後の本番 rerun** を実行する
- `Night Batch Smoke #11` は別 workflow で `success`。今回は smoke ではなく self-hosted production workflow を実行する

## 変更ファイル

- `docs/exec-plans/active/night-batch-rerun-focus8-200pack_20260505_0300.md` (この計画のみ)

コード変更は行わない。

## 実施ステップ

- [ ] 対象 config と workflow を固定する
  - `Night Batch Self Hosted`
  - `config/night_batch/emr-entry-quality-focus8-200pack-production-config.json`

- [ ] 本番 workflow を dispatch する
  - `gh workflow run "Night Batch Self Hosted" --ref main --field config_path=config/night_batch/emr-entry-quality-focus8-200pack-production-config.json`

- [ ] 実行状況を監視する
  - 新しい run id を取得する
  - `gh run watch <run-id>` または同等手段で進行確認する
  - 失敗時は新しい run の具体的な失敗点だけを報告する

## テスト戦略

- RED/GREEN のコード実装はなし
- 検証は workflow dispatch 成功と run 状態確認で行う

## 検証コマンド

- `gh workflow run "Night Batch Self Hosted" --ref main --field config_path=config/night_batch/emr-entry-quality-focus8-200pack-production-config.json`
- `gh run list --workflow "Night Batch Self Hosted" --limit 5`
- `gh run view <run-id>`

## リスク・注意点

- self-hosted Windows runner / TradingView 実機状態に依存する
- production run は長時間化する可能性がある
- smoke 成功がそのまま production 成功を保証するわけではない

## 競合確認

- `docs/exec-plans/active/` の既存 active plan は `repo-structure-align-and-archive-rules_20260424_2015.md` と `run-night-batch_20260429_2344.md`
- 今回は rerun 対象が異なる operational task で、直接競合しない

---

作成者: Copilot
作成日時: 2026-05-05T03:00:00+09:00
