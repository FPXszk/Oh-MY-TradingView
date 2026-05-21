# Session Log 20260521_1151

## Summary

Windows self-hosted runner 上で生成される portfolio 系 workflow の成果物を、実行成功後に WSL 側 `main` checkout へ同期して commit / push する publish 導線を追加した。これにより `docs/reports/screener/portfolio` を見れば、SBI / moomoo / unified health check の最新 Markdown レポートを WSL 側 repo でも追えるようにした。

## User Request

- セッション 6 日ごろにやっていた portfolio workflow の流れを思い出したい
- SBI と moomoo のポートフォリオ取得 workflow、portfolio health check の出力先を `docs/reports/screener/portfolio` 配下として扱いたい
- Windows runner 上に出た成果物を一度 WSL 側へコピーしてほしい
- 最後に commit / push まで一連で自動化してほしい
- daily screener workflow の publish 実装を参考にしてほしい

## Recalled Context

- 2026-05-21 09:40 ごろの作業で `Portfolio Health Check` workflow 自体は追加済みだった
- 2026-05-21 10:44 ごろの作業で unified Markdown `portfolio_health_check_report.md` へ整理済みだった
- ただし当時の成果物は Windows self-hosted runner の checkout / artifact に残るだけで、WSL 側 live checkout へ反映する step はまだ無かった

## What Changed

- Add: `scripts/windows/github-actions/sync-portfolio-reports-to-wsl.ps1`
  - Windows checkout 上の file / directory を WSL 側 repo へ `cp -R`
  - WSL 側が `main` かつ SSH remote であることを確認
  - `git add` 後に staged diff が無ければ no-op で終了
  - 差分があれば `github-actions[bot]` 名義で commit / push
- Update: `.github/workflows/sbi-portfolio-capture.yml`
  - success 時に capture dir と `sbi_portfolio_report.md` を WSL 側へ同期
- Update: `.github/workflows/moomoo-portfolio-diagnostics.yml`
  - success 時に diagnostics Markdown / JSON を WSL 側へ同期
- Update: `.github/workflows/portfolio-health-check.yml`
  - success 時に unified report、moomoo JSON、SBI capture dir を WSL 側へ同期
- Update: `docs/strategy/sbi-portfolio-report-workflow.md`
  - publish 先と commit / push 動線を明記

## Verification

- `git diff --check`
- `gh workflow view "SBI Portfolio Capture"`
- `gh workflow view "Moomoo Portfolio Diagnostics"`
- `gh workflow view "Portfolio Health Check"`

## Commits

- `8503380` `docs: portfolio-report-wsl-publish_20260521_1151`
