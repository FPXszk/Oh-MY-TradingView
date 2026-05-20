# SBI Workflow Finalization Plan

## Goal

`SBI Portfolio Capture` workflow の残タスクを詰め切り、capture artifact から生成する report が `実現損益` だけでなく `配当金・分配金履歴` も本文へ取り込み、米国株 CSV が将来 artifact に現れた場合にも自然に吸収できる状態まで完成させる。

今回の成功条件は次のとおり。

- `DISTRIBUTION_*.csv` を parse して report 本文に配当サマリーまたは履歴として表示できる
- capture dir / downloads dir の入力認識が、配当 CSV と米国株 CSV を明示的に扱える
- unit test で新しい parser / report 出力を固定できる
- live workflow run 後の artifact から report が完成形に近い内容を出せる

## Files

- 変更: `scripts/sbi/build-portfolio-report.mjs`
- 変更: `tests/sbi-portfolio-report.test.js`
- 変更の可能性あり: `scripts/sbi/capture-portfolio-data.mjs`
- 変更の可能性あり: `tests/sbi-capture-workflow.test.js`
- 変更: `docs/strategy/sbi-portfolio-report-workflow.md`
- 変更: `docs/sessions/` 配下の durable session log
- 移動: `docs/exec-plans/active/sbi-workflow-finalization_20260521_0107.md` -> `docs/exec-plans/completed/`（COMMIT step）

## Scope

### In Scope

- `DISTRIBUTION_*.csv` の parser 実装
- report への配当サマリー / 明細反映
- capture artifact / downloads dir の source discovery を配当 CSV と米国株 CSV 前提で仕上げる
- 必要なら米国株 CSV が存在するケースの parser / wiring を補強する
- unit test と live workflow run による完成確認

### Out Of Scope

- SBI ログイン自動化
- 発注、取消、入出金など read-only 以外の操作
- 米国株ページ上で direct CSV button が存在しない場合の無理な別実装
- workflow 基盤自体の GitHub-hosted 化

## Impact

- report 単体で `現ポートフォリオ + 実現損益 + 配当履歴` まで読めるようになる
- capture artifact に未解析 CSV が残り続ける状態を減らせる
- 将来 `sbi_us_stocks.csv` が artifact に現れたときも report 側で即利用できる

## Test Strategy

- `tests/sbi-portfolio-report.test.js` を先に RED 化し、配当 CSV parser と report 出力期待値を追加する
- 実装して GREEN にする
- 必要な場合のみ `tests/sbi-capture-workflow.test.js` を更新し、capture 側の source wiring を固定する
- 最後に live workflow run を実行し、artifact と report 出力を確認する

## Validation Commands

- `node --test tests/sbi-portfolio-report.test.js`
- `node --test tests/sbi-capture-workflow.test.js`
- `gh workflow run "SBI Portfolio Capture" --ref main --field cdp_host=127.0.0.1 --field cdp_port=9222 --field output_dir=docs/reports/screener/portfolio/capture/latest --field dry_run=false`
- `gh run list --workflow "SBI Portfolio Capture" --limit 1`

## Risks

- `DISTRIBUTION_*.csv` の列構造が run ごとに微妙に違う可能性がある
- 米国株 direct CSV は現時点でも live 画面で候補が見えていないため、code 側だけで完了できない可能性がある
- report に表を足しすぎると可読性が落ちるため、要約と明細のバランスが必要

## Implementation Steps

- [x] `tests/sbi-portfolio-report.test.js` に配当 CSV parser / report 表示の期待値を追加する
- [x] `scripts/sbi/build-portfolio-report.mjs` に配当 CSV parser と report 反映を実装する
- [x] 必要なら source discovery / capture 側 wiring を最小変更で補強する
- [x] unit test を通し、既存 report 出力に回帰がないことを確認する
- [ ] live workflow run で artifact と report を確認する
- [x] durable session log を更新する
- [ ] workflow 手順書を更新する
