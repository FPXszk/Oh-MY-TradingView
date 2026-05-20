# SBI CSV Download Stability Plan

## Goal

`SBI Portfolio Capture` workflow の CSV 回収を、単発成功で終わらせず、`実現損益詳細` と `配当金・分配金履歴` の CSV 本体が wait / retry を入れた rerun でも再取得しやすい状態まで安定化する。

今回の成功条件は、live workflow run 後の artifact で少なくとも次を確認できること。

- `downloads/` に `実現損益詳細` 由来 CSV が追加されている
- `downloads/` に `配当金・分配金履歴` 由来 CSV が追加されている、または SBI 側制約で不可能な理由が route summary に具体的に残っている
- `capture-summary.md` / `capture-summary.json` に button DOM / submit 条件 / download 成否が route ごとに残る
- `sbi_portfolio_report.md` が追加取得できた CSV を既存 parser または補助artifact 表示で反映できる
- 同 revision の rerun でも、待機不足や画面未安定起因と見られる取りこぼしが減っている

## Files

- 変更: `scripts/sbi/capture-portfolio-data.mjs`
- 変更: `tests/sbi-capture-workflow.test.js`
- 変更の可能性あり: `scripts/sbi/build-portfolio-report.mjs`
- 変更の可能性あり: `tests/sbi-portfolio-report.test.js`
- 変更: `docs/strategy/sbi-portfolio-report-workflow.md`
- 作成または更新: `docs/sessions/` 配下の durable session log
- 移動: `docs/exec-plans/active/sbi-csv-download-completion_20260521_0004.md` -> `docs/exec-plans/completed/`（COMMIT step）

## Scope

### In Scope

- `CSVダウンロード` button / form / submitter / hidden input の live 観測情報を artifact に残す
- `実現損益詳細` / `配当金・分配金履歴` で download 不発の原因を切り分ける
- 原因に合わせて capture script の submit / navigation / download wait / retry を最小限修正する
- 必要な unit test を追加して挙動を固定化する
- live workflow run を回して artifact で完成度と rerun 安定性を確認する

### Out Of Scope

- SBI へのログイン自動化
- 発注、取消、入出金など read-only 以外の操作
- 米国株ページの新規 parser 大拡張
- 外部 API 連携やネットワーク盗聴ベースの別実装

## Impact

- `capture-summary` だけで「button が見えた」から「何が送信され、どの wait / retry を経て、なぜ download しなかったか」まで追えるようになる
- runner 上の live debugging が短い反復で回せるようになる
- CSV 本体が取得できれば、既存 report builder の実現損益 / 履歴セクションがより完全になる

## Test Strategy

- `tests/sbi-capture-workflow.test.js` を先に RED 化し、wait / retry と route diagnostic 出力の期待値を追加する
- 実装して GREEN にする
- 必要な場合のみ `tests/sbi-portfolio-report.test.js` を追加更新し、新規 CSV 反映または補助artifact 表示を固定する
- 最後に live workflow run を実行し、artifact と rerun 結果で実地確認する

## Validation Commands

- `node --test tests/sbi-capture-workflow.test.js`
- `node --test tests/sbi-portfolio-report.test.js`
- `gh workflow run "SBI Portfolio Capture" --ref main --field cdp_host=127.0.0.1 --field cdp_port=9222 --field output_dir=docs/reports/screener/portfolio/capture/latest --field dry_run=false`
- `gh run list --workflow "SBI Portfolio Capture" --limit 1`

## Risks

- SBI の download 導線が通常 click ではなく hidden field 変更や専用 submit parameter を要求する可能性がある
- 画面遷移を伴わない download だと現行の完了待ちが不足する可能性がある
- wait を増やしすぎると workflow 実行時間だけが伸びる恐れがあるため、rerun 安定性とのバランスを見る必要がある
- runner 上 Chrome / Windows download directory の挙動差で local test だけでは再現しきれない可能性がある

## Implementation Steps

- [x] `scripts/sbi/capture-portfolio-data.mjs` の CSV click 前後に必要最小限の settle wait / post-click wait / bounded retry を追加する
- [x] `tests/sbi-capture-workflow.test.js` を更新し、stability 用 wait / retry の挙動と summary 出力を固定化する
- [x] live workflow run を実行し、artifact から `実現損益詳細` / `配当金・分配金履歴` の download 不発条件を再確認する
- [x] 原因に合わせて capture script の wait / retry を最小変更で調整する
- [x] 必要なら手順書と durable session log を更新する
- [x] live workflow run を rerun 含めて再実行し、追加 CSV が `downloads/` に落ちるか、または到達不能理由が十分具体的に残ることを確認する
