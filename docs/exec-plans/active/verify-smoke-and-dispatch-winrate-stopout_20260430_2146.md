# Exec-plan: verify-smoke-and-dispatch-winrate-stopout_20260430_2146

## 概要

目的: `ema-breakout-winrate-stopout-us40-50pack` が smoke で正常に動作するか確認し、問題なければ `Night Batch Self Hosted` workflow をその campaign に切り替えて起動する。

現時点の確認結果:

- 新 campaign 定義: `config/backtest/campaigns/ema-breakout-winrate-stopout-us40-50pack.json`
- 新 preset / Pine は前タスクで追加済み
- 既定 workflow config `config/night_batch/bundle-foreground-reuse-config.json` の `bundle.us_campaign` は **まだ** `ema-macd-rsi-breakout-us40-50pack`
- したがって workflow をそのまま流すと、新 50-pack ではなく旧 EMA breakout pack が走る

採用する方針:

- Step 1: ローカルで `ema-breakout-winrate-stopout-us40-50pack` の smoke 実行を確認する
- Step 2: smoke が通った場合のみ `config/night_batch/bundle-foreground-reuse-config.json` の `bundle.us_campaign` を新 campaign へ切り替える
- Step 3: `gh workflow run` で `Night Batch Self Hosted` を dispatch し、run ID を確認する
- smoke が失敗した場合は workflow 起動へ進まず、原因修正を優先する

## 変更ファイル

- `docs/exec-plans/active/verify-smoke-and-dispatch-winrate-stopout_20260430_2146.md` (本計画の作成)
- `config/night_batch/bundle-foreground-reuse-config.json` (smoke 成功時のみ `bundle.us_campaign` を切替)
- 必要に応じて関連 Pine / preset / campaign 定義 (smoke failure の原因修正が必要な場合のみ)
- `docs/exec-plans/completed/verify-smoke-and-dispatch-winrate-stopout_20260430_2146.md` (COMMIT step で移動)

## 影響範囲

- 次回 `Night Batch Self Hosted` の既定 US campaign が新 50-pack に切り替わる
- smoke 失敗時は Pine / preset / campaign の追加修正が入り得る
- `docs/exec-plans/active/run-night-batch_20260429_2344.md` の「既定 config をそのまま実行する」意図と一部重なるため、実行対象の整合に注意が必要

## 実装ステップ

- [ ] 新 campaign の smoke を `node scripts/backtest/run-finetune-bundle.mjs --host 127.0.0.1 --ports 9223 --phases smoke --us-campaign ema-breakout-winrate-stopout-us40-50pack` で確認する
- [ ] smoke failure の場合は compile/runtime 原因を特定し、最小修正だけを入れて smoke を再実行する
- [ ] smoke success の場合のみ `config/night_batch/bundle-foreground-reuse-config.json` の `bundle.us_campaign` を `ema-breakout-winrate-stopout-us40-50pack` へ切り替える
- [ ] `gh workflow run .github/workflows/night-batch-self-hosted.yml --ref main --field config_path=config/night_batch/bundle-foreground-reuse-config.json` を実行する
- [ ] `gh run list --workflow 'Night Batch Self Hosted' --limit 5` で新 run を確認し、必要なら `gh run view <run-id>` で起動状態を確認する

## テスト戦略

- RED: smoke 実行で compile / runtime failure が出るなら再現済みとみなす
- GREEN: smoke 50 / 50 success を確認し、その後 workflow が正常に dispatch されることを確認する
- REFACTOR: なし。修正が必要でも smoke 通過に必要な最小限に留める

## 検証コマンド

- `node scripts/backtest/run-finetune-bundle.mjs --host 127.0.0.1 --ports 9223 --phases smoke --us-campaign ema-breakout-winrate-stopout-us40-50pack`
- `node -e "const fs=require('fs'); const cfg=JSON.parse(fs.readFileSync('config/night_batch/bundle-foreground-reuse-config.json','utf8')); console.log(cfg.bundle.us_campaign)"`
- `gh workflow run .github/workflows/night-batch-self-hosted.yml --ref main --field config_path=config/night_batch/bundle-foreground-reuse-config.json`
- `gh run list --workflow 'Night Batch Self Hosted' --limit 5`
- `gh run view <run-id>`

## リスク・注意点

- `9223` の TradingView worker が利用不能だと smoke 確認自体が進まない
- smoke 通過後に既定 config を切り替えるため、以後同 config を使う night batch は新 50-pack を対象にする
- workflow 起動は self-hosted runner の状態に依存し、queue / stall / failure の可能性がある

## 範囲外

- full backtest 結果の要約作成
- JP campaign の追加変更
- NVDA 依存の再評価

---

作成者: Codex
作成日時: 2026-04-30T21:46:00+09:00
