# Exec-plan: ema-breakout-night-batch-failure-fix_20260430_1150

## 概要

目的: `Night Batch Self Hosted #76` (`run_id=25142437745`) で `ema-macd-rsi-breakout-us40-50pack` が大量に `FAIL (unknown)` となった原因を特定し、同系統の再発を防ぐ最小修正を行ったうえで再実行確認する。

現時点の確認結果:

- workflow 自体は `success` だが、backtest 結果は不良
- 実行時間は `59m14s` で、2000 run 完走ではない
- `smoke`: `Success 1 / Failure 49 / Total 50`
- `full`: `Success 40 / Failure 245 / Total 285`
- `245 failure` は `49 presets x 5 consecutive failures` と一致し、`execution.max_consecutive_failures=5` により 49 preset が打ち切られたと読める
- `FAIL (unknown)` は `scripts/backtest/run-long-campaign.mjs` の表示仕様により、`result.error` と `tester_reason_category` が空の失敗をそのまま `unknown` と出している
- baseline script は比較的単純で、派生 49 本は共通の追加ロジックを持つため、**派生テンプレート側の共通不具合** または **失敗理由の欠落** が第一容疑

## 変更ファイル

- `docs/exec-plans/active/ema-breakout-night-batch-failure-fix_20260430_1150.md` (本計画)
- `src/core/backtest.js` (失敗理由の補足、必要なら apply/tester failure の result 反映を強化)
- `scripts/backtest/run-long-campaign.mjs` (failure 表示や追加診断の改善)
- `src/core/campaign.js` (必要なら rerun / failure-budget 判定の補助理由を改善)
- 必要に応じて:
  - `config/backtest/campaigns/ema-macd-rsi-breakout-us40-50pack.json`
  - `config/backtest/strategy-catalog.json`
  - `config/backtest/strategy-presets.json`
  - `docs/references/pine/ema-macd-rsi-breakout-us40-50pack/*.pine`
- workflow 再実行後に生成・更新される artifact / research summary 一式
- `docs/exec-plans/completed/ema-breakout-night-batch-failure-fix_20260430_1150.md` (COMMIT step で移動)

## 影響範囲

- EMA/MACD/RSI 50-pack の実行成功率
- backtest failure 時の観測性 (`unknown` の削減)
- night batch の既定 campaign は現状 `ema-macd-rsi-breakout-us40-50pack` のままなので、修正後の再実行結果が次の基準になる

## 実装ステップ

- [ ] `run #76` の失敗をローカルで最小再現する
- [ ] baseline で通る preset と、smoke で落ちる派生 preset を 1 本ずつ比較し、Pine compile / apply / tester metrics のどこで落ちるか確定する
- [ ] 原因が Pine 共通テンプレートにある場合は、その最小修正を 49 variant へ反映する
- [ ] 同時に `unknown` しか出ない failure を潰すため、`result.error` / `apply_reason` / `tester_reason` の採取を強化する
- [ ] ローカルで少なくとも `smoke` 相当の再現確認を行い、失敗理由が可視化されるか、または成功へ転ぶかを確認する
- [ ] `Night Batch Self Hosted` を再実行し、`smoke` と `full` の進捗を確認する
- [ ] 必要なら最新結果を要約し、完走しない場合も失敗理由が `unknown` でなくなったことまで確認する

## テスト戦略

- RED:
  - 現行の失敗 preset 1 本を `SPY` で再現し、失敗内容を固定する
- GREEN:
  - 修正後に同 preset の failure reason が具体化される、または smoke が成功することを確認する
  - 可能なら `smoke` campaign 全体で `1/50` より明確に改善することを確認する
- REFACTOR:
  - 失敗理由の集約とログ出力を最小限整理する

## 検証コマンド

- `node src/cli/index.js backtest preset <preset-id> --symbol SPY`
- `node scripts/backtest/run-long-campaign.mjs ema-macd-rsi-breakout-us40-50pack --phase smoke`
- `gh workflow run 258955874 --ref main --field config_path=config/night_batch/bundle-foreground-reuse-config.json`
- `gh run list --workflow 258955874 --limit 5`
- `gh run view <run-id>`

## リスク・注意点

- `docs/exec-plans/active/run-night-batch_20260429_2344.md` が未完了のまま残っている
- TradingView / CDP 側の一時的不安定ではなく preset ロジック自体の問題なら、複数 Pine ファイル更新が必要になる
- GitHub API 接続が不安定で artifact 取得に失敗する場合があるため、必要に応じてローカル再現を主軸にする
- `bundle-foreground-reuse-config.json` は既定 campaign を EMA/MACD/RSI に向けたままなので、修正前に他者が実行すると同じ失敗を踏む

## 範囲外

- EMA/MACD/RSI 50-pack の戦略性能最適化
- Donchian 系 campaign の再設計
- GitHub Actions の Node 20 deprecation 対応

---

作成者: Codex
作成日時: 2026-04-30T11:50:00+09:00
