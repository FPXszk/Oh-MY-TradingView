# Panic Reversal 戦略文書化と workflow 実行計画

## 概要

前回実装した panic reversal 系の「暴落時に買って保有し、回復条件で売る」考え方と、現時点の機械ルールを `docs/strategy/` に stable path で保存する。  
合わせて今回作業の session log を `docs/sessions/` に残し、関連テストを追加したうえで commit / push し、GitHub Actions の `Night Batch Self Hosted` を `workflow_dispatch` で実行する。

## 変更対象ファイル

| ファイル | 種別 | 予定内容 |
| --- | --- | --- |
| `docs/strategy/panic-reversal-regime-recovery.md` | 新規 | panic reversal の狙い、背景、現行ロジック、将来の拡張候補を保存 |
| `docs/sessions/session_20260427_0110.md` | 新規 | 今回の依頼内容、実施内容、結果、workflow 実行記録を保存 |
| `tests/repo-layout.test.js` | 更新候補 | `docs/strategy/` / `docs/sessions/` の stable file 追加に伴う layout expectation 調整が必要なら実施 |
| `tests/strategy-docs.test.js` または既存 docs 系 test | 更新候補 | 新しい strategy doc の存在・主要記述を確認する RED/GREEN テストを追加 |
| `docs/exec-plans/completed/strategy-panic-reversal-docs-and-workflow-run_20260427_0110.md` | 移動 | commit 時に active から completed へ移動 |

## 実装内容

1. `docs/strategy/` の既存文体に合わせて panic reversal 文書を追加する
2. 文書には以下を含める
   - 背景: なぜ通常の `RSP > 200SMA` フィルター外で例外的に買うのか
   - 現行機械ルール: `RSP < 200SMA`, `VIX > 30`, `SPY RSI14 < 30`, `SPY < 200SMA`, `ta.crossover(SPY RSI2, 10)`, `close > SMA25 && RSI14 >= 65`, stop loss なし
   - 目的: panic bottom 付近で長めに保有し、回復局面で手仕舞う発想
   - 今後の拡張候補: Fear & Greed / NAAIM / credit spread など外部 proxy の導入余地
3. `docs/sessions/` に今回セッションの実施ログを追加する
4. docs 追加に対するテストを RED -> GREEN -> REFACTOR で追加する
5. 変更レビュー後、plan を `completed/` に移して commit / push する
6. `gh workflow run .github/workflows/night-batch-self-hosted.yml --ref main -f config_path=config/night_batch/bundle-foreground-reuse-config.json` 相当で workflow を dispatch し、run ID / URL / 初期状態を記録する

## 影響範囲

- 主に documentation / tests / GitHub Actions dispatch 記録
- backtest ロジック自体の変更は今回スコープ外
- workflow 実行により GitHub Actions 上で self-hosted night batch が走る

## スコープ外

- panic reversal 戦略ロジックそのものの再設計
- 外部 sentiment / valuation データの ingestion 実装
- workflow 成果物の詳細分析

## テスト戦略

- **RED**: 新 doc / session log を期待する docs 系 test を追加し、未作成状態で失敗させる
- **GREEN**: 文書を追加して test を通す
- **REFACTOR**: 文書構成や test 記述を整理しつつ pass を維持する

## 検証コマンド

- `node --test tests/repo-layout.test.js`
- 必要に応じて docs 系の追加 / 既存 test を個別実行
- `gh workflow run .github/workflows/night-batch-self-hosted.yml --ref main -f config_path=config/night_batch/bundle-foreground-reuse-config.json`
- `gh run list --workflow night-batch-self-hosted.yml --limit 1`

## リスク

- `docs/strategy/` や `docs/sessions/` に stable file 制約がある場合、layout test の調整が必要になる
- self-hosted runner や TradingView readiness により workflow が queued / failed になる可能性がある
- 既存 worktree に他変更がある場合は、今回変更と混線しないよう差分確認が必要

## active plan 重複確認

- 既存 active plan `repo-structure-align-and-archive-rules_20260424_2015.md` は repo 構造整合タスクであり、今回の strategy doc / session log / workflow dispatch とは直接競合しない
