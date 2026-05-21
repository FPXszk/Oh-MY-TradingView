# SBI Workflow Finalization Plan

## Goal

`SBI Portfolio Capture` workflow の最終あと片付けとして、直近の live artifact と report 出力をもう一度実行確認し、期待値どおりなら docs と active plan を完了状態へ閉じる。

今回の成功条件は次のとおり。

- self-hosted runner が online の状態で `SBI Portfolio Capture` を再実行できる
- capture artifact と `sbi_portfolio_report.md` を確認し、主要セクションが概ね期待どおりであると判断できる
- workflow 手順書に最終状態と出力先を明記できる
- active plan を `completed/` へ移して commit / push できる

## Files

- 変更: `docs/strategy/sbi-portfolio-report-workflow.md`
- 変更: `docs/sessions/` 配下の durable session log
- 移動: `docs/exec-plans/active/sbi-workflow-finalization_20260521_0107.md` -> `docs/exec-plans/completed/`（COMMIT step）

## Scope

### In Scope

- live workflow run の再実行
- artifact と report 本文の最終確認
- workflow 手順書と durable session log の最終更新
- active plan のクローズ

### Out Of Scope

- SBI ログイン自動化
- 発注、取消、入出金など read-only 以外の操作
- 米国株ページ上で direct CSV button が存在しない場合の別実装追加
- workflow 基盤自体の GitHub-hosted 化

## Impact

- repo 内の durable docs と live artifact の整合が取れる
- 次回以降は active plan が残らず、運用手順をそのまま再利用できる

## Test Strategy

- code 変更は原則行わず、live workflow run を最終確認として使う
- artifact `downloads/` と `sbi_portfolio_report.md` を目視確認する
- 期待値から外れる場合のみ追加修正と targeted test を検討する

## Validation Commands

- `gh workflow run "SBI Portfolio Capture" --ref main --field cdp_host=127.0.0.1 --field cdp_port=9222 --field output_dir=docs/reports/screener/portfolio/capture/latest --field dry_run=false`
- `gh run list --workflow "SBI Portfolio Capture" --limit 1`
- `gh run watch <RUN_ID>`
- `gh run download <RUN_ID> --dir tmp/<RUN_ID>`

## Risks

- self-hosted runner が再び offline に落ちる可能性がある
- live page 側の状態差で CSV 取得結果が run ごとにぶれる可能性がある
- report の期待値判定は artifact 実測ベースで慎重に行う必要がある

## Implementation Steps

- [x] live workflow run を再実行して完走させる
- [x] artifact と `sbi_portfolio_report.md` を確認し、期待値との差分を判断する
- [x] `docs/strategy/sbi-portfolio-report-workflow.md` と durable session log を最終更新する
- [x] active plan を `completed/` に移して commit / push する
