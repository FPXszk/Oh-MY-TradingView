# Exec-plan: latest-backtest-results-run79-template-summary_20260501_1100

## 概要

目的: 最新の GitHub Actions 成功 run である `Night Batch Self Hosted #79` の backtest 成果物を取得し、`docs/research/TEMPLATE.md` 準拠の研究ドキュメントへ整理し、関連する research manifest とあわせて GitHub へ反映する。

計画作成時の確認結果:

- 最新成功 run は `Night Batch Self Hosted #79` / run id `25169766862`
- 実行開始は `2026-04-30 23:02:02 JST`、完了は `2026-05-01 01:17:06 JST`
- 直前の `#78` は `2026-04-30 22:18:26 JST` に失敗しており、最新 successful run は `#79`
- `#79` の artifact には `campaigns/ema-breakout-winrate-stopout-us40-50pack/full/strategy-ranking.json` と `recovered-results.json` が存在する
- `docs/research/` の既存最新サマリは `night-batch-self-hosted-run77_20260430.md` で、run79 のサマリは未作成
- `docs/exec-plans/active/run-night-batch_20260429_2344.md` は workflow 実行計画であり、今回の research 追記とは変更対象が重ならない

## 変更ファイル

- `docs/exec-plans/active/latest-backtest-results-run79-template-summary_20260501_1100.md` (本計画の作成)
- `docs/research/night-batch-self-hosted-run79_20260501.md` (run79 のテンプレート準拠サマリを新規作成)
- `docs/research/manifest.json` (run79 を keep-set に追加)
- `docs/exec-plans/completed/latest-backtest-results-run79-template-summary_20260501_1100.md` (COMMIT step で移動)

## 実装内容と影響範囲

- run79 artifact の `full/strategy-ranking.json` を正本として、市場別平均、全戦略一覧、Top 3、除外候補、銘柄集中度、次回確認事項を算出する
- Top 1 の銘柄別テーブルと Top 3 の集中度計算のために `full/recovered-results.json` を参照する
- 研究ドキュメントは `docs/research/` に 1 ファイル追加するだけに留め、既存 run67/run68/run69/run70/run71/run72/run77 の本文は変更しない
- archive 管理の整合性のため `docs/research/manifest.json` だけを最小限更新する

## 実装ステップ

- [ ] `#79` artifact の `full/strategy-ranking.json` / `recovered-results.json` を入力として確定し、テンプレート記入に必要な数値を抽出する
- [ ] `docs/research/TEMPLATE.md` の各セクションに対応する集計値を算出し、未記入サンプル文言が残らないことを確認する
- [ ] `docs/research/night-batch-self-hosted-run79_20260501.md` を新規作成する
- [ ] `docs/research/manifest.json` の keep-set を更新する
- [ ] 文書レビューを行い、テンプレート必須セクション漏れと数値不整合がないことを確認する
- [ ] 計画ファイルを `completed/` へ移動し、関連変更のみを Conventional Commits でコミットして `main` に push する

## テスト戦略

- RED: なし。既存不具合修正ではなく、artifact からのドキュメント生成
- GREEN: template の必須セクションが全て埋まっていること、`例:` のサンプル文言が残っていないこと、Top 1 銘柄表と集中度計算が `recovered-results.json` と一致することを確認する
- REFACTOR: なし。文書と manifest の最小変更に限定する

## 検証コマンド

- `gh api repos/FPXszk/Oh-MY-TradingView/actions/runs/25169766862`
- `gh run download 25169766862 --dir /tmp/night-batch-run79`
- `rg '例:' docs/research/night-batch-self-hosted-run79_20260501.md`
- `git diff -- docs/research docs/exec-plans`

## リスク・注意点

- run79 の `strategy-ranking.json` には `success_count = 0` かつ主要指標 `null` の戦略が含まれるため、平均との差や除外候補の扱いで null 除外ルールを明示して記述する必要がある
- artifact summary では `startup-check` が失敗表示だが、`preflight` / `smoke` / `production` は成功し、termination も `success` のため、研究サマリでは run 全体の解釈を誤らないよう補足が必要
- 作業ツリーには未追跡の `artifacts/campaigns/ema-macd-rsi-breakout-us40-50pack/` と `docs/research/current/` があるため、commit 対象を広げないよう注意する

## 範囲外

- 新しい night batch の再実行
- 既存 strategy preset や workflow の修正
- `docs/research/current/` や `docs/research/artifacts-backtest-scoreboards.md` の更新

---

作成者: Codex
作成日時: 2026-05-01T11:00:00+09:00
