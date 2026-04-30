# Exec-plan: verify-smoke-and-dispatch-winrate-stopout_20260430_2146

## 概要

目的: `ema-breakout-winrate-stopout-us40-50pack` を `Night Batch Self Hosted` workflow の既定 campaign に切り替えて起動する。

現時点の確認結果:

- 新 campaign 定義: `config/backtest/campaigns/ema-breakout-winrate-stopout-us40-50pack.json`
- 新 preset / Pine は前タスクで追加済み
- 既定 workflow config `config/night_batch/bundle-foreground-reuse-config.json` の `bundle.us_campaign` は **まだ** `ema-macd-rsi-breakout-us40-50pack`
- したがって workflow をそのまま流すと、新 50-pack ではなく旧 EMA breakout pack が走る

採用する方針:

- ユーザー承認により、ローカル smoke 成否では止めず、workflow 側の startup / recovery 実績を優先する
- したがって `config/night_batch/bundle-foreground-reuse-config.json` の `bundle.us_campaign` を新 campaign に切り替え、そのまま `gh workflow run` で `Night Batch Self Hosted` を dispatch する
- 参考として、ローカル smoke は `9223` preflight 不通で未完了だったことを記録する

## 変更ファイル

- `docs/exec-plans/active/verify-smoke-and-dispatch-winrate-stopout_20260430_2146.md` (本計画の作成)
- `config/night_batch/bundle-foreground-reuse-config.json` (`bundle.us_campaign` を新 campaign へ切替)
- `docs/exec-plans/completed/verify-smoke-and-dispatch-winrate-stopout_20260430_2146.md` (COMMIT step で移動)

## 影響範囲

- 次回 `Night Batch Self Hosted` の既定 US campaign が新 50-pack に切り替わる
- `docs/exec-plans/active/run-night-batch_20260429_2344.md` の「既定 config をそのまま実行する」意図と一部重なるため、実行対象の整合に注意が必要

## 実装ステップ

- [x] ローカル smoke は試行済みだが、`9223` preflight 不通で未完了だったことを確認する
- [x] `config/night_batch/bundle-foreground-reuse-config.json` の `bundle.us_campaign` を `ema-breakout-winrate-stopout-us40-50pack` へ切り替える
- [x] `gh workflow run 'Night Batch Self Hosted' --ref main --field config_path=config/night_batch/bundle-foreground-reuse-config.json` を実行する
- [x] `gh run list --workflow 'Night Batch Self Hosted' --limit 5` と `gh run view 25167631554 --log-failed` で結果を確認する

## テスト戦略

- RED: なし。ローカル smoke は環境要因で未完了
- GREEN: workflow 既定 campaign の切替と `workflow_dispatch` 成功を確認する
- REFACTOR: なし。修正が必要でも smoke 通過に必要な最小限に留める

## 検証コマンド

- `node -e "const fs=require('fs'); const cfg=JSON.parse(fs.readFileSync('config/night_batch/bundle-foreground-reuse-config.json','utf8')); console.log(cfg.bundle.us_campaign)"`
- `gh workflow run .github/workflows/night-batch-self-hosted.yml --ref main --field config_path=config/night_batch/bundle-foreground-reuse-config.json`
- `gh run list --workflow 'Night Batch Self Hosted' --limit 5`
- `gh run view <run-id>`

## リスク・注意点

- ローカル `9223` の TradingView worker は現時点で不通のまま
- 既定 config を切り替えるため、以後同 config を使う night batch は新 50-pack を対象にする
- workflow 起動は self-hosted runner の状態に依存し、queue / stall / failure の可能性がある

## 実行結果

- workflow は `run_id=25167631554` として起動した
- self-hosted runner 上では `172.31.144.1:9223` の preflight/readiness は通過した
- ただし smoke phase で `Campaign strategy "emr-breakout-winrate-stopout-anchor-trend-price-above-ema200" not found in strategy catalog` により失敗した
- したがって今回の失敗要因はローカル `9223` 未接続ではなく、新 campaign 内 strategy 名の typo / catalog 不整合である

## 範囲外

- full backtest 結果の要約作成
- JP campaign の追加変更
- NVDA 依存の再評価

---

作成者: Codex
作成日時: 2026-04-30T21:46:00+09:00
