# Exec Plan: strategy-live-retired-diff tranche 3

## 概要
Live/Retired 戦略のカタログ統合とDiff機能の実装。
strategy-catalog.json を single source of truth として新設し、diff機能を追加する。

## 変更ファイル一覧

### 新規作成
- [x] `config/backtest/strategy-catalog.json` — 131戦略のカタログ (live 15 + retired 116)
- [x] `src/core/strategy-catalog.js` — カタログ読み込み・フィルタ・検証
- [x] `src/core/strategy-live-retired-diff.js` — diff計算・レポート生成
- [x] `tests/strategy-catalog.test.js` — カタログ検証テスト
- [x] `tests/strategy-live-retired-diff.test.js` — diff機能テスト

### 修正
- [x] `src/core/backtest.js` — loadPreset() にカタログ優先ロジック追加
- [x] `scripts/backtest/generate-rich-report.mjs` — --diff-out オプション追加
- [x] `python/night_batch.py` — latest summary に Live/Retired diff セクション追加
- [x] `docs/bad-strategy/README.md` — カタログが source of truth である旨を追加
- [x] `docs/research/latest/main-backtest-latest-summary.md` — diff セクション追加
- [x] `tests/preset-validation.test.js` — overlap check 追加
- [x] `tests/backtest.test.js` — catalog loadPreset テスト追加
- [x] `tests/night-batch.test.js` — diff セクション存在チェック追加
- [x] `tests/repo-layout.test.js` — catalog 存在チェック追加
- [x] `package.json` — 新テスト追加

## 実装ステップ

1. catalog.json 生成スクリプト作成・実行・削除
2. strategy-catalog.js 実装
3. strategy-live-retired-diff.js 実装
4. テスト作成 (RED)
5. backtest.js, generate-rich-report.mjs, night_batch.py 修正
6. ドキュメント更新
7. package.json テストスクリプト更新
8. 全テスト実行 (GREEN)

## リスク
- catalog.json が大きいがパフォーマンスは問題ない想定
- 既存テスト 863 件が壊れないこと必須
