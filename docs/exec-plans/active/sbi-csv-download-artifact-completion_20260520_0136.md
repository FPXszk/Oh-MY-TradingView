# SBI CSV Download Artifact Completion Plan

## Goal

`SBI Portfolio Capture` workflow で、`実現損益詳細` と `配当金・分配金履歴` に見えている `CSVダウンロード` を実際に押し、CSV 本体を artifact の `downloads/` に保存できるところまで完了させる。

今回の成功条件は、live workflow run 後の artifact で少なくとも次を確認できること。

- `downloads/` に `実現損益詳細` 由来 CSV が追加されている
- `downloads/` に `配当金・分配金履歴` 由来 CSV が追加されている、または取得不能理由が summary に明確に残る
- `capture-summary.md` に route ごとの CSV click / download 成否が残る
- `sbi_portfolio_report.md` と手順書 / session log が最新挙動に追随している

## Files

- 変更: `scripts/sbi/capture-portfolio-data.mjs`
- 変更: `scripts/sbi/build-portfolio-report.mjs`
- 変更: `tests/sbi-capture-workflow.test.js`
- 変更: `tests/sbi-portfolio-report.test.js`
- 変更: `docs/strategy/sbi-portfolio-report-workflow.md`
- 作成または更新: `docs/sessions/` 配下の durable session log

## Scope

### In Scope

- `実現損益詳細` / `配当金・分配金履歴` の `CSVダウンロード` click 精度を上げる
- download 完了待ちとファイル分類を補強する
- route summary に CSV click / file detection の事実を残す
- report builder が新たに落ちた CSV を拾えるなら最小限で反映する
- unit test、workflow 手順書、durable session log を更新する
- live workflow run を実行し、artifact で到達点を確認する

### Out Of Scope

- ログイン自動化
- 発注、取消、入出金など read-only 以外の操作
- SBI 画面全体の大規模リファクタ
- 配当 CSV の新規フル parser を先回りで作ること

## Impact

- workflow artifact だけで「画面到達」から「CSV 本体回収」まで確認できる
- `build-portfolio-report` が既存対応済み CSV をより厚く取り込める
- 失敗時も、button 不一致なのか download 完了待ちなのかを summary から切り分けやすくなる

## Test Strategy

- `tests/sbi-capture-workflow.test.js` を先に落とし、CSV click / download 結果の summary 期待値を固める
- 必要なら `tests/sbi-portfolio-report.test.js` を追加更新し、新規 CSV の取り込み挙動を確認する
- 実装後に対象テストを実行する

## Validation Commands

- `node --test tests/sbi-capture-workflow.test.js`
- `node --test tests/sbi-portfolio-report.test.js`
- `gh workflow run "SBI Portfolio Capture" --ref main --field cdp_host=127.0.0.1 --field cdp_port=9222 --field output_dir=docs/reports/screener/portfolio/capture/latest --field dry_run=false`
- `gh run list --workflow "SBI Portfolio Capture" --limit 1`

## Risks

- SBI の `CSVダウンロード` が通常 click ではなく inline JS / popup / form submit 前提の可能性がある
- download が一時ファイル名で落ち、現行の分類ロジックでは十分待てない可能性がある
- 配当 CSV は既存 parser 未対応の形式かもしれず、artifact 保存までは成功しても report 反映は限定的になりうる
- self-hosted runner 側の live 状態に依存するため、同じ commit でも run ごとの差が出る可能性がある

## Implementation Steps

- [ ] `scripts/sbi/capture-portfolio-data.mjs` の CSV button 探索・click・download 完了待ちを見直し、`実現損益詳細` / `配当金・分配金履歴` で実ファイル回収を狙う
- [ ] 必要最小限で `scripts/sbi/build-portfolio-report.mjs` を調整し、新規 download の扱いを安定させる
- [ ] `tests/sbi-capture-workflow.test.js` と必要な report test を更新する
- [ ] 手順書と durable session log を更新する
- [ ] live workflow run を実行し、artifact で CSV 本体回収の成否を確認する
