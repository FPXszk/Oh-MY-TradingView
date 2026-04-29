# run72 首位＋baseline 3本 My Scripts 登録計画

作成日時: 2026-04-29 11:14 JST

## 目的

run72 の総合首位 1 本と比較用 baseline 2 本、合計 3 本を既存の TradingView My Scripts 保存導線で実際に登録する。

対象 preset:

1. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma15-rsi60`
2. `donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50`
3. `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`

## 事前確認

- 既存保存導線: `scripts/backtest/save-selected-strategies-to-my-scripts.mjs`
- 実保存ロジック: `src/core/my-scripts.js`
- 既存検証: `tests/my-scripts.test.js`
- 3 本とも `config/backtest/strategy-presets.json` と `config/backtest/strategy-catalog.json` に登録済み
- 既存の運用実績として同 CLI を使った My Scripts 保存計画・実行履歴が `docs/exec-plans/completed/` に複数ある

## 変更・作成・移動するファイル

### 作成

- `docs/exec-plans/active/register-run72-top1-and-baselines-to-my-scripts_20260429_1114.md`

### 変更予定なし

- `scripts/backtest/save-selected-strategies-to-my-scripts.mjs`
- `src/core/my-scripts.js`
- `config/backtest/strategy-presets.json`
- `config/backtest/strategy-catalog.json`

### 完了時に移動

- `docs/exec-plans/active/register-run72-top1-and-baselines-to-my-scripts_20260429_1114.md`
- 移動先: `docs/exec-plans/completed/register-run72-top1-and-baselines-to-my-scripts_20260429_1114.md`

## 実装内容と影響範囲

- 既存 CLI で対象 3 本を TradingView Desktop の My Scripts に保存する
- 実行ログから 3 本すべてが解決・保存完了したことを確認する
- コード変更は行わず、作業記録として plan のみ更新する

## スコープ

### 含む

- preset 解決可否の最終確認
- TradingView Desktop 接続での My Scripts 保存実行
- 保存成功ログの確認
- plan 完了処理、commit、push

### 含まない

- preset の内容変更
- 既存 My Scripts の整理や削除
- Pine source の修正
- 保存後の UI 一覧スクリーンショット取得

## テスト戦略

- コード変更がないため自動テストは追加しない
- 保存 CLI 実行結果で 3 本の resolved / saved を確認する
- 必要なら既存 `tests/my-scripts.test.js` の責務を参照し、導線の妥当性だけ確認する

## 検証コマンド候補

- `node scripts/backtest/save-selected-strategies-to-my-scripts.mjs donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma15-rsi60 donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50 donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
- `git status --short`

## リスク / 注意点

- TradingView Desktop 側の UI 状態や接続先が変わっていると、CLI 自体は動いても保存ステップだけ失敗する可能性がある
- 同名 script が既に存在する場合、上書きまたは重複の挙動は TradingView 側に依存する
- この作業は実機接続前提なので、CDP 接続不良があればその場で切り分けが必要

## 実装ステップ

- [x] 既存 My Scripts 保存導線と対象 3 preset の解決可否を確認する
- [x] 既存 CLI で対象 3 本を TradingView My Scripts に保存する
- [x] 実行ログで 3 本の保存成功を確認する
- [x] plan を `docs/exec-plans/completed/` に移動する
- [x] Conventional Commit で commit し、`main` に push する

## 完了条件

- 指定 3 戦略が既存 CLI 導線から TradingView My Scripts に保存されている
- plan が completed に移動し、結果が `main` に push されている
