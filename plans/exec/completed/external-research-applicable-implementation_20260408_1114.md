# 外部調査の高優先適用実装計画

## 問題提起

外部調査 `docs/research/tradingview-external-landscape-and-applicability_20260408_1105.md` により、本 repo に実用的に持ち込める候補が明確になった。  
一方、現状の repo は **TradingView Desktop + CDP** に強く、MCP 公開面と非 CDP データ面がまだ薄い。

今回の実装では、調査結果のうち **高優先かつ現行アーキテクチャに自然に載るもの** をまとめて実装する。

## スコープ

### 実装対象

1. preset backtest の MCP 公開
2. TradingView Desktop の起動機能（debug port 対応）
3. スクリーンショット取得機能
4. 制限付きの簡易ストリーミング機能
5. 非 CDP market intelligence 層
   - market snapshot
   - symbol quote
   - symbol fundamentals
   - financial news
   - practical screener
6. 既存 builder 互換な小規模 preset 拡張
7. 追加機能に対応する CLI / tests / docs 更新

### 対象外

1. webhook receiver
2. result viewer / web frontend
3. TradingView 非公式 protocol 直叩き
4. official Charting Library を使った desktop replacement
5. 外部 API key 必須の統合
6. 大型依存追加を前提にしたアーキテクチャ変更

## 対象ファイル

### 作成

- `docs/exec-plans/active/external-research-applicable-implementation_20260408_1114.md`
- `src/core/launch.js`
- `src/core/capture.js`
- `src/core/stream.js`
- `src/core/market-intel.js`
- `src/tools/launch.js`
- `src/tools/capture.js`
- `src/tools/stream.js`
- `src/tools/market-intel.js`
- `src/cli/commands/launch.js`
- `src/cli/commands/capture.js`
- `src/cli/commands/stream.js`
- `src/cli/commands/market-intel.js`
- `tests/launch.test.js`
- `tests/capture.test.js`
- `tests/stream.test.js`
- `tests/market-intel.test.js`

### 更新

- `src/server.js`
- `src/core/index.js`
- `src/tools/backtest.js`
- `src/cli/index.js`
- `src/cli/commands/backtest.js`（必要な場合のみ）
- `src/connection.js`
- `config/backtest/strategy-presets.json`
- `tests/backtest.test.js`
- `tests/preset-validation.test.js`
- `tests/e2e.backtest.test.js`（必要な場合のみ）
- `README.md`
- `docs/DOCUMENTATION_SYSTEM.md`（必要な場合のみ）
- `docs/references/design-ref-llms.md`（今回の実装中に新たな外部資料を参照した場合のみ）
- `docs/working-memory/session-logs/<session-log-name>_YYYYMMDD_HHMM.md`

### 削除

- なし

## 実装方針

- **CDP 本線は維持**し、その周辺に実用的な操作面を足す
- 非 CDP 機能は **Node built-in `fetch`** を優先し、新規依存は避ける
- stream は無限常駐ではなく、**interval polling + 回数制限** の短時間サンプリングとして実装する
- preset 拡張は **既存 builder 互換のみ** とし、新しい strategy builder は今回追加しない
- CLI / MCP の重複ロジックは `src/core/` に寄せて共通化する

## 実装ステップ

- [ ] **P0** preset backtest の MCP tool を追加する
- [ ] **P0** TradingView Desktop 起動用の core / CLI / MCP 入口を追加する
- [ ] **P0** スクリーンショット取得用の core / CLI / MCP 入口を追加する
- [ ] **P1** 制限付き stream 機能を追加する
- [ ] **P1** market intelligence core を追加し、quote / fundamentals / snapshot / news / screener を実装する
- [ ] **P1** builder 互換 preset を小規模追加する
- [ ] **P1** README と関連 docs を更新する
- [ ] **P1** session log を残す
- [ ] **P1** 既存テストと追加テストを通して、最後に commit / push する

## TDD 戦略

### RED

- preset MCP 公開、launch、capture、stream、market intelligence、preset 拡張の順に失敗テストを先に追加する
- CDP や外部 fetch はスタブ化し、失敗ケースから固定する

### GREEN

- 各テストを通す最小実装を `core -> tools -> cli/server` の順で追加する
- 既存 public interface を壊さず、局所的に機能を足す

### REFACTOR

- 入力バリデーション、エラー整形、共通レスポンス生成の重複を整理する
- `src/core/` の責務分割が破綻しないように必要最小限の共通化を行う

### カバレッジ方針

- 変更対象の主要分岐で 80% 以上を目標に確認する
- utility は unit test、CLI / MCP 入口は統合寄りテストで補う

## 検証コマンド

- `npm test`
- `npm run test:e2e`
- `npm run test:all`
- `git --no-pager diff --check`

## リスク / 注意点

- launch は OS 差異と TradingView Desktop の配置差に影響されやすい
- capture は対象 window / page の特定方法が不安定だと壊れやすい
- stream は責務を広げすぎると保守不能になるため、短時間サンプリングに限定する
- market intelligence は外部レスポンス変動に影響されるため normalize と明示的エラーが重要
- preset 拡張は builder 非互換 preset を混入させないよう制約を厳格に保つ

## 期待成果物

- preset backtest MCP tool
- TradingView Desktop launch 機能
- screenshot 機能
- short-lived stream 機能
- non-CDP market intelligence tools
- builder 互換 preset 追加
- 更新済み tests / docs / session log
