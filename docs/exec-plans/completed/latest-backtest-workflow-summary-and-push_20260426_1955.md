# 最新バックテストワークフロー要約・research格納・プッシュ計画

作成日時: 2026-04-26 19:55 JST

## 目的

最新のバックテストワークフロー結果を特定し、前回と同じ粒度で要約する。結論と今後の改善方向を明記した research 文書を既存運用に合わせて `docs/research/` 配下へ更新し、レビュー後に commit / push する。

## 前提・確認事項

- ユーザー指定の `docs/reserch` は、既存ディレクトリ構成に存在する `docs/research/` を指す前提で進める
- 最新 current research は `docs/research/night-batch-self-hosted-run67_20260426.md`
- 直近の詳細レポートは `docs/reports/archive/night-batch-self-hosted-run67.md`
- current keep-set は `docs/research/manifest.json` で管理されている
- `docs/exec-plans/active/` には別 active plan が 1 件あるが、本件とは対象ファイルが重ならない見込み

## 変更・作成・移動するファイル

### 作成

- `docs/exec-plans/active/latest-backtest-workflow-summary-and-push_20260426_1955.md`

### 更新候補

- `docs/research/night-batch-self-hosted-run67_20260426.md`
- `docs/research/artifacts-backtest-scoreboards.md`
- `docs/research/manifest.json`
- 必要なら `docs/reports/archive/night-batch-self-hosted-run67.md`

### 調査対象

- `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/full/recovered-summary.json`
- `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/full/strategy-ranking.json`
- `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/full/strategy-ranking.md`
- `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/smoke/recovered-summary.json`
- `docs/research/night-batch-self-hosted-run66_20260426.md`
- `docs/reports/archive/night-batch-self-hosted-run66.md`
- `docs/reports/archive/night-batch-self-hosted-run67.md`

### 完了時に移動

- `docs/exec-plans/active/latest-backtest-workflow-summary-and-push_20260426_1955.md`
- 移動先: `docs/exec-plans/completed/latest-backtest-workflow-summary-and-push_20260426_1955.md`

## 実装内容と影響範囲

- 最新 workflow の smoke / full / ranking /比較結果を再確認する
- 前回と同じ粒度の見出し構成を抽出し、今回の current research に反映する
- research 文書に最低限以下を含める
  - workflow の結論
  - 主ランキングと比較ポイント
  - strongest 基準との位置づけ
  - 今後の改善方向
- 必要に応じて scoreboard と manifest の current 導線を整える
- 差分レビュー後、plan を completed へ移動して Conventional Commit で push する

## スコープ

### 含む

- 最新バックテスト workflow 結果の確認
- 前回同粒度の research 要約更新
- 結論と改善方向の記載
- 必要な current research 導線更新
- commit / push

### 含まない

- 新しい backtest の再実行
- strategy preset / campaign / workflow 実装の変更
- archive 大整理や unrelated 文書修正

## TDD / テスト戦略

- 主作業がドキュメント更新のみならコード変更は行わない
- もし補助スクリプトや検証ロジックの修正が必要になった場合のみ RED -> GREEN -> REFACTOR で進める
- RED: 期待する抽出結果や文書生成結果を先に失敗テスト化する
- GREEN: 最小限の修正で通す
- REFACTOR: 可読性と重複だけを改善する
- コード変更が発生した場合のみ対象テストとカバレッジ確認を実施する

## 検証コマンド候補

- `git status --short`
- `git diff -- docs/research docs/reports/archive`
- `sed -n '1,260p' docs/research/night-batch-self-hosted-run67_20260426.md`
- `sed -n '1,260p' docs/reports/archive/night-batch-self-hosted-run67.md`
- `sed -n '1,220p' artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/full/strategy-ranking.md`

## リスク / 注意点

- 既存 current research はすでに run67 を指しているため、更新範囲を広げすぎると不要差分になりやすい
- `docs/research/manifest.json` を触る必要がないケースでは変更しない方が安全
- run66 と run67 は campaign が異なるため、比較時に「同条件の直接比較」と「前回要約粒度」の区別を崩さない
- 作業ツリーに別差分がある可能性があるため、commit 対象は今回変更分に限定する

## 実装ステップ

- [ ] 最新 workflow の正本 artifact と既存要約の対応関係を確定する
- [ ] 前回と同じ粒度の見出し・比較軸を固定する
- [ ] `docs/research/night-batch-self-hosted-run67_20260426.md` を中心に結論と改善方向を追記する
- [ ] 必要なら scoreboard / manifest / 詳細レポートを最小差分で更新する
- [ ] 数値・参照パス・結論の整合性をレビューする
- [ ] plan を `docs/exec-plans/completed/` に移動する
- [ ] Conventional Commit で commit し、`main` に push する

## 完了条件

- 最新 workflow 結果が前回と同等の粒度で research にまとまっている
- 結論と今後の改善方向が明記されている
- current research の導線に破綻がない
- plan が completed に移動し、対象差分のみが push されている
