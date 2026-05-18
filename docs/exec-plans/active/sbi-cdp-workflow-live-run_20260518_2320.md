# Exec-plan: sbi-cdp-workflow-live-run_20260518_2320

## Goal

前回の read-only CDP 確認に続き、`SBI Portfolio Capture` workflow を実際に dispatch して、現在の dedicated CDP Chrome + SBI タブ前提でどこまで到達できるかを確認する。成功条件は、workflow run が作成され、少なくとも probe / capture / artifact の成否をログまたは artifact から判定できること。

## Files

- Create: `docs/exec-plans/active/sbi-cdp-workflow-live-run_20260518_2320.md`
- Create: `docs/sessions/sbi-cdp-workflow-live-run_20260518_2320.md`
- Move on COMMIT step: `docs/exec-plans/active/sbi-cdp-workflow-live-run_20260518_2320.md` -> `docs/exec-plans/completed/sbi-cdp-workflow-live-run_20260518_2320.md`
- Read-only: `docs/strategy/sbi-portfolio-report-workflow.md`
- Read-only: `docs/sessions/sbi-cdp-readonly-check_20260518_2313.md`
- Read-only: `.github/workflows/sbi-portfolio-capture.yml`
- Read-only: `scripts/sbi/capture-portfolio-data.mjs`

## Scope

- `SBI Portfolio Capture` workflow を `gh workflow run` で dispatch する
- 最新 run の status / failed log / artifact 可用性を確認する
- 実行結果を session log に記録する

## Out Of Scope

- workflow YAML や capture script の修正
- SBI への発注・取消・入出金操作
- Chrome 起動オプションや runner 常駐設定の恒久修正

## Test / Validation Strategy

- RED: workflow dispatch または capture step が失敗した場合、失敗箇所と原因を run log / summary から特定する
- GREEN: workflow run が作成され、`Probe CDP endpoint` と `Capture SBI portfolio data` の成否が判定できる
- Validation commands:
  - `gh workflow run "SBI Portfolio Capture" --ref main --field cdp_host=127.0.0.1 --field cdp_port=9222 --field output_dir=docs/reports/screener/portfolio/capture/latest --field dry_run=false`
  - `gh run list --workflow "SBI Portfolio Capture" --limit 1`
  - `gh run view <RUN_ID> --log-failed`

## Risks

- self-hosted Windows runner が offline / busy の場合、dispatch 後すぐには進まない
- dedicated CDP Chrome に SBI タブが載っていても、capture step で selector 不一致や download 制御不足が出る可能性がある
- local WSL からは CDP endpoint 未到達のため、workflow 成否は runner 側ログ前提になる

## Steps

- [ ] Step 1: 関連 docs / workflow / session log を確認し、今回の前提を固定する
- [ ] Step 2: exec-plan を保存し、docs-only commit と push を行う
- [ ] Step 3: `SBI Portfolio Capture` workflow を dispatch する
- [ ] Step 4: 最新 run の status / failed log / artifact 可用性を確認する
- [ ] Step 5: session log を記録し、exec-plan を completed へ移動して commit / push する
