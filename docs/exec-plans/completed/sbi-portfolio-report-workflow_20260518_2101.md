# sbi-portfolio-report-workflow

## Goal

Chrome で手動ログイン済みの SBI 証券画面と、ダウンロード済み CSV を前提に、日本株口座・米国株口座・投資信託・現金残高をまとめたポートフォリオ Markdown を生成できる read-only ワークフローを作る。加えて、実現損益と約定履歴を集計し、成果物を Windows 側のレポート用フォルダへ保存し、次回に引き継げる session log を repo に残す。

## Files In Scope

- Create: `docs/exec-plans/active/sbi-portfolio-report-workflow_20260518_2101.md`
- Create: `scripts/sbi/build-portfolio-report.mjs`
- Create: `docs/sessions/sbi-portfolio-report-workflow_20260518_2101.md`
- Create: `docs/strategy/sbi-portfolio-report-workflow.md`
- Create: `tests/sbi-portfolio-report.test.js`
- Move on completion: `docs/exec-plans/active/sbi-portfolio-report-workflow_20260518_2101.md` -> `docs/exec-plans/completed/sbi-portfolio-report-workflow_20260518_2101.md`

## Files To Read

- `AGENTS.md`
- `package.json`
- `docs/research/sbi_portfolio_api.md`
- `docs/sessions/moomoo-readonly-portfolio-diagnostics-session-log_20260516_2343.md`
- `tests/`

## Scope

- ダウンロード済み SBI CSV から現在資産・米国株保有・投資信託保有・実現損益・約定履歴を読み、単一 Markdown レポートへ統合する。
- 日本株保有が 0 件であれば、その事実を明示してレポートに残す。
- 再利用できる CLI スクリプトと最小限のテストを追加する。
- 手動ログイン済み Chrome 前提の運用手順を `docs/strategy/` にまとめる。
- session log を repo に残す。

## Out Of Scope

- SBI 証券への自動ログイン
- 発注、取消、資金移動などの書き込み系操作
- Cookie / password / local storage の取得
- 画面要素が不明な状態での brittle なフル自動ブラウザ操作

## Risks / Notes

- このセッションでは Chrome 操作ツールが露出しない可能性があり、その場合は既存ダウンロード CSV を正本として集計する。
- ユーザー指定の Windows 側保存先フォルダは探索で未確認のため、見つからなければ `Documents/レポート/スクリーンワー/portfolio_new` を作成して保存する。
- CSV 列名は SBI 側の UI 文言変更で壊れる可能性があるため、必要最小限の列だけに依存する。

## Validation

- `node --test tests/sbi-portfolio-report.test.js`
- `node scripts/sbi/build-portfolio-report.mjs --help`
- 実データでレポート生成し、出力 Markdown を目視確認する
- `git status --short`

## Tasks

- [ ] SBI CSV の種類と列構造を確認する
- [ ] 変換対象と出力 Markdown の構成を定義する
- [ ] `scripts/sbi/build-portfolio-report.mjs` を実装する
- [ ] 最小限のテストを追加する
- [ ] 実データで Markdown レポートを生成する
- [ ] Windows 側レポートフォルダへ成果物を配置する
- [ ] ワークフロー手順書と session log を作成する
- [ ] 検証後に plan を completed へ移動し、変更を commit/push する
