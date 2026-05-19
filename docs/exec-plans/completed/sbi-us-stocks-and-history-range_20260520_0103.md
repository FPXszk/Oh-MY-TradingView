# SBI US Stocks And History Range Plan

## Goal

`SBI Portfolio Capture` workflow を次の 2 点で前進させる。

1. `米国株式` ページに CSV ダウンロード導線が存在するかを workflow / artifact 上で検証できるようにする
2. `実現損益詳細` と `配当金・分配金履歴` の期間を、少なくとも `2022-01-01`、可能ならページ仕様上の最古付近まで広げて照会できるようにする

今回の成功条件は、live run 後の artifact だけで

- 米国株ページに CSV 導線があるか
- なければ表やテキストから何が回収できるか
- 実現損益 / 配当の期間がどこまで広がったか

を判断できること。

## Files

- 変更: `scripts/sbi/capture-portfolio-data.mjs`
- 変更: `scripts/sbi/build-portfolio-report.mjs`
- 変更: `tests/sbi-capture-workflow.test.js`
- 変更: `tests/sbi-portfolio-report.test.js`
- 変更: `docs/strategy/sbi-portfolio-report-workflow.md`
- 作成または更新: `docs/sessions/` 配下の durable session log

## Scope

### In Scope

- snapshot に form controls や追加 clickables を残し、期間フォームや CSV 導線の有無を artifact から読めるようにする
- `実現損益詳細` / `配当金・分配金履歴` で開始日を指定して `照会` できる flow を追加する
- `米国株式` ページで CSV 導線を探索し、なければ表 snapshot から回収できる情報量を増やす
- report builder が新しい米国株 snapshot fallback を取り込めるようにする
- unit test と手順書を更新する

### Out Of Scope

- ログイン自動化
- 発注、取消、入出金など read-only 以外の操作
- 2021年8月以前の非対応データ取得
- 専用 API の外部調査やネットワーク盗聴ベースの実装

## Impact

- capture script の snapshot 品質が上がり、live artifact だけで画面構造の判断がしやすくなる
- 実現損益 / 配当の履歴 capture が長期化し、report に回せる source が増える可能性がある
- 米国株は CSV が無い可能性が高いため、snapshot fallback の重要度が上がる

## Test Strategy

- `tests/sbi-capture-workflow.test.js` で route summary と form/snapshot 情報の期待値を追加する
- `tests/sbi-portfolio-report.test.js` で米国株 snapshot fallback を追加する場合は先に RED にする
- 実装後に対象テストを実行する

## Validation Commands

- `node --test tests/sbi-capture-workflow.test.js`
- `node --test tests/sbi-portfolio-report.test.js`
- `gh workflow run "SBI Portfolio Capture" --ref main --field cdp_host=127.0.0.1 --field cdp_port=9222 --field output_dir=docs/reports/screener/portfolio/capture/latest --field dry_run=false`

## Risks

- SBI の期間 UI がカスタム実装の場合、単純な input fill では反映されない可能性がある
- `照会` 後の結果反映タイミングが遅いと snapshot が更新前を拾う可能性がある
- 米国株ページに CSV が存在しない場合、最終的には snapshot table 依存となり、CSV ほど整形しやすくはない

## Implementation Steps

- [ ] `scripts/sbi/capture-portfolio-data.mjs` で snapshot に form controls を含め、期間フォームと CSV 導線の可視化を強化する
- [ ] `実現損益詳細` と `配当金・分配金履歴` に開始日を入れて `照会` する flow を追加し、結果 snapshot を保存する
- [ ] `米国株式` で CSV 導線を追加探索し、見つからない場合でも表や本文の fallback を強化する
- [ ] `scripts/sbi/build-portfolio-report.mjs` を必要最小限だけ拡張し、米国株 snapshot fallback を取り込めるなら対応する
- [ ] テスト、手順書、durable session log を更新し、live workflow run で結果を確認する
