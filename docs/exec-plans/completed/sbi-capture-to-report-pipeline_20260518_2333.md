# Exec-plan: sbi-capture-to-report-pipeline_20260518_2333

## Goal

`SBI Portfolio Capture` で取得した CDP artifact から、可能な範囲で `build-portfolio-report` まで 1 本でつながるようにする。今回の成功条件は、workflow または同等のローカル実行で以下を満たすこと。

- `https://site.sbisec.co.jp/account/assets` 相当の「マイ資産」ページを authenticated session 経由で capture 対象に含める
- ダウンロードした CSV を内容ベースで識別し、汎用名 `New_file.csv` のまま放置しない
- フル CSV が不足していても、capture directory の snapshot / downloads を入力にして Markdown レポートを生成できる
- workflow から capture 後に report 生成を実行し、成果物を artifact 化できる

## Files

- Create: `docs/exec-plans/active/sbi-capture-to-report-pipeline_20260518_2333.md`
- Update: `scripts/sbi/capture-portfolio-data.mjs`
- Update: `scripts/sbi/build-portfolio-report.mjs`
- Update: `.github/workflows/sbi-portfolio-capture.yml`
- Update: `tests/sbi-capture-workflow.test.js`
- Update: `tests/sbi-portfolio-report.test.js`
- Update: `docs/strategy/sbi-portfolio-report-workflow.md`
- Create: `docs/sessions/sbi-capture-to-report-pipeline_20260518_2333.md`
- Move on COMMIT step: `docs/exec-plans/active/sbi-capture-to-report-pipeline_20260518_2333.md` -> `docs/exec-plans/completed/sbi-capture-to-report-pipeline_20260518_2333.md`

## Scope

- capture script に「マイ資産」URL capture と CSV 識別ロジックを追加
- report script に capture directory フォールバック入力を追加
- workflow に report build step を追加
- 単体テストと live workflow で検証

## Out Of Scope

- SBI ログインの自動化
- 発注、取消、入出金などの書き込み操作
- 日本株・米国株・投信のすべての詳細 CSV 導線を今回中に完全網羅する保証
- 定期実行 automation の作成

## Test / Validation Strategy

- RED:
  - 既存 tests が新要件で足りなければ失敗ケースを先に追加する
  - live capture で `account/assets` が読めない、または report build が入力不足で落ちるケースを露出させる
- GREEN:
  - `node --test tests/sbi-capture-workflow.test.js`
  - `node --test tests/sbi-portfolio-report.test.js`
  - `gh workflow run "SBI Portfolio Capture" --ref main --field cdp_host=127.0.0.1 --field cdp_port=9222 --field output_dir=docs/reports/screener/portfolio/capture/latest --field dry_run=false`
  - `gh run view <RUN_ID> --log-failed`
- Validation focus:
  - capture artifact に `account-assets` 系 snapshot が入ること
  - CSV が識別名で保存されること
  - report markdown が artifact に含まれること

## Risks

- `account/assets` は未ログイン公開アクセスではメンテ画面へ飛ぶため、authenticated session 前提が崩れると取得できない
- `マイ資産` ページの DOM や文言が想定と違う場合、snapshot は取れても parser の精度が不足する可能性がある
- 同一 workflow 内で repo 生成物を増やすため、入出力パスの取り扱いを雑にすると artifact が散る

## Steps

- [x] Step 1: 現行 capture artifact / scripts / tests を確認し、`account/assets` と report build の最小実装方針を固める
- [x] Step 2: exec-plan を保存し、docs-only commit と push を行う
- [x] Step 3: capture script と tests を更新し、`マイ資産` capture と CSV 識別を実装する
- [x] Step 4: report script と workflow を更新し、capture directory から report 生成までつなぐ
- [x] Step 5: tests と live workflow を実行して結果を確認する
- [x] Step 6: docs / session log を更新し、exec-plan を completed へ移動して commit / push する
