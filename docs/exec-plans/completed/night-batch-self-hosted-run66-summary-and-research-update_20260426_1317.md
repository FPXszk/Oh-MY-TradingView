# Night Batch Self Hosted #66 結果要約・research 更新・プッシュ計画

作成日時: 2026-04-26 13:17 JST

## 目的

`Night Batch Self Hosted #66` の結果を前回と同じ粒度で整理し、結論を更新する。既存の `run64` 導線と同じ構成で `reports` / `research` を更新し、レビュー後に Conventional Commit でコミットして `main` へプッシュする。

## 事前確認

- 粒度の基準は `docs/reports/archive/night-batch-self-hosted-run64.md` と `docs/research/night-batch-self-hosted-run64_20260424.md`
- `docs/research/manifest.json` は current の keep-set を管理しているため、新しい research ドキュメントを追加した場合は同時更新が必要
- `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md` が存在するため、その差分には触れず今回の run66 更新だけに範囲を限定する

## 変更・作成・移動するファイル

### 作成

- `docs/exec-plans/active/night-batch-self-hosted-run66-summary-and-research-update_20260426_1317.md`
- `docs/reports/archive/night-batch-self-hosted-run66.md`
- `docs/research/night-batch-self-hosted-run66_20260426.md`

### 更新

- `docs/research/manifest.json`
- `docs/research/artifacts-backtest-scoreboards.md`

### 調査対象

- GitHub Actions workflow `Night Batch Self Hosted` の run `#66`
- run66 artifact summary (`gha_*summary.json` 想定)
- run66 campaign artifact 配下の `recovered-summary.json`
- run66 campaign artifact 配下の `strategy-ranking.json`
- run66 campaign artifact 配下の `strategy-ranking.md`
- `docs/reports/archive/night-batch-self-hosted-run64.md`
- `docs/research/night-batch-self-hosted-run64_20260424.md`

### 完了時に移動

- `docs/exec-plans/active/night-batch-self-hosted-run66-summary-and-research-update_20260426_1317.md`
- 移動先: `docs/exec-plans/completed/night-batch-self-hosted-run66-summary-and-research-update_20260426_1317.md`

## 実装内容と影響範囲

- GitHub Actions から run66 の workflow 結果・artifact・campaign 出力を特定する
- `run64` と同じ粒度で、以下を `docs/reports/archive/night-batch-self-hosted-run66.md` に整理する
  - workflow / artifact の成功可否
  - smoke / production の実行集計
  - execution の安定性
  - performance ranking
  - 主要戦略の比較
  - 前回との差分と最終結論
- `docs/research/night-batch-self-hosted-run66_20260426.md` に current 向けの短い要約を作る
- `docs/research/manifest.json` を run66 文書へ差し替える
- `docs/research/artifacts-backtest-scoreboards.md` は、run66 artifact が current 比較対象を更新する場合のみ内容を反映する
- 差分レビュー後、plan を completed へ移動してコミット・プッシュする

## スコープ

### 含む

- run66 の結果確認
- 前回と同粒度の要約作成
- research current 導線更新
- 必要な scoreboard 更新
- レビュー
- コミット・プッシュ

### 含まない

- backtest の再実行
- strategy preset / campaign 定義の変更
- CLI / workflow ロジックの修正
- 別 active plan の整理や移管

## TDD / テスト戦略

- 今回の主作業がドキュメント更新のみで完結する場合、実装対象は文書更新に限定する
- もし run66 artifact の整理のためにスクリプト修正が必要になった場合のみ RED -> GREEN -> REFACTOR で進める
  - RED: 期待する抽出結果に対する失敗テストを先に追加する
  - GREEN: 最小限の修正で通す
  - REFACTOR: 重複や可読性のみ整える
- コード変更が発生した場合のみ、対象テストとカバレッジ確認を行う

## 検証コマンド候補

- `git status --short`
- `git diff -- docs/reports/archive/night-batch-self-hosted-run66.md docs/research/night-batch-self-hosted-run66_20260426.md docs/research/manifest.json docs/research/artifacts-backtest-scoreboards.md`
- `sed -n '1,260p' docs/reports/archive/night-batch-self-hosted-run66.md`
- `sed -n '1,220p' docs/research/night-batch-self-hosted-run66_20260426.md`
- `node --test tests/repo-layout.test.js tests/archive-latest-policy.test.js`

## リスク / 注意点

- run66 の artifact 名や campaign 名が run64 と異なる可能性があり、誤った artifact を参照すると結論が崩れる
- `research` current は keep-set 管理なので、manifest 更新漏れがあると archive policy と矛盾する
- `artifacts-backtest-scoreboards.md` は current 比較の正本の一つなので、更新要否を誤ると run66 の位置づけが不正確になる
- push 時には他差分を巻き込まないよう、コミット対象を今回のファイルに限定する必要がある

## 実装ステップ

- [ ] run66 の workflow 情報と artifact 一式を特定する
- [ ] run64 の見出し構成を基準に、run66 で埋める項目を固定する
- [ ] run66 の smoke / production / ranking / comparison を整理する
- [ ] `docs/reports/archive/night-batch-self-hosted-run66.md` を作成する
- [ ] `docs/research/night-batch-self-hosted-run66_20260426.md` を作成する
- [ ] `docs/research/manifest.json` を run66 向けに更新する
- [ ] 必要なら `docs/research/artifacts-backtest-scoreboards.md` を更新する
- [ ] 数値・結論・参照パスの整合性をレビューする
- [ ] plan を `docs/exec-plans/completed/` に移動する
- [ ] 関連差分のみを Conventional Commit でコミットし、`main` へプッシュする

## 完了条件

- run66 の結果が run64 と同等の粒度で説明されている
- `reports` と `research` の導線が run66 に更新されている
- manifest / scoreboard が実際の current 状態と整合している
- plan が completed に移動している
- 対象差分のみがコミット・プッシュされている
