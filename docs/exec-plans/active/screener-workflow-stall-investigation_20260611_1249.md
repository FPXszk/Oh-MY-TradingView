# Screener Workflow Stall Investigation

## 目的
- `Daily Fundamental Screener` または `Daily Fundamental Screener Japan` のワークフローが停止・未実行・ハングしていないかを特定する。
- 原因が GitHub Actions 側の実行状態、self-hosted runner、またはワークフロー内ステップのどこにあるかを切り分ける。

## 変更・作成・削除するファイル
- 作成: `docs/exec-plans/active/screener-workflow-stall-investigation_20260611_1249.md`
- 読み取りのみ: `.github/workflows/daily-screener.yml`
- 読み取りのみ: `.github/workflows/daily-screener-japan.yml`
- 読み取りのみ: self-hosted runner 関連スクリプトや補助スクリプト（必要時のみ特定して確認）

## スコープ
- 対象はスクリーニング系ワークフローの実行状況調査と原因切り分け。
- 必要なら最小限の修正案まで整理するが、この計画段階では実装修正は含めない。

## スコープ外
- ポートフォリオ系ワークフローの調査
- 依頼がない広範囲なリファクタリング
- 調査と無関係な通知文面やレポート整形の変更

## 影響範囲
- GitHub Actions の実行状況確認
- self-hosted runner 利用状況の確認
- 必要時に対象ワークフロー定義と関連スクリプトの確認

## 検証方針
- `gh` で最近の run 一覧、run 詳細、job 状態、ログ要約を確認する。
- 停止箇所が特定できたら、該当ステップのローカル再現可否を確認する。
- 修正が必要な場合のみ、再実行またはローカル検証コマンドを定義する。

## タスク
- [ ] 対象ワークフロー名と最近の run 状態を確認する
- [ ] 停止・未実行・長時間実行のどれかを切り分ける
- [ ] 必要に応じて job / step ログを確認して根因候補を整理する
- [ ] 必要に応じて関連スクリプトや runner 状態を確認する
- [ ] 結果をまとめ、必要なら最小修正案を提示する
