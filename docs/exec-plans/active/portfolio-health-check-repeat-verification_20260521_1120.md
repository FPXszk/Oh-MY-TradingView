# Portfolio Health Check Repeat Verification

## Goal

安定化後の `Portfolio Health Check` workflow を追加で 1〜2 回実行し、SBI capture の不安定さが改善したかを live run ベースで確認する。成功可否だけでなく、所要時間、artifact、SBI 側の取得内容も見る。

成功条件:

- `Portfolio Health Check` を 2 回連続で dispatch して結果を確認する
- 各 run の conclusion と duration を記録する
- 各 run で統合レポート artifact が生成されることを確認する
- SBI 側で `ALLTYPE` / `DISTRIBUTION` / fallback 状況を summary から確認する

## Files

- 作成: `docs/exec-plans/active/portfolio-health-check-repeat-verification_20260521_1120.md`
- 変更予定: `docs/sessions/` 配下の durable session log
- 変更予定: `docs/strategy/sbi-portfolio-report-workflow.md` （必要時のみ）

## Scope

### In Scope

- workflow の repeated live verification
- artifact と capture summary の確認
- 成功率の記録

### Out Of Scope

- 新しいコード修正
- moomoo 側ロジック変更

## Test Strategy

- `gh workflow run` で 2 回 dispatch
- `gh run watch` で completion を待機
- `gh run download` で artifact を確認

## Validation Commands

- `gh workflow run "Portfolio Health Check" --ref main`
- `gh run list --workflow "Portfolio Health Check" --limit 5`
- `gh run watch <RUN_ID>`
- `gh run download <RUN_ID> --dir tmp/<RUN_ID>`

## Risks

- runner の live 状態依存で、一時的な失敗が混じる可能性がある
- 2 回連続 verification でも恒久安定性の保証にはならない

## Existing Plan Overlap

- `docs/exec-plans/completed/sbi-capture-stability-debug_20260521_1103.md`

今回はその改善後の再検証だけを行う。

## Implementation Steps

- [ ] plan を commit / push する
- [ ] `Portfolio Health Check` を 2 回実行して completion まで確認する
- [ ] artifact と capture summary を確認して結果を記録する
- [ ] durable session log を更新し、plan を `completed/` へ移して commit / push する
