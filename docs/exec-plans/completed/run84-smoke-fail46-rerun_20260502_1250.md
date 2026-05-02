# Exec-plan: run84-smoke-fail46-rerun_20260502_1250

作成日時: 2026-05-02 12:50 JST

## 目的

`Night Batch Self Hosted #84` (`run_id=25216630873`, `2026-05-01 22:45 JST` 開始) の smoke で failure 扱いになった 46 preset だけを failed-only campaign として再実行する。あわせて、誤認に基づいて起動した canceled run (`run_id=25242230444`) を session log に明示し、正しい根拠に基づく rerun へ差し替える。

## 事実確認

- `#84` の workflow conclusion 自体は `success`
- ただし artifact `night-batch-25216630873-1/campaigns/emr-next-50pack-us40/smoke/recovered-summary.json` は `success=4`, `failure=46`, `unreadable=0`, `total=50`
- smoke の 46 failure は `recovered-results.json` 上で `apply_failed=true` / `tester_reason="Skipped: strategy not applied"` として記録されている
- 前回の確認では `result.success=true` を見て誤読し、誤った前提で rerun workflow `25242230444` を起動してしまった
- `25242230444` はユーザー指示で cancel 済み
- 現在 repo には run84 failed-only campaign / config 追加差分が入っているため、今回の主眼はその差分を正しい根拠で仕上げ、dispatch をやり直すこと

## 変更・作成対象ファイル

- 作成: `docs/exec-plans/active/run84-smoke-fail46-rerun_20260502_1250.md`
- 変更予定: `config/backtest/campaigns/emr-next-50pack-run84-failed-us40-pack.json`
- 変更予定: `config/night_batch/emr-next-50pack-run84-failed-us40-config.json`
- 変更予定: `tests/campaign.test.js`
- 変更予定: `tests/windows-run-night-batch-self-hosted.test.js`
- 変更予定: `docs/sessions/run84-failed-strategies-rerun_20260502.md`

## 実装内容と影響範囲

- run84 artifact 根拠に合わせて failed-only campaign の説明文・session log・関連テスト期待値を確認し、必要なら最小修正する
- failed-only campaign の対象は smoke fail 46 preset で固定し、smoke は `SPY`、full は `public-top10-us-40` の 40 symbols を維持する
- canceled run `25242230444` は誤起動として session log に明記する
- 正しい config を指定して `Night Batch Self Hosted` を再度 `workflow_dispatch` で起動し、新 run ID を確認する
- 影響範囲は failed-only rerun 用 campaign/config、関連テスト、session 記録、workflow dispatch

## 実装ステップ

- [x] `#84` artifact の smoke summary / recovered-results を再確認し、46 preset リストを最終固定する
- [x] failed-only campaign / config / session log / テスト文言がその根拠と矛盾していないか確認し、必要な最小修正を入れる
- [x] 対象テストを実行して green を確認する
- [x] session log に canceled run `25242230444` を誤起動として記録する
- [ ] 計画完了後、計画を `completed/` へ移動して commit / push する
- [ ] `gh workflow run night-batch-self-hosted.yml --field config_path=config/night_batch/emr-next-50pack-run84-failed-us40-config.json` を実行する
- [ ] 新しい run ID / 起動状態を確認する

## テスト戦略

- RED: 必要なら run84 failed-only campaign / config の件数・説明文・SPY smoke 前提を固定する既存テストを更新し、ズレを検出する
- GREEN: campaign / config / session log を最小修正してテストを通す
- REFACTOR: 説明文や log の文言を整理するが、campaign 対象 preset や既存 default config は変えない

## 検証コマンド

- `node --test tests/campaign.test.js`
- `node --test tests/windows-run-night-batch-self-hosted.test.js`
- `gh workflow run night-batch-self-hosted.yml --field config_path=config/night_batch/emr-next-50pack-run84-failed-us40-config.json`
- `gh run list --workflow night-batch-self-hosted.yml --limit 5`

## リスクと注意点

- `result.success=true` と campaign 集計の `failure` を取り違えないこと。正本は `recovered-summary.json`
- full 側の 230 failure をそのまま campaign 化すると 46 preset の重複展開になるため、再実行対象は smoke fail 46 preset に限定する
- canceled run `25242230444` の存在を無視すると docs と GitHub 履歴の整合が崩れる
- 既存の未関連差分 `docs/exec-plans/active/emr-next-50pack-registration-and-run_20260501_2209.md` 削除と `artifacts/night-batch/` 未追跡は今回のコミットに含めない

## スコープ外

- 46 failed preset 自体の Pine 修正
- `#84` の research レポート新規作成
- self-hosted runner / TradingView 環境そのものの恒久修正

## 実績メモ

- run84 smoke の正本は `recovered-summary.json` の `4 / 50 success`, `46 / 50 failure`
- failed-only campaign / config 自体は既存差分をそのまま採用可能で、今回の追加修正は session log への canceled run `25242230444` 記録
- テスト結果:
  - `node --test tests/campaign.test.js`
  - `node --test tests/windows-run-night-batch-self-hosted.test.js`
