# TradingView CDP Pine Loop MVP Plan (20260404_0228)

## 問題

`Oh-MY-TradingView` にはまだ実装がほぼなく、TradingView Desktop を Copilot CLI から安全かつ安定して扱うための MCP 基盤が存在しない。  
今回の初期目標は **localhost:9222 の CDP 接続を確認できること** と、**Pine Script の注入 → コンパイル → エラー取得 → 再試行のループを作れる最小 MVP** を作ること。

## 調査結果サマリ

- 最重要の先行例は `tradesdontlie/tradingview-mcp`
  - `@modelcontextprotocol/sdk` + `chrome-remote-interface`
  - `/json/list` による target discovery
  - `Runtime/Page/DOM` を有効化して TradingView Desktop に接続
  - 低レベル CDP をそのまま見せず、`tv_health_check` / `pine_*` のような semantic tool に包んでいる
- 近い周辺事例として `electron-mcp-server`、`cdp-tools-mcp`、`chrome-devtools-mcp` がある
  - 共通して **stdio MCP + localhost CDP + target discovery + evaluate の分離** が採用されている
- 本 repo への適用方針としては、いきなり 78 ツールを目指さず、以下の順が最も堅い
  1. 接続層
  2. capability / target discovery
  3. Pine ループ最小セット

## 提案アプローチ

- 実装言語は **Node.js ESM JavaScript**
  - 先行例との距離が近く、初期段階で build step を増やさずに CDP の不安定点へ集中できる
  - 型の複雑化より、まず接続・発見・Pine 操作の安定化を優先する
- 構成は **connection / core / tools / cli / tests** に分離する
- Copilot CLI 前提の README / 利用例を整備する
- 安全策として以下を最初から入れる
  - target の allowlist 選択
  - `evaluate` へ渡す入力の sanitize
  - local-only / Terms / 非公式である旨の明記

## 変更対象ファイル

### 作成

- `package.json`
- `src/server.js`
- `src/connection.js`
- `src/core/health.js`
- `src/core/pine.js`
- `src/tools/_format.js`
- `src/tools/health.js`
- `src/tools/pine.js`
- `src/cli/index.js`
- `src/cli/router.js`
- `src/cli/commands/health.js`
- `src/cli/commands/pine.js`
- `tests/connection.test.js`
- `tests/pine.analyze.test.js`
- `tests/e2e.pine-loop.test.js`

### 更新

- `README.md`

### 削除

- なし

## 実装内容と影響範囲

### 1. 接続層

- `localhost:9222/json/list` から TradingView target を探索
- `tradingview.com/chart` を優先し、見つからない場合は TradingView を含む page target を候補にする
- CDP 接続と `Runtime/Page/DOM` の初期化を担当
- `safeString`, `requireFinite` 相当の入力防御を持つ

### 2. Health / discovery

- `tv_health_check`
  - CDP 接続可否
  - target 情報
  - 最低限の chart state 取得
- `tv_discover`
  - 利用可能な TradingView API / UI 要素の存在確認

### 3. Pine ループ MVP

- `pine_get_source`
- `pine_set_source`
- `pine_compile`
- `pine_get_errors`
- `pine_smart_compile`

`pine_smart_compile` は、Pine Editor を開く → source 注入 → コンパイル → エラー収集、までを一往復で実行する。  
自動の無限再試行はまだ入れず、Copilot CLI 側から安全にループさせやすいレスポンス形にする。

### 4. CLI 同梱

- MCP だけでなく簡易 CLI (`tv`) も同梱する
- 接続確認や Pine の最小操作を MCP 外からも再現可能にする

### 5. ドキュメント

- Copilot CLI 向け設定例を README に追加
- Claude Code ではなく Copilot CLI を主対象として記述する
- ローカル限定・非公式・利用規約順守を明記する

## スコープ外

- 78 ツール相当の全面実装
- chart navigation の網羅
- drawing / alert / replay / screenshot の実装
- OCR / accessibility fallback
- TradingView Desktop 自動起動

## テスト戦略

### RED

- `tests/connection.test.js`
  - target discovery の優先順位
  - sanitize / number validation
- `tests/pine.analyze.test.js`
  - オフラインで検証できる Pine 静的チェックの最小ケース
- `tests/e2e.pine-loop.test.js`
  - `tv_health_check` が失敗せず返る
  - `pine_set_source` → `pine_compile` / `pine_smart_compile` → `pine_get_errors` が通る

### GREEN

- 最小実装でテストを通す

### REFACTOR

- selector / probe / response shaping を小さな関数へ整理する
- UI 操作のハードコードを capability probe に寄せる

## 検証コマンド

- `npm install`
- `npm test`
- `npm run test:e2e`

## リスクと注意点

- TradingView Desktop の内部 DOM / React fiber / 内部 API は壊れやすい
- 複数 target があると誤接続の可能性がある
- Pine Editor が開いていない、または UI 変更で selector が外れる可能性がある
- データ抽出や自動操作は TradingView の利用規約に抵触しうるため、README の注意書きが必須

## 既存計画との重複確認

- `docs/exec-plans/active/` に重複計画はなし

## 実装ステップ

- [ ] Node.js ESM ベースの最小パッケージ構成を作る
- [ ] CDP 接続層と target discovery をテスト駆動で実装する
- [ ] `tv_health_check` / `tv_discover` を実装する
- [ ] Pine Editor 操作と `pine_*` 最小ツール群を実装する
- [ ] MCP と CLI の両方から同じ core を使う形に整理する
- [ ] README を Copilot CLI 前提で更新する
- [ ] `npm test` と `npm run test:e2e` を通す
