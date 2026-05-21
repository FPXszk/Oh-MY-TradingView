# Session Log 20260521_0940

## Summary

SBI と moomoo の read-only ポートフォリオ取得フローを `Portfolio Health Check` workflow に統合した。レポート出力先は `docs/reports/screener/portfolio/` 配下へ揃え、最終的に live run `26199543437` で unified workflow の完走を確認した。

## User Request

- SBI workflow のレポート出力先を `docs/reports/screener/portfolio/` に変える
- moomoo の portfolio diagnostics も統合し、1 本の workflow にする
- workflow 名を `Portfolio Health Check` にする
- 全体的に動くか live で確認する

## What Changed

- Update: `scripts/sbi/build-portfolio-report.mjs`
  - 既定出力先を `docs/reports/screener/portfolio/sbi_portfolio_report.md` に変更
- Update: `scripts/moomoo/run-portfolio-diagnostics.mjs`
  - 既定出力先を
    - `docs/reports/screener/portfolio/moomoo_portfolio_diagnostics.md`
    - `docs/reports/screener/portfolio/moomoo_portfolio_diagnostics.json`
    に変更
- Update: `.github/workflows/sbi-portfolio-capture.yml`
  - `report_path` input を追加
  - final report を root 側へ出力するよう変更
- Update: `.github/workflows/moomoo-portfolio-diagnostics.yml`
  - moomoo diagnostics 出力先を portfolio 配下へ変更
  - `moomoo-api` runtime install step を追加
- Add: `.github/workflows/portfolio-health-check.yml`
  - SBI capture / report
  - moomoo read-only diagnostics
  を 1 本で順に回す unified workflow
- Update: `src/core/moomoo.js`
  - Windows runner では既定 Python を `python` として解決する fallback を追加

## Verification

### Targeted tests

- `node --test tests/sbi-portfolio-report.test.js` -> success
- `node --test tests/moomoo.test.js` -> success
- `git diff --check` -> clean

### Live workflow runs

1. `26198557398`
   - failed
   - reason: Windows runner で `python3` 解決が不適切
2. `26199068362`
   - failed
   - reason: Windows runner の Python runtime に `moomoo-api` 未導入
3. `26199543437`
   - success
   - URL: <https://github.com/FPXszk/Oh-MY-TradingView/actions/runs/26199543437>

### Artifact result from successful run `26199543437`

- `sbi_portfolio_report.md`
- `moomoo_portfolio_diagnostics.md`
- `moomoo_portfolio_diagnostics.json`
- `capture/latest/` 一式

確認できたこと:

- unified workflow 自体は最後まで完走した
- moomoo diagnostics は REAL account 1 件 / position 4 件まで report 化できた
- SBI report は root 出力先へ正常生成された
- ただし今回の SBI artifact は `downloads/SaveFile.csv` 中心で、
  - `米国株` fallback
  - `投資信託`
  は report 化できた一方、
  - `ALLTYPE_*.csv`
  - `DISTRIBUTION_*.csv`
  はこの run では再取得されなかった

## Interpretation

- 出力先変更: 完了
- workflow 統合: 完了
- moomoo read-only diagnostics の workflow 化: 完了
- unified workflow の live success: 完了
- SBI report 内容の厚さは依然として live 状態依存だが、workflow と report 生成の成立性は確認できた

## Commits

- `a66ffca` `docs: portfolio-health-check-unification_20260521_0940`
- `6b863f5` `feat: add portfolio health check workflow`
- `3521519` `fix: use windows python for moomoo workflow`
- `555e43f` `fix: install moomoo api in workflows`
