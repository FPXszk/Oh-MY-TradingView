# Portfolio Health Check Unification

## Goal

SBI と moomoo の read-only ポートフォリオ取得フローを 1 本の workflow に統合し、最終レポート出力先を `docs/reports/screener/portfolio/` 配下へ揃える。統合後の workflow は `Portfolio Health Check` として登録し、live 実行で概ね期待どおり動くことを確認する。

今回の成功条件は次のとおり。

- SBI レポートの既定出力先が `docs/reports/screener/portfolio/` 配下になる
- moomoo 診断レポートも同じ配下へ出力される
- `Portfolio Health Check` workflow が self-hosted Windows runner 上で手動実行できる
- SBI と moomoo の両方の read-only 出力を artifact と repo 内出力先で確認できる
- workflow 手順書 / durable session log が新構成を反映する

## Files

- 変更: `scripts/sbi/build-portfolio-report.mjs`
- 変更の可能性あり: `scripts/moomoo/run-portfolio-diagnostics.mjs`
- 作成: `.github/workflows/portfolio-health-check.yml`
- 変更の可能性あり: `.github/workflows/sbi-portfolio-capture.yml`
- 変更の可能性あり: `.github/workflows/moomoo-portfolio-diagnostics.yml`
- 変更: `tests/sbi-portfolio-report.test.js`
- 変更: `tests/moomoo.test.js`
- 変更: `docs/strategy/sbi-portfolio-report-workflow.md`
- 変更の可能性あり: `docs/strategy/moomoo/README.md`
- 変更: `docs/sessions/` 配下の durable session log
- 移動: `docs/exec-plans/active/portfolio-health-check-unification_20260521_0940.md` -> `docs/exec-plans/completed/`

## Scope

### In Scope

- SBI レポート既定出力先の repo 配下への変更
- moomoo 診断レポート出力先の repo 配下への統一
- SBI / moomoo をまとめて走らせる新 workflow の追加
- 必要最小限の test 更新
- live workflow run による統合確認

### Out Of Scope

- SBI ログイン自動化
- moomoo の発注、取消、取引ロック解除
- 既存 read-only ロジックの大規模リファクタ
- GitHub-hosted runner への移植

## Impact

- ポートフォリオ系レポートの保存先が `docs/reports/screener/portfolio/` に集約される
- 実運用は `Portfolio Health Check` 1 本から実行しやすくなる
- SBI と moomoo の最新状態を同一 artifact で確認しやすくなる

## Test Strategy

- 先に既存 unit test を確認し、出力先変更に伴う期待値だけ最小更新する
- unified workflow で使う report path / metadata を pure function テストで固定する
- 実装後に `tests/sbi-portfolio-report.test.js` と `tests/moomoo.test.js` を通す
- 最後に `Portfolio Health Check` workflow を live 実行し、artifact と主要レポートを確認する

## Validation Commands

- `node --test tests/sbi-portfolio-report.test.js`
- `node --test tests/moomoo.test.js`
- `gh workflow run "Portfolio Health Check" --ref main`
- `gh run list --workflow "Portfolio Health Check" --limit 1`
- `gh run watch <RUN_ID>`
- `gh run download <RUN_ID> --dir tmp/<RUN_ID>`

## Risks

- self-hosted runner 上で SBI Chrome CDP と moomoo OpenD の両方が同時に利用可能でない可能性がある
- moomoo 側の live 状態により account/position が空、または OpenD 接続失敗になる可能性がある
- 出力先を repo 配下へ変えることで、既存手動運用の参照パスがずれる可能性がある

## Existing Plan Overlap

- `docs/exec-plans/completed/sbi-workflow-finalization_20260521_0107.md`
- `docs/exec-plans/completed/moomoo-portfolio-diagnostics-workflow_20260517_0004.md`

今回は両者の completed work を前提にした統合作業であり、既存機能の置き換えではなく orchestrate と出力先統一が主眼。

## Implementation Steps

- [x] SBI / moomoo の既存出力先と workflow 入出力を統合方針に合わせて整理する
- [x] SBI / moomoo レポート既定出力先を `docs/reports/screener/portfolio/` 配下へ揃える
- [x] `Portfolio Health Check` workflow を追加し、両 read-only flow を 1 回の dispatch で実行できるようにする
- [x] 必要最小限の test を更新して targeted tests を通す
- [x] live workflow run を実行し、artifact とレポート内容を確認する
- [x] docs / durable session log を更新する
- [x] plan を `completed/` に移して commit / push する
