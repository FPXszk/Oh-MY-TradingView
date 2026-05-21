# Portfolio Report WSL Publish

## Goal

Windows self-hosted runner 上で生成される `SBI Portfolio Capture`、`Moomoo Portfolio Diagnostics`、`Portfolio Health Check` の成果物を、実行後に WSL 側の `main` checkout へコピーし、`docs/reports/screener/portfolio` 配下にレポートを残したうえでコミット・プッシュまで自動で完了させる。

成功条件:

- 3 つの portfolio workflow が成功時に WSL 側 checkout へ成果物を同期する
- 少なくとも Markdown レポートが `docs/reports/screener/portfolio` 配下へ残る
- Windows runner 上の checkout に出た成果物を WSL 側へ `cp` してから `main` に commit / push する
- 既存の daily screener publish パターンと整合する

## Files

- 作成: `scripts/windows/github-actions/sync-portfolio-reports-to-wsl.ps1`
- 作成: `docs/sessions/portfolio-report-wsl-publish_20260521_1151.md`
- 変更: `.github/workflows/sbi-portfolio-capture.yml`
- 変更: `.github/workflows/moomoo-portfolio-diagnostics.yml`
- 変更: `.github/workflows/portfolio-health-check.yml`
- 変更: `docs/strategy/sbi-portfolio-report-workflow.md`
- 移動: `docs/exec-plans/active/portfolio-report-wsl-publish_20260521_1151.md` -> `docs/exec-plans/completed/portfolio-report-wsl-publish_20260521_1151.md`

## Scope

### In Scope

- portfolio 系 workflow の publish step 追加
- Windows checkout から WSL checkout への成果物コピー
- WSL 側 `main` での add / commit / push 自動化
- portfolio report 出力先の運用を docs 側に明記

### Out Of Scope

- SBI / moomoo のデータ取得ロジックそのものの変更
- workflow の runner 種別変更
- artifact 名やレポート本文の大幅 redesign

## Impact

- portfolio 系の実行結果が Windows runner 上だけに留まらず、WSL 側 repo にも残る
- `docs/reports/screener/portfolio` を見れば最新の Markdown レポートを追える
- 既存の daily screener と同じ運用パターンになる

## Test Strategy

- workflow YAML と publish script を局所変更に留める
- 先に PowerShell script の引数と copy 対象をレビューで固定する
- 実装後は静的チェックとして `git diff --check` を実行する
- 必要なら PowerShell script を `-WhatIf` なしの dry read で点検し、実 workflow 実行はユーザー運用に委ねる

## Validation Commands

- `git diff --check`
- `gh workflow view "SBI Portfolio Capture"`
- `gh workflow view "Moomoo Portfolio Diagnostics"`
- `gh workflow view "Portfolio Health Check"`

## Risks

- workflow ごとに同期対象ファイルが少し異なるため、copy 漏れがあると WSL 側の参照が欠ける
- WSL 側 repo が `main` 以外だと daily screener と同様に publish が失敗する
- self-hosted runner 環境で `wsl.exe` や SSH remote が使えない場合は publish step が失敗する

## Existing Plan Overlap

- `docs/exec-plans/completed/sbi-workflow-finalization_20260521_0107.md`
- `docs/exec-plans/completed/unified-portfolio-report-layout_20260521_1044.md`

既存 plan はレポート生成や workflow 完走確認まで。今回は「Windows runner の成果物を WSL 側へ同期して commit / push する」運用追加に限定する。

## Implementation Steps

- [x] portfolio 系 workflow の現状出力と daily screener publish 手順を比較し、同期対象ファイルを確定する
- [x] portfolio 用の WSL publish PowerShell script を追加する
- [x] 3 つの workflow に success 時 publish step を追加する
- [x] 運用 docs / durable session log を更新する
- [x] 変更をレビューし、`git diff --check` で崩れがないことを確認する
- [x] active plan を `completed/` へ移して commit / push する
