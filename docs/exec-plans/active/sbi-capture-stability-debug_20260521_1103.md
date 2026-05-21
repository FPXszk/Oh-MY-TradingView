# SBI Capture Stability Debug

## Goal

`SBI Portfolio Capture` の不安定要因を減らし、画面遷移や CSV ダウンロードが早すぎて取りこぼすケースに対して、より安定する待機・再試行戦略へ改善する。最後に実際の GitHub Actions workflow を動かし、期待どおり最終レポートが生成されることまで確認する。

成功条件:

- 画面遷移待ちが固定 sleep 依存から一段安定した状態待ちに改善される
- CSV ダウンロード検知が一時ファイルや途中更新に強くなる
- route 単位での retry / re-entry が入り、取りこぼし時に再試行できる
- `tests/sbi-capture-workflow.test.js` と関連テストが通る
- 実 workflow を live 実行し、期待どおりレポート生成を確認する

## Files

- 作成: `docs/exec-plans/active/sbi-capture-stability-debug_20260521_1103.md`
- 変更予定: `scripts/sbi/capture-portfolio-data.mjs`
- 変更予定: `tests/sbi-capture-workflow.test.js`
- 変更の可能性あり: `.github/workflows/portfolio-health-check.yml`
- 変更の可能性あり: `.github/workflows/sbi-portfolio-capture.yml`
- 変更予定: `docs/strategy/sbi-portfolio-report-workflow.md`
- 変更予定: `docs/sessions/` 配下の durable session log

## Scope

### In Scope

- 画面遷移後の state-aware な待機
- CSV download の安定検知と再試行改善
- route capture の再進入 / 再試行改善
- live workflow verification と結果確認

### Out Of Scope

- SBI UI 全面刷新への追随
- 読み取り専用範囲を超える操作
- moomoo 側ロジック変更

## Impact

- self-hosted Windows runner 上での SBI capture 成功率改善が期待できる
- `Portfolio Health Check` の最終統合レポートの安定性が上がる
- failure 時も summary により詳細な retry / wait 情報を残せる

## Test Strategy

- 先に既存 capture test を確認し、必要な pure helper を export して retry / wait 戦略をテストで固定する
- 実装後に `tests/sbi-capture-workflow.test.js`、`tests/sbi-portfolio-report.test.js`、`tests/moomoo.test.js` を実行する
- 最後に live workflow run を dispatch し、artifact と最終レポートを確認する

## Validation Commands

- `node --test tests/sbi-capture-workflow.test.js`
- `node --test tests/sbi-portfolio-report.test.js`
- `node --test tests/moomoo.test.js`
- `git diff --check`
- `gh workflow run "Portfolio Health Check" --ref main`
- `gh run list --workflow "Portfolio Health Check" --limit 1`
- `gh run watch <RUN_ID>`
- `gh run download <RUN_ID> --dir tmp/<RUN_ID>`

## Risks

- self-hosted runner 上の live 状態差で、ローカルでは再現しない flaky 挙動が残る可能性がある
- 待機を増やしすぎると workflow 全体時間が伸びる
- retry を増やしすぎると誤った画面で粘る可能性があるため、再試行条件は限定する必要がある

## Existing Plan Overlap

- `docs/exec-plans/completed/sbi-workflow-finalization_20260521_0107.md`
- `docs/exec-plans/completed/portfolio-health-check-unification_20260521_0940.md`

今回は既存 workflow の完成後に、SBI capture の安定性だけを追加改善する作業。

## Implementation Steps

- [ ] 既存 wait / retry 実装と過去 live run の振る舞いを整理する
- [ ] 状態待ちと download completion 判定を追加し、route retry を最小変更で入れる
- [ ] pure helper / summary 情報をテストで固定する
- [ ] targeted tests と diff check を通す
- [ ] live workflow を実行し、artifact と統合レポートを確認する
- [ ] docs / durable session log を更新し、plan を `completed/` に移して commit / push する
