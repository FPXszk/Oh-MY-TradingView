# Portfolio Health Check Live Verification

## Goal

実機の Windows self-hosted runner で `Portfolio Health Check` workflow を実行し、生成された成果物が WSL 側 `docs/reports/screener/portfolio` へ同期され、`main` へ commit / push されることを確認する。

成功条件:

- `Portfolio Health Check` workflow が self-hosted Windows runner 上で完走する
- workflow 実行後に WSL 側 repo の `docs/reports/screener/portfolio` 配下へ成果物が反映される
- publish step が WSL 側 `main` で commit / push まで完了する
- 実行結果を durable session log に残せる

## Files

- 作成: `docs/sessions/portfolio-health-check-live-verification_20260521_1212.md`
- 変更: `docs/strategy/sbi-portfolio-report-workflow.md`
- 変更: `scripts/windows/github-actions/sync-portfolio-reports-to-wsl.ps1`
- 移動: `docs/exec-plans/active/portfolio-health-check-live-verification_20260521_1212.md` -> `docs/exec-plans/completed/`

## Scope

### In Scope

- `Portfolio Health Check` の live dispatch
- run 状態、artifact、publish commit の確認
- WSL 側レポートパスの実在確認

### Out Of Scope

- workflow ロジックの追加改修
- standalone `SBI Portfolio Capture` / `Moomoo Portfolio Diagnostics` の個別 live run
- report 本文内容の改善

## Impact

- 直前に追加した WSL publish 導線が実機で有効か判断できる
- 運用時にどの workflow を叩けばよいかを確定できる

## Test Strategy

- 既存 workflow をそのまま dispatch し、GitHub Actions 上の結果で検証する
- WSL 側 repo と最新 commit を確認して publish 成否を判断する
- 追加修正が不要なら docs のみ記録して閉じる

## Validation Commands

- `gh workflow run "Portfolio Health Check" --ref main`
- `gh run list --workflow "Portfolio Health Check" --limit 1`
- `gh run watch <RUN_ID>`
- `gh run view <RUN_ID> --log-failed`
- `git log --oneline -n 5`

## Risks

- self-hosted runner が offline だと dispatch 後に進まない
- SBI CDP / moomoo OpenD の live 状態に依存する
- publish step で WSL 側 `main` が想定外状態だと失敗する

## Implementation Steps

- [x] live verification 用 exec plan を作成して先行コミットする
- [x] `Portfolio Health Check` workflow を dispatch して完走を待つ
- [x] run 結果、artifact、publish commit、WSL 側レポートを確認する
- [x] durable session log を追加し、必要なら strategy doc に反映する
- [x] active plan を `completed/` に移して commit / push する
