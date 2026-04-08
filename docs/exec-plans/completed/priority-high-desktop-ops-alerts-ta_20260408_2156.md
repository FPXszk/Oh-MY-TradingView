# priority-high-desktop-ops-alerts-ta_20260408_2156

## Problem / approach

既存の Desktop/CDP 基盤・`market_*` 系・CLI/MCP 配線を前提に、priority-high の未実装 3 領域を **1 回で完了できる最小有用スコープ** に切って実装する。対象は ① watchlist / pane / tab / layout 操作、② alerts 管理、③ multi-symbol TA summary / ranking。実装方針は、UI/CDP 操作を `src/core` に閉じ込め、MCP 公開を `src/tools`、CLI 導線を `src/cli/commands` に追加する。watchlist/pane/tab/layout は「一覧取得＋安全な基本操作」に限定し、alerts は **ローカル TradingView Desktop 上の価格アラートの list/create/delete** に限定、multi-symbol TA は既存 `market-intel` を拡張して **複数銘柄の要約と順位付け** を返す。

今回の具体スコープ:
- workspace 操作: watchlist symbols 一覧 / add / remove、pane 一覧 / focus、tab 一覧 / switch、layout 一覧 / apply
- alerts: alert 一覧、price alert 作成、alert 削除
- market TA: 複数銘柄について price change・RSI(14)・SMA20/50 乖離を要約し、指定指標で ranking

## Files to modify/create

### Modify
- `src/server.js`（新規 MCP tool 登録）
- `src/cli/index.js`（新規 CLI command 読み込み）
- `src/core/index.js`（新規 core export）
- `src/core/market-intel.js`（TA summary / ranking ロジック追加）
- `src/tools/market-intel.js`（`market_ta_summary` / `market_ta_rank` 追加）
- `src/cli/commands/market-intel.js`（`tv market ta-summary` / `tv market ta-rank` 追加）
- `package.json`（新規 test / e2e test を `test` / `test:e2e` / `test:all` に追加）
- `README.md`（新規 tool/CLI、制約、使用例、セッションログ導線の追記）

### Create
- `src/core/workspace.js`（watchlist/pane/tab/layout の CDP 操作共通化）
- `src/tools/workspace.js`
- `src/cli/commands/workspace.js`
- `src/core/alerts.js`（alert list/create/delete）
- `src/tools/alerts.js`
- `src/cli/commands/alerts.js`
- `tests/workspace.test.js`
- `tests/alerts.test.js`
- `tests/market-intel.test.js` への追記、必要なら `tests/e2e.workspace.test.js` / `tests/e2e.alerts.test.js` を新規追加
- `docs/working-memory/session-logs/priority-high-desktop-ops-alerts-ta_20260408_2156.md`（実装完了後の session log）

## Out of scope

- webhook receiver / result viewer
- alert の webhook 配信先、通知チャネル、pause/resume/edit、履歴 export
- watchlist の rename / reorder / create / delete
- pane の drag resize、複数 window 制御、複雑な tab 並べ替え
- layout の保存・共有・テンプレート管理
- TA 指標の無制限拡張（今回は RSI14・SMA20/50・price change に限定）
- 新規外部データ provider の追加

## Risks / watchpoints

- TradingView Desktop の UI 文言・DOM 構造差分で selector が壊れやすい。text/role ベースの探索と fallback selector を用意し、失敗時は try/catch で操作名つきエラーを返す。
- layout apply や alert create/delete はユーザー状態を書き換える。E2E は一時オブジェクト名を使い、必ず cleanup する。
- pane/tab/layout は現在の workspace 状態に依存するため、「見つからない場合は no-op 成功にしない」方針で明確に失敗させる。
- multi-symbol TA は Yahoo 側取得失敗や遅延の影響を受けるため、銘柄数上限（例: 20）、timeout、部分失敗を含む戻り値設計を維持する。

## Validation

- `npm test`
- `npm run test:e2e`
- `npm run test:all`
- `git --no-pager diff --check`

## RED / GREEN / REFACTOR notes

- **RED**
  - `tests/workspace.test.js` に watchlist/pane/tab/layout API の契約テストを追加し、未実装失敗を先に作る
  - `tests/alerts.test.js` に list/create/delete の入出力・cleanup 前提の失敗テストを追加する
  - `tests/market-intel.test.js` に TA summary / ranking の計算・sort・部分失敗 handling の失敗テストを追加する
  - 重要フローとして workspace / alerts の smoke E2E を追加し、実機で失敗する状態から始める
- **GREEN**
  - 各機能を最短経路で実装し、まず unit/integration を通す
  - その後 E2E の待機条件・cleanup を最小限調整して通す
- **REFACTOR**
  - selector 探索、待機、エラー整形、symbol 正規化、TA 計算 helper を共通化し、1 ファイル肥大化を避ける
  - README と session log を最後に更新する

## Implementation steps

- [ ] 既存 `src/connection.js`・`src/core/*.js`・`src/tools/*.js` を確認し、CDP evaluate helper と market data 取得再利用点を確定する
- [ ] `src/core/workspace.js` の公開関数を確定する（`listWatchlistSymbols`, `addWatchlistSymbol`, `removeWatchlistSymbol`, `listPanes`, `focusPane`, `listTabs`, `switchTab`, `listLayouts`, `applyLayout`）
- [ ] `src/core/alerts.js` の公開関数を確定する（`listAlerts`, `createPriceAlert`, `deleteAlert`）
- [ ] `src/core/market-intel.js` に追加する TA API を確定する（`getMultiSymbolTaSummary`, `rankSymbolsByTa`、RSI14 / SMA20 / SMA50 / price change）
- [ ] RED: `tests/workspace.test.js`、`tests/alerts.test.js`、`tests/market-intel.test.js` の追加/更新と、必要な E2E test ファイルを作成する
- [ ] `src/core/workspace.js` を実装し、watchlist/pane/tab/layout の一覧取得と基本操作を CDP 経由で追加する
- [ ] `src/core/alerts.js` を実装し、price alert の list/create/delete を追加する
- [ ] `src/core/market-intel.js` を拡張し、複数銘柄 TA summary と ranking を追加する
- [ ] `src/tools/workspace.js`・`src/tools/alerts.js` を追加し、MCP schema・入力制約・戻り値整形を実装する
- [ ] `src/tools/market-intel.js` に `market_ta_summary` / `market_ta_rank` を追加する
- [ ] `src/server.js` に新規 tool 登録を追加する
- [ ] `src/cli/commands/workspace.js`・`src/cli/commands/alerts.js` を追加し、`src/cli/commands/market-intel.js` を拡張する
- [ ] `src/cli/index.js` と `src/core/index.js` を更新し、新規 command / export を接続する
- [ ] `package.json` の test script を更新し、新規 unit/E2E test を既存検証コマンドに含める
- [ ] `npm test` → `npm run test:e2e` → `npm run test:all` → `git --no-pager diff --check` の順で検証する
- [ ] `README.md` に新機能の使い方、ローカル限定の alert 制約、workspace 操作の対象範囲、TA ranking の入力例を追記する
- [ ] 実装完了後、`docs/working-memory/session-logs/priority-high-desktop-ops-alerts-ta_20260408_2156.md` に実施内容・検証結果・既知制約を残す
