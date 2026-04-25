# 最新バックテスト結果サマリー作成・プッシュ計画

作成日時: 2026-04-26 01:19 JST

## 目的

最新のバックテスト成果物を特定し、前回と同様の粒度で結果を要約する。要約内容をリポジトリ内の既存ドキュメント運用に沿って更新し、レビュー後にコミット・プッシュする。

## 事前確認

- 前回粒度の基準候補は `docs/research/archive/main-backtest-current-summary.md`
- 現在確認できている最新成果物候補は `artifacts/campaigns/selected-us40-10pack/full/` と `artifacts/campaigns/selected-us40-10pack/smoke/`
- `docs/exec-plans/active/` には `repo-structure-align-and-archive-rules_20260424_2015.md` が存在するため、これとは独立した差分のみを扱う

## 変更・作成・移動するファイル

### 作成

- `docs/exec-plans/active/latest-backtest-results-summary-and-push_20260426_0119.md`

### 更新

- `docs/research/archive/main-backtest-current-summary.md`

### 完了時に移動

- `docs/exec-plans/active/latest-backtest-results-summary-and-push_20260426_0119.md`
- 移動先: `docs/exec-plans/completed/latest-backtest-results-summary-and-push_20260426_0119.md`

### 調査対象

- `artifacts/campaigns/selected-us40-10pack/full/recovered-summary.json`
- `artifacts/campaigns/selected-us40-10pack/full/strategy-ranking.json`
- `artifacts/campaigns/selected-us40-10pack/full/strategy-ranking.md`
- `artifacts/campaigns/selected-us40-10pack/smoke/recovered-summary.json`
- `artifacts/campaigns/selected-us40-10pack/smoke/strategy-ranking.json`
- `artifacts/campaigns/selected-us40-10pack/smoke/strategy-ranking.md`
- `docs/reports/archive/public-top10-us-40x10-final-400run.md`
- `docs/reports/archive/night-batch-public-vs-strongest.md`

## 実装内容と影響範囲

- 最新成果物の対象 run と比較対象を明確化する
- 前回と同粒度になるよう、少なくとも以下を要約に含める
  - 結論
  - 全体ランキングまたは主要ランキング
  - 上位戦略の詳細
  - 次回確認ポイント
- `docs/research/archive/main-backtest-current-summary.md` を最新内容に更新する
- 表現・数値・参照元 artifact の整合性をレビューする
- plan を completed へ移動し、関連差分のみ Conventional Commits でコミットしてプッシュする

## スコープ

### 含む

- 最新バックテスト成果物の特定
- 前回粒度の確認
- 要約ドキュメント更新
- 差分レビュー
- コミット・プッシュ

### 含まない

- バックテスト再実行
- strategy preset や campaign 定義の変更
- バックテストロジックや CLI の修正
- 既存の別 active plan の整理

## TDD / テスト戦略

- 今回の主作業がドキュメント更新のみで完結する場合は、コード変更を行わない
- もし要約生成の補助スクリプト修正が必要になった場合のみ、RED -> GREEN -> REFACTOR で進める
  - RED: 期待する summary 構造または数値抽出の失敗テストを先に追加する
  - GREEN: 最小限の修正でテストを通す
  - REFACTOR: 重複や可読性だけを改善する
- 今回は現時点でコード変更を前提にしないため、カバレッジ確認は「コード変更が発生した場合のみ」実施する

## 検証コマンド候補

- `git status --short`
- `git diff -- docs/research/archive/main-backtest-current-summary.md`
- `sed -n '1,260p' docs/research/archive/main-backtest-current-summary.md`
- `sed -n '1,220p' artifacts/campaigns/selected-us40-10pack/full/strategy-ranking.md`
- `sed -n '1,220p' artifacts/campaigns/selected-us40-10pack/smoke/strategy-ranking.md`

## リスク / 注意点

- `smoke` と `full` を混同すると前回比較の粒度が崩れる
- 既存 summary の run_id と最新 artifact の対応を誤ると、最新結果の要約として不正確になる
- 現在の作業ツリーには他作業の差分が存在する可能性があるため、コミット対象を厳密に限定する必要がある
- ドキュメント更新だけで十分か、別ファイルに新規レポートを切るべきかは、既存運用を確認したうえで最小変更で判断する

## 実装ステップ

- [ ] 最新バックテスト成果物の対象ディレクトリと比較対象ファイルを確定する
- [ ] 前回サマリーの粒度と見出し構成を確認し、今回踏襲する項目を固定する
- [ ] `full` / `smoke` のどちらを主結果として採用するかを根拠付きで判断する
- [ ] `docs/research/archive/main-backtest-current-summary.md` を最新結果で更新する
- [ ] 数値・表現・参照元 artifact の整合性をレビューする
- [ ] plan を `docs/exec-plans/completed/` へ移動する
- [ ] 関連差分のみを Conventional Commit でコミットし、リモートへプッシュする

## 完了条件

- 前回と同等の粒度で最新バックテスト結果を説明できる
- 更新した summary が参照 artifact と整合している
- plan が completed に移動している
- 対象差分のみがコミット・プッシュされている
