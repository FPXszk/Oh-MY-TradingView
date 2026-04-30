# Exec-plan: latest-backtest-results-template-summary_20260430_1958

## 概要

目的: `docs/research/TEMPLATE.md` に従い、現時点でリポジトリ内に存在する**最新のバックテスト成果物**を研究ドキュメントとして整理し、最終的に GitHub へ反映する。

計画作成時の確認結果:

- 既存の最新完走済み研究ドキュメント: `docs/research/night-batch-self-hosted-run72_20260429.md`
- 直近で更新された未追跡成果物: `artifacts/campaigns/ema-macd-rsi-breakout-us40-50pack/`
- ただし上記 campaign に存在するのは `smoke/` のみで、`full/strategy-ranking.json` は未生成
- `docs/research/TEMPLATE.md` は原則 `artifacts/campaigns/{campaign_name}/full/strategy-ranking.json` を入力前提としている

承認後の確定事項:

- ユーザー承認時に「最新は `Night Batch Self Hosted #77`」と明示された
- そのため、実装では GitHub Actions run `25145268087` の artifact を取得し、`/tmp/run77-artifact/.../ema-macd-rsi-breakout-us40-50pack/full/` を正式な入力として使用する

作成時点での解釈:

- 解釈A: 既存の最新完走済み `run72` を「最新」として追記・更新する
- 解釈B: 未追跡だが更新時刻が最新の `ema-macd-rsi-breakout-us40-50pack/smoke` を「最新」として新規研究ドキュメント化する
- 計画作成時点では **解釈B** を採用した。ただし最終実装では、ユーザーの追加指定に基づき `run77 full artifact` を正式ソースへ切り替えた

## 変更ファイル

- `docs/exec-plans/active/latest-backtest-results-template-summary_20260430_1958.md` (本計画の作成)
- `docs/research/night-batch-self-hosted-run77_20260430.md` (テンプレート準拠の新規サマリ)
- `docs/research/manifest.json` (current keep-set に run77 を追加)
- `docs/exec-plans/completed/latest-backtest-results-template-summary_20260430_1958.md` (COMMIT step で移動)

## 影響範囲

- `docs/research/` に最新 backtest の定型サマリが追加される
- 必要に応じて `manifest.json` の keep-set が更新され、archive 対象の判定に影響する
- 既存の backtest artifact や strategy preset 自体は変更しない

## 実装ステップ

- [x] `Night Batch Self Hosted #77` の artifact を取得し、`full/strategy-ranking.json` と `full/recovered-results.json` を正式入力として確定する
- [x] `full` 結果から市場別平均、全戦略一覧、Top 3、除外候補、銘柄集中度を計算する
- [x] `docs/research/night-batch-self-hosted-run77_20260430.md` を `docs/research/TEMPLATE.md` 準拠で新規作成し、サンプル文言を残さず実データへ置換する
- [x] `docs/research/manifest.json` の keep-set 更新要否を確認し、必要最小限で反映する
- [x] 文書レビューを行い、template 必須セクションが未記入なく埋まっていることを確認する
- [ ] 変更後に関連ファイルだけをコミットし、`main` へ push する

## テスト戦略

- RED: なし。既存 bug 修正ではなくドキュメント生成タスク
- GREEN: 参照 JSON の整合性確認と、template の必須セクションが未記入なく埋まっていることを確認する
- REFACTOR: なし。文書と必要最小限の manifest 更新に限定する

## 検証コマンド

- `gh run view 25145268087 --json name,headSha,createdAt,updatedAt,event,status,conclusion,url`
- `gh run download 25145268087 --dir /tmp/run77-artifact`
- `rg '例:' docs/research/<latest-backtest-summary>.md`
- `git diff -- docs/research docs/exec-plans`

## リスク・注意点

- `docs/exec-plans/active/run-night-batch_20260429_2344.md` が未完了のため、後続でさらに新しい run が追加される可能性がある
- 既に未追跡の `artifacts/campaigns/ema-macd-rsi-breakout-us40-50pack/` と `docs/research/current/` が存在するため、commit 対象を誤って広げないよう注意が必要

## 範囲外

- 新しい backtest の再実行
- `ema-macd-rsi-breakout-us40-50pack` の strategy/preset ロジック変更
- 既存研究ドキュメントの全面書き換え

---

作成者: Codex
作成日時: 2026-04-30T19:58:00+09:00
