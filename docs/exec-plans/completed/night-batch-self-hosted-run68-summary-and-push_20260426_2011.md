# Night Batch Self Hosted Run68 要約・research更新・プッシュ計画

作成日時: 2026-04-26 20:11 JST

## 目的

最新の `Night Batch Self Hosted #68` (`run_id 24953124968`) を前回と同じ粒度で要約し、結論と今後の改善方向を含む research 文書を `docs/research/` に反映する。必要な current 導線を更新し、レビュー後に commit / push する。

## 事前確認

- 現在の current research は `docs/research/night-batch-self-hosted-run67_20260426.md`
- `docs/research/manifest.json` の keep-set も `run67` を指している
- 前回粒度の基準は `docs/research/night-batch-self-hosted-run67_20260426.md` と `docs/reports/archive/night-batch-self-hosted-run67.md`
- `docs/exec-plans/active/` には `repo-structure-align-and-archive-rules_20260424_2015.md` があるため、本件は対象ファイルを限定して進める

## 変更・作成・移動するファイル

### 作成

- `docs/exec-plans/active/night-batch-self-hosted-run68-summary-and-push_20260426_2011.md`
- `docs/research/night-batch-self-hosted-run68_20260426.md`
- `docs/reports/archive/night-batch-self-hosted-run68.md`

### 更新

- `docs/research/manifest.json`
- `docs/research/artifacts-backtest-scoreboards.md`
- 必要なら run68 campaign に対応する artifact 参照導線

### 調査対象

- GitHub Actions run `24953124968`
- run68 artifact summary (`gha_*summary.json`, `gha_*summary.md`)
- run68 campaign artifact 配下の `recovered-summary.json`
- run68 campaign artifact 配下の `strategy-ranking.json`
- run68 campaign artifact 配下の `strategy-ranking.md`
- `docs/research/night-batch-self-hosted-run67_20260426.md`
- `docs/reports/archive/night-batch-self-hosted-run67.md`

### 完了時に移動

- `docs/exec-plans/active/night-batch-self-hosted-run68-summary-and-push_20260426_2011.md`
- 移動先: `docs/exec-plans/completed/night-batch-self-hosted-run68-summary-and-push_20260426_2011.md`

## 実装内容と影響範囲

- run68 の workflow 情報、campaign 名、artifact 一式を特定する
- `run67` と同じ粒度で detailed report を作成する
  - workflow / artifact 成功可否
  - smoke / production 集計
  - execution 安定性
  - performance ranking
  - 結論
  - 今後の改善方向
- current 向け research 要約を `run68` に差し替える
- `manifest.json` の keep-set を `run68` に更新する
- `artifacts-backtest-scoreboards.md` が run68 を current として反映すべき内容なら更新する

## スコープ

### 含む

- `run68` の結果確認
- 前回同粒度の report / research 作成
- current 導線更新
- review
- commit / push

### 含まない

- 新規 backtest の再実行
- strategy preset / campaign / workflow 実装変更
- unrelated archive 整理

## TDD / テスト戦略

- 主作業が文書更新のみならコード変更は行わない
- 補助スクリプトや自動生成ロジックに変更が必要な場合のみ RED -> GREEN -> REFACTOR で進める
- RED: 抽出や生成結果の失敗テストを追加する
- GREEN: 最小修正で通す
- REFACTOR: 重複や可読性だけを整える
- コード変更が発生した場合のみ対象テストとカバレッジ確認を実施する

## 検証コマンド候補

- `gh run view 24953124968 --json conclusion,createdAt,updatedAt,headBranch,status,url,event,databaseId,name`
- `gh run view 24953124968 --log`
- `gh api repos/FPXszk/Oh-MY-TradingView/actions/runs/24953124968/artifacts`
- `git diff -- docs/research docs/reports/archive`
- `git status --short`

## リスク / 注意点

- run68 の campaign 名を確認する前に run67 前提で書き始めると誤要約になる
- `manifest.json` だけ更新して実体ファイルや scoreboard を更新しないと current 導線が壊れる
- 既存の current / archive 命名規則に合わせないと整理ルールと衝突する
- 作業ツリーに別差分が混ざる可能性があるため、commit 対象は本件の差分のみに限定する

## 実装ステップ

- [ ] run68 の workflow / artifact / campaign 情報を確定する
- [ ] run67 を基準に見出し構成と比較粒度を固定する
- [ ] run68 の詳細レポートを `docs/reports/archive/` に作成する
- [ ] run68 の current research 要約を `docs/research/` に作成する
- [ ] `manifest.json` と必要な scoreboard を更新する
- [ ] 数値・結論・参照パスの整合性をレビューする
- [ ] plan を `docs/exec-plans/completed/` に移動する
- [ ] Conventional Commit で commit し、`main` に push する

## 完了条件

- `run68` が前回と同等の粒度で report / research に記録されている
- 結論と今後の改善方向が current research に含まれている
- `docs/research/manifest.json` の current 導線が `run68` を指している
- plan が completed に移動し、対象差分のみが push されている
