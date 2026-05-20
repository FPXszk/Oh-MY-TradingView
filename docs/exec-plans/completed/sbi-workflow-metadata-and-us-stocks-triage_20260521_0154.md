# SBI Workflow Metadata And US Stocks Triage Plan

## Goal

`SBI Portfolio Capture` workflow について、live artifact で見えている

- report 冒頭の `取得日時: n/a` / `生成元: n/a`
- 米国株 route の `csv_download_success: false`

の 2 点を、**仕様どおりの制約**か **修正すべき不具合**かに切り分け、修正可能なものは最小変更で直す。

今回の成功条件は次のとおり。

- `n/a` メタ情報の原因を source discovery / parsing / fallback のどこかまで特定する
- 修正可能なら report に `取得日時` と妥当な `生成元` が入る
- 米国株 route について、CSV 未取得が仕様上の制約か、capture/report の不具合かを evidence つきで判定する
- 修正可能なら unit test と live artifact ベースで期待挙動を確認する

## Files

- 変更: `docs/exec-plans/active/sbi-workflow-metadata-and-us-stocks-triage_20260521_0154.md`
- 変更の可能性あり: `scripts/sbi/build-portfolio-report.mjs`
- 変更の可能性あり: `scripts/sbi/capture-portfolio-data.mjs`
- 変更の可能性あり: `tests/sbi-portfolio-report.test.js`
- 変更の可能性あり: `tests/sbi-capture-workflow.test.js`
- 変更の可能性あり: `docs/strategy/sbi-portfolio-report-workflow.md`
- 変更の可能性あり: `docs/sessions/` 配下の durable session log
- 移動: `docs/exec-plans/active/sbi-workflow-metadata-and-us-stocks-triage_20260521_0154.md` -> `docs/exec-plans/completed/`

## Scope

### In Scope

- artifact 上の `n/a` メタ情報の原因調査
- report builder の source discovery / fallback の修正
- 米国株 route の capture summary / snapshot / report 出力の整合性確認
- 必要最小限の test 追加または更新
- workflow 手順書への現状反映

### Out Of Scope

- SBI ログイン自動化
- 発注、取消、入出金など read-only 以外の操作
- self-hosted runner 基盤そのものの改修
- 米国株ページに存在しない CSV を無理に生成する別実装

## Impact

- artifact だけ見ても report の provenance が分かるようになる
- 米国株 route の「未取得」が単なる制約か regressions かを判断しやすくなる
- 次回以降の live verification で、見ている failure mode を誤読しにくくなる

## Test Strategy

- まず既存 artifact / fixture で `n/a` と米国株 route の再現条件を固定する
- `tests/sbi-portfolio-report.test.js` で metadata と US stocks fallback の期待値を必要に応じて RED 化する
- capture 側の解釈変更が必要な場合のみ `tests/sbi-capture-workflow.test.js` を更新する
- 実装後に targeted tests を通し、必要なら live artifact を再確認する

## Validation Commands

- `node --test tests/sbi-portfolio-report.test.js`
- `node --test tests/sbi-capture-workflow.test.js`
- `gh run view 26175124809 --json status,conclusion,url`
- `gh run download 26175124809 --dir /tmp/sbi-run-26175124809`

## Risks

- `sbi_assets_summary.csv` が artifact に常に存在するとは限らず、metadata は fallback 設計が必要
- 米国株 route は live page 側の UI 変化で CSV が存在しないケースと selector ミスが混在しうる
- text fallback を強めすぎると、本来 CSV で取れるケースとの責務境界が曖昧になる

## Existing Plan Overlap

- `docs/exec-plans/active/sbi-workflow-finalization_20260521_0107.md`

同じ workflow 系統の継続タスクだが、今回の主眼は live verification 後に残った
`metadata` と `米国株 route` の切り分けであり、上記 plan の未消化論点を具体的に畳む補完計画として扱う。

## Implementation Steps

- [x] live artifact と既存 code を突き合わせて、`n/a` メタ情報の欠落箇所を特定する
- [x] 米国株 route の summary / snapshot / report 出力を確認し、仕様制約か不具合かを判定する
- [x] 修正可能な箇所だけを最小変更で実装する
- [x] unit test を追加または更新して挙動を固定する
- [x] workflow 手順書と session log を更新する
- [x] plan を `completed/` へ移動して commit / push する
