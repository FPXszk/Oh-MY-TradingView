# Session Log 20260521_1212

## Summary

`Portfolio Health Check` の WSL publish 導線を実機の Windows self-hosted runner で確認した。最初の 2 run では PowerShell 引数解釈の差で publish step が失敗したが、`sync-portfolio-reports-to-wsl.ps1` を 2 回だけ最小修正したあと、3 回目の run で workflow 完走、WSL 側 `docs/reports/screener/portfolio` への同期、`main` への commit / push まで通った。

## Live Runs

- `26203222201`
  - title: `docs: portfolio-health-check-live-verification_20260521_1212`
  - result: failure
  - failure step: `Publish portfolio health report to WSL main`
  - cause: `-RelativePaths` が 1 本の comma-separated string として渡され、`Test-Path` が `Illegal characters in path` で落ちた
- `26203370775`
  - title: `fix: normalize portfolio publish path inputs`
  - result: failure
  - failure step: `Publish portfolio health report to WSL main`
  - cause: split 後も path の両端に `"` が残り、再度 `Illegal characters in path`
- `26203533551`
  - title: `fix: trim quoted portfolio publish paths`
  - result: success
  - duration: 3m18s
  - publish result: success

## What Changed During Verification

- Update: `scripts/windows/github-actions/sync-portfolio-reports-to-wsl.ps1`
  - comma-separated で渡ってきた `RelativePaths` を split する `Normalize-RelativePaths` を追加
  - split 後の path から両端の `"` を除去するよう修正

## Verified Outputs

- Workflow run: `26203533551`
- Workflow publish commit: `8b8b246` `docs: portfolio health report run 26203533551-1`
- WSL 側に同期された主要ファイル:
  - `docs/reports/screener/portfolio/portfolio_health_check_report.md`
  - `docs/reports/screener/portfolio/moomoo_portfolio_diagnostics.json`
  - `docs/reports/screener/portfolio/capture/latest/capture-summary.md`
  - `docs/reports/screener/portfolio/capture/latest/downloads/ALLTYPE_20260521122640.csv`
  - `docs/reports/screener/portfolio/capture/latest/downloads/DISTRIBUTION_20260521122654.csv`
  - `docs/reports/screener/portfolio/capture/latest/downloads/SaveFile.csv`

## Content Checks

- `portfolio_health_check_report.md`
  - generated at: `2026-05-21T03:26:56.356Z`
  - SBI取得日時: `2026/5/21 12:24`
  - moomoo取得日時: `2026-05-21T03:26:55.367Z`
  - 総合サマリー、総合保有一覧、`SBI 詳細` が生成されている
- `capture-summary.md`
  - endpoint probe: `endpoint_reachable: true`
  - downloaded files: `DISTRIBUTION_20260521122654.csv`, `ALLTYPE_20260521122640.csv`, `SaveFile.csv`
  - `実現損益詳細` / `配当金・分配金履歴` の `csv_download_success: true`
- `moomoo_portfolio_diagnostics.json`
  - `success: true`
  - `accountCount: 1`
  - `positionCount: 4`

## Commits

- `3e2f3b1` `fix: normalize portfolio publish path inputs`
- `e12da3b` `fix: trim quoted portfolio publish paths`
- `8b8b246` `docs: portfolio health report run 26203533551-1`
