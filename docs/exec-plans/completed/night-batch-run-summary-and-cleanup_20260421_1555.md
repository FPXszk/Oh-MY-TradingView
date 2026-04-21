# Night Batch Run Summary / Cleanup 計画

作成日時: 2026-04-21 15:55 JST

## 目的

最新の `Night Batch Self Hosted` workflow 完了結果を確認し、その要約を適切な run archive / report に追記したうえで、未コミット変更のうち push して問題ないものを整理して `main` をクリーンにする。

## 現時点の確認結果

- 最新 run: `24705526295`
  - workflow: `Night Batch Self Hosted`
  - branch: `main`
  - event: `workflow_dispatch`
  - conclusion: `success`
  - job 所要時間: `1h7m13s`
  - artifact: `night-batch-24705526295-1`
- 現在の未コミット状態:
  - `docs/exec-plans/completed/dispatch-night-batch-public-top10-us40_20260421_1033.md` が未追跡
  - `docs/exec-plans/completed/night-batch-workflow-failure-fix_20260421_1103.md` が未追跡

## 変更・確認対象ファイル

- 作成: `docs/exec-plans/completed/night-batch-run-summary-and-cleanup_20260421_1555.md`
- 変更候補: `docs/reports/night-batch-self-hosted-run15.md`
- 変更候補: `docs/reports/README.md`
- 変更候補: `docs/exec-plans/completed/dispatch-night-batch-public-top10-us40_20260421_1033.md`
- 変更候補: `docs/exec-plans/completed/night-batch-workflow-failure-fix_20260421_1103.md`

## 実装内容と影響範囲

- 最新 workflow 結果の記録
  - `24705526295` の run 結果と artifact summary を確認し、既存 run archive に追記または新規 run report へ整理する
- ドキュメント整合性
  - `docs/reports/README.md` の主なファイル一覧が古ければ更新する
- ワークツリー整理
  - 現在の未追跡 completed plan が今回 push して問題ない内容か確認する
  - 安全なものだけ commit / push し、不要な未コミット残りを避ける

## 実装ステップ

- [ ] 最新 run `24705526295` の job / artifact / summary を確認し、記録すべき項目を確定する
- [ ] 既存の report 追記先を決める
- [ ] RED: 必要なら report index / run archive の期待を表す最小テストを追加する
- [ ] GREEN: run summary を `docs/reports/` に追記し、必要なら `README` を更新する
- [ ] REVIEW: summary の記述が workflow conclusion と artifact summary を混同していないか確認する
- [ ] 既存の未追跡 completed plan 2件を読み、今回一緒に push して問題ないかを判定する
- [ ] COMMIT/PUSH: 今回の summary 追記と safe な残差分のみ Conventional Commits で `main` に反映する
- [ ] 最終確認: `git status --short` を見て、残件があれば理由を明示する

## テスト戦略

- 基本はドキュメント更新中心のため、構造を固定する既存テストが関係する場合のみ最小限の RED/GREEN を行う
- 実装後は必要範囲の対象テストのみ実行する

## 検証コマンド候補

- `gh run view 24705526295`
- `gh run download 24705526295`
- `git status --short`

## リスクと注意点

- artifact を読まずに UI 上の conclusion だけで summary を書くと、backtest 本体の結果との混同が起き得る
- 未追跡 completed plan は別作業の名残の可能性があるため、内容確認なしでまとめて commit しない
- 既存 active plan
  - `night-batch-readiness-stabilization_20260416_1706.md`
  - `night-batch-summary-and-storage-followup_20260420_1123.md`
  と night batch 領域で近接しているため、今回は run summary 追記と clean-up に限定する

## スコープ外

- night batch ロジック自体の再修正
- workflow YAML の追加変更
- public strategy や campaign 構成の変更
