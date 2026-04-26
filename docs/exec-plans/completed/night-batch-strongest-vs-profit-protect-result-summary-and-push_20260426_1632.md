# strongest vs profit-protect Night Batch 結果要約・research 更新・プッシュ計画

作成日時: 2026-04-26 16:32 JST

## 目的

完了した最新 `Night Batch Self Hosted` run (`run_id 24948625082`) の結果を、前回 `run66` と同じ粒度で要約する。`docs/reports/archive/` と `docs/research/` を更新し、比較結果の結論と次の改善候補・比較案も文書化したうえで commit / push する。

## 事前確認

- 前回粒度の基準は `docs/reports/archive/night-batch-self-hosted-run66.md` と `docs/research/night-batch-self-hosted-run66_20260426.md`
- 今回の対象 campaign は `strongest-vs-profit-protect-us40-10pack`
- strongest 比較の正本は `docs/research/archive/main-backtest-current-summary.md`
- `docs/research/manifest.json` は current keep-set を管理しているため、新しい run 文書を current に置く場合は同時更新が必要

## 変更・作成・移動するファイル

### 作成

- `docs/exec-plans/active/night-batch-strongest-vs-profit-protect-result-summary-and-push_20260426_1632.md`
- `docs/reports/archive/night-batch-self-hosted-run67.md` または実際の run number に対応する詳細レポート
- `docs/research/night-batch-self-hosted-run67_20260426.md` または実際の run number に対応する current 要約

### 更新

- `docs/research/manifest.json`
- `docs/research/artifacts-backtest-scoreboards.md`
- 必要なら `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/*` 配下の ranking / summary artifact metadata

### 調査対象

- GitHub Actions workflow `Night Batch Self Hosted` run `24948625082`
- 最新 artifact summary (`gha_*summary.json`, `gha_*summary.md`)
- 最新 campaign artifact 配下の `recovered-summary.json`
- 最新 campaign artifact 配下の `strategy-ranking.json`
- 最新 campaign artifact 配下の `strategy-ranking.md`
- `docs/research/archive/main-backtest-current-summary.md`
- `docs/reports/archive/night-batch-self-hosted-run66.md`

### 完了時に移動

- `docs/exec-plans/active/night-batch-strongest-vs-profit-protect-result-summary-and-push_20260426_1632.md`
- 移動先: `docs/exec-plans/completed/night-batch-strongest-vs-profit-protect-result-summary-and-push_20260426_1632.md`

## 実装内容と影響範囲

- latest run の workflow 結果・artifact・campaign 出力を取得する
- `run66` と同じ粒度で詳細レポートを作成する
  - workflow / artifact の成功可否
  - smoke / production の実行集計
  - execution 安定性
  - performance ranking
  - strongest 基準との比較結論
  - 次の改善候補 / 比較案
- current 向けの短い research 要約を作成する
- `docs/research/manifest.json` を新 run 文書へ更新する
- `docs/research/artifacts-backtest-scoreboards.md` を最新 artifact に合わせて更新する
- 差分レビュー後、plan を completed へ移動して commit / push する

## スコープ

### 含む

- latest run 結果確認
- 前回と同粒度の summary 作成
- strongest との比較結論
- 次の改善候補 / 比較案の文書化
- research current 導線更新
- commit / push

### 含まない

- 新たな backtest 再実行
- strategy preset / campaign ロジックの変更
- workflow 実装の修正

## TDD / テスト戦略

- 今回の主作業が artifact / 文書更新のみで完結する場合、コード修正は前提にしない
- もし artifact 整理や scoreboards 生成の補助コード修正が必要なら RED -> GREEN -> REFACTOR で進める
  - RED: 抽出や生成の失敗テストを先に追加
  - GREEN: 最小限の修正で通す
  - REFACTOR: 重複や可読性を整理
- コード変更がない場合も、repo policy テストは実行する

## 検証コマンド候補

- `gh run view 24948625082 --json conclusion,createdAt,updatedAt,headBranch,status,url,event,headSha,databaseId`
- `gh api repos/fpxszk/Oh-MY-TradingView/actions/runs/24948625082/artifacts`
- `node --test tests/repo-layout.test.js tests/archive-latest-policy.test.js`
- `git diff -- docs/reports/archive docs/research`

## リスク / 注意点

- 最新 run の run number と artifact 名を取り違えると `run66` 導線と混線する
- current research の keep-set 更新漏れがあると archive policy と矛盾する
- strongest と latest 比較は universe /戦略条件の差を誤って単純比較しないよう注意が必要
- commit 時は今回の結果更新差分のみに限定する必要がある

## 実装ステップ

- [ ] latest run の workflow 情報と artifact 一式を特定する
- [ ] 前回 `run66` の見出し構成を基準に、今回埋める項目を固定する
- [ ] latest run の smoke / production / ranking / strongest 比較を整理する
- [ ] 詳細レポートを作成する
- [ ] current 向け research 要約を作成する
- [ ] `docs/research/manifest.json` と scoreboard を更新する
- [ ] 数値・結論・参照パスの整合性をレビューする
- [ ] 必要テストを実行する
- [ ] plan を `docs/exec-plans/completed/` に移動する
- [ ] Conventional Commit で commit して `main` に push する

## 完了条件

- latest run の結果が `run66` と同等の粒度で記録されている
- strongest 比較の結論と次の改善候補が文書化されている
- `research` current 導線が latest run に更新されている
- plan が completed に移動し、対象差分のみが push されている
