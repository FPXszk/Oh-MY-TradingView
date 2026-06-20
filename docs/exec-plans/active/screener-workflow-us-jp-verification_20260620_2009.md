# Screener Workflow US/JP Verification

作成日時: 2026-06-20 20:09 JST

## ゴール

GitHub Actions の `Daily Fundamental Screener` と `Daily Fundamental Screener Japan` を手動実行し、どちらも異常なく完了するか確認する。異常がある場合は、ログと runner 状態から原因を切り分け、改善点を報告する。

## 変更・削除・作成するファイル

- 作成: `docs/exec-plans/active/screener-workflow-us-jp-verification_20260620_2009.md`
- 完了時に移動: `docs/exec-plans/completed/screener-workflow-us-jp-verification_20260620_2009.md`
- 原則としてコード変更なし
- 異常が見つかり、ユーザー承認なしで安全に直せる範囲を超える場合は、修正せず原因と改善案を報告する

## 実装内容と影響範囲

- `gh` CLI で US/JP のスクリーニング workflow を `workflow_dispatch` 実行する。
- `gh run view` と GitHub API で run/job/step 状態を確認する。
- self-hosted Windows runner が queued の原因になっていないか確認する。
- 成功時は artifact、publish commit、LINE 通知 step の状態を確認する。
- 失敗時は失敗 step、exit code、主要ログ、再現に必要な前提を記録する。
- 影響範囲は GitHub Actions の手動実行と実行結果の調査に限定する。

## 実装ステップ

- [ ] 事前確認: workflow 名、default branch、self-hosted runner 状態、直近 run 状態を確認する
- [ ] US workflow `Daily Fundamental Screener` を手動実行し、run id を記録する
- [ ] JP workflow `Daily Fundamental Screener Japan` を手動実行し、run id を記録する
- [ ] 両 run を完了まで監視し、job/step 結果と artifact/publish/LINE 通知 step を確認する
- [ ] 異常があればログを深掘りし、runner・secret・外部 API・スクリーナー処理のどこに属するか切り分ける
- [ ] 改善点を短く整理し、計画を `completed/` に移動して結果をコミット・プッシュする

## 検証コマンド

- `gh workflow list`
- `gh run list --workflow "Daily Fundamental Screener" --limit 5`
- `gh run list --workflow "Daily Fundamental Screener Japan" --limit 5`
- `gh api repos/FPXszk/Oh-MY-TradingView/actions/runners`
- `gh workflow run "Daily Fundamental Screener" --ref main`
- `gh workflow run "Daily Fundamental Screener Japan" --ref main`
- `gh run view <run-id> --json status,conclusion,jobs,createdAt,updatedAt,event,headBranch,headSha,url`

## リスク

- self-hosted Windows runner が offline の場合、run は queued のまま完了しない。
- JP workflow は `EDINET_API_KEY` や EDINET 側状態に依存する。
- Publish step は main への push を行うため、成功時に report 更新 commit が作成される可能性がある。
- LINE 通知 step は GitHub secrets と LINE 側設定に依存する。
