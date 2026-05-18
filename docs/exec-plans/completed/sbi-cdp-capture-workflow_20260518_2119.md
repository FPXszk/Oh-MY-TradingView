# sbi-cdp-capture-workflow

## Goal

self-hosted GitHub Actions runner から、手動ログイン済みの Chrome 上に開いている SBI 証券画面へ接続し、ポートフォリオ関連データを read-only で取得する workflow を追加する。取得は CSV ダウンロードを優先し、CSV で出せない情報は「毎資産」ページの DOM 読み取りで補完できるようにする。今回はまず「取得できるところまで」を実装対象とし、既存の Markdown 集計フローへつながる raw capture を残す。

## Files In Scope

- Create: `docs/exec-plans/active/sbi-cdp-capture-workflow_20260518_2119.md`
- Create: `.github/workflows/sbi-portfolio-capture.yml`
- Create: `scripts/sbi/capture-portfolio-data.mjs`
- Create: `tests/sbi-capture-workflow.test.js`
- Update: `package.json`
- Update: `docs/strategy/sbi-portfolio-report-workflow.md`
- Create: `docs/sessions/sbi-cdp-capture-workflow_20260518_2119.md`
- Move on completion: `docs/exec-plans/active/sbi-cdp-capture-workflow_20260518_2119.md` -> `docs/exec-plans/completed/sbi-cdp-capture-workflow_20260518_2119.md`

## Files To Read

- `AGENTS.md`
- `.github/workflows/moomoo-portfolio-diagnostics.yml`
- `src/connection.js`
- `scripts/sbi/build-portfolio-report.mjs`
- `docs/research/sbi_portfolio_api.md`

## Scope

- GitHub Actions `workflow_dispatch` で動く SBI capture workflow を追加する
- CDP endpoint を指定して、既存 Chrome の open tab から SBI 証券ページを見つける
- CSV ダウンロード可能ページでは保存を試みる
- CSV が取れない場合は「毎資産」ページの読み取り結果を JSON/Markdown artifact として残す
- 後続の集計スクリプトへ渡しやすい raw artifact を `docs/reports/screener/portfolio/` 配下へ出力する

## Out Of Scope

- SBI 証券への自動ログイン
- 発注・取消・入出金などの書き込み操作
- Codex Chrome Extension 依存の automation
- 今回の turn での完全自動 report 統合までの再設計

## Risks / Notes

- 2026-05-18 21:19 JST 時点ではこのセッションから `@chrome` 実行ツールは露出しておらず、`127.0.0.1:9222` / `127.0.0.1:9223` の CDP endpoint も未応答だった。したがって repo 側は **CDP 前提 workflow** として実装し、live capture の成否は runner 側前提に依存する。
- 既存 Chrome を runner から触るには、Chrome が remote debugging port 付きで起動している必要がある。
- SBI の画面文言や DOM は壊れやすいため、CSV 優先・DOM fallback は最小限に保つ。
- 現在 worktree には `docs/reports/screener/portfolio/` 配下の削除差分があるため、今回の変更と混ぜて復元・巻き戻ししない。

## Validation

- `node --test tests/sbi-capture-workflow.test.js`
- `node scripts/sbi/capture-portfolio-data.mjs --help`
- workflow YAML の目視確認
- 可能ならローカルで dry-run / endpoint probe を実行
- `git status --short`

## Tasks

- [ ] CDP 経由で既存 Chrome / SBI tab を見つける capture 方針を定義する
- [ ] CSV 優先 + 毎資産 fallback の capture script を実装する
- [ ] self-hosted GitHub Actions workflow を追加する
- [ ] 最小限のテストを追加する
- [ ] 運用手順と session log を更新する
- [ ] 検証後に plan を completed へ移し commit/push する
