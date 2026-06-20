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

- [x] 事前確認: workflow 名、default branch、self-hosted runner 状態、直近 run 状態を確認する
- [x] US workflow `Daily Fundamental Screener` を手動実行し、run id を記録する
- [x] JP workflow `Daily Fundamental Screener Japan` を手動実行し、run id を記録する
- [x] 両 run を完了まで監視し、job/step 結果と artifact/publish/LINE 通知 step を確認する
- [x] 異常があればログを深掘りし、runner・secret・外部 API・スクリーナー処理のどこに属するか切り分ける
- [x] 改善点を短く整理し、計画を `completed/` に移動して結果をコミット・プッシュする

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

## 実行結果

- 事前確認: self-hosted Windows runner `omtv-win-01` は `online` / `busy=false`。
- US: run `27869371176` は success。スクリーナー本体は `totalScanned=307 serverFiltered=204 phase1Filtered=204 clientFiltered=178 matched=90`。
- US artifact: `screener-report-27869371176`、artifact id `7764803098`。
- US publish: commit `326df73` (`docs: daily screener report run 27869371176-1`) を main に push。
- JP 初回: run `27869371729` は failure。スクリーナー本体と artifact upload までは成功し、`Publish screener report to main` で失敗。
- JP 初回の原因: US publish が先に main を `bdd9808` から `326df73` に進めたため、JP checkout HEAD が origin/main と一致せず、`checkout HEAD must match origin/main before publishing reports` で停止。
- JP 再実行: run `27869434609` は success。スクリーナー本体は `totalScanned=378 serverFiltered=263 phase1Filtered=263 clientFiltered=246 matched=60`。
- JP EDINET: `enabled=true reason=active requested=183 documents=37539 docsWithSecCode=16230 secCodeMatched=157 eligibleDoc=106 csvEligible=106 matchedFilings=106 downloaded=106 factRows=106 errors=0 supplemented=106`。
- JP artifact: `screener-report-japan-27869434609`、artifact id `7764819761`。
- JP publish: commit `e3dd3ba` (`docs: daily screener japan report run 27869434609-1`) を main に push。
- LINE: US/JP とも step 自体は success だが、`LINE_CHANNEL_ACCESS_TOKEN` または `LINE_TO_USER_ID` 未設定のため `[line] skipped`。GitHub secrets は `EDINET_API_KEY` のみ。

## 改善点

- US/JP を同時に手動実行すると、どちらか一方が main publish 後の HEAD 不一致で失敗し得る。手動運用では片方の publish 完了後にもう片方を起動する。
- workflow 側で恒久対応するなら、US/JP の publish step に concurrency group を設定するか、publish script 側で origin/main を取り込んで report ファイルだけ安全に再適用する設計を検討する。
- LINE 通知を実際に送るには GitHub secrets `LINE_CHANNEL_ACCESS_TOKEN` と `LINE_TO_USER_ID` を設定する。
- `actions/checkout@v4`、`actions/setup-node@v4`、`actions/upload-artifact@v4` が Node.js 20 deprecated warning を出している。実害はないが、今後 action のメジャー更新または runner 側対応を確認する。
