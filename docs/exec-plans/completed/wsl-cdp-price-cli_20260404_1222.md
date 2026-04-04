# 実装計画: WSL/Linux からの TradingView Desktop CDP 接続改善と価格取得 CLI 追加

- 作成日時: 2026-04-04 12:22
- ステータス: PLAN
- 競合確認: `docs/exec-plans/active/` に既存 active plan なし

## 背景

現状の実装は TradingView Desktop の CDP 接続先を実質 `localhost:9222` 前提で扱っており、WSL/Linux から Windows 側で起動している TradingView Desktop の CDP にそのまま届かない。  
今回の計画では、既存の `health` / `pine` フローを壊さずに接続先を柔軟化し、加えて「現在価格を取得する tool/CLI」を追加する。  
銘柄切替については、価格取得要件を満たすために本当に必要な場合のみ最小追加とする。

## スコープ

### スコープ内

1. WSL/Linux から Windows 側 TradingView Desktop の CDP (`9222`) に到達できる接続設計へ改善する
2. 現在価格を取得する MCP tool / CLI を追加する
3. 必要な場合のみ銘柄切替 MCP tool / CLI を追加する
4. 既存テスト更新と README 更新を行う

### スコープ外

- TradingView Desktop の起動自動化
- Windows firewall / portproxy / OS 設定の自動変更
- Pine 関連機能の拡張
- 価格取得と無関係な chart 操作の追加

## 1) 変更 / 作成 / 更新候補ファイル一覧

### 更新候補

- `package.json`
- `src/server.js`
- `src/connection.js`
- `src/core/index.js`
- `src/core/health.js`
- `src/tools/health.js`
- `src/cli/index.js`
- `README.md`
- `tests/connection.test.js`
- `tests/e2e.pine-loop.test.js`

### 新規作成候補

- `src/core/price.js`
- `src/tools/price.js`
- `src/cli/commands/price.js`
- `tests/price.test.js`
- `tests/e2e.price.test.js`

### 条件付き追加候補

- `src/core/symbol.js`
- `src/tools/symbol.js`
- `src/cli/commands/symbol.js`
- `tests/symbol.test.js`
- `tests/e2e.symbol.test.js`

## 2) 実装内容と影響範囲

### A. CDP 接続の WSL/Linux 対応

**主対象:** `src/connection.js`

現状は `TV_CDP_HOST` / `TV_CDP_PORT` を読んでいるものの、README・E2E・エラーヒントが `localhost:9222` 固定思想になっている。  
ここを「localhost 固定」から「明示 host を優先できる接続フロー」へ整理する。

#### 実装内容

- `src/connection.js`
  - 接続先解決を定数直書きではなく関数化する
  - `TV_CDP_HOST` / `TV_CDP_PORT` を正式な接続設定として扱う
  - `/json/list` 探索失敗時に、試行先 endpoint と設定ヒントを含むエラーへ改善する
  - 将来の複数 host 候補探索に備え、host/port 解決責務を分離しやすい構造にする
- `src/core/health.js`
  - 必要に応じて `healthCheck()` 返却値へ接続先情報を含め、診断しやすくする
- `src/tools/health.js`
  - WSL/Windows 前提のヒント文言へ更新する
- `tests/e2e.pine-loop.test.js`
  - `localhost:9222` 固定をやめ、環境変数ベースに寄せる
- `README.md`
  - WSL から Windows 側 CDP に接続する手順・注意点を追記する

#### 影響範囲

- 既存 `tv status`, `tv discover`, `pine_*` の接続挙動
- E2E テストの接続先指定方法
- ドキュメントの前提条件

### B. 現在価格取得 tool/CLI の追加

**主対象:** `src/core/price.js`, `src/tools/price.js`, `src/cli/commands/price.js`

既存の `evaluate()`、`window.TradingViewApi._activeChartWidgetWV.value()` アクセス、polling パターンを流用して、現在アクティブなチャートの価格取得機能を追加する。

#### 実装内容

- `src/core/price.js`
  - アクティブチャート取得 helper を内部に持つ
  - 価格取得を chart API 優先で試みる
  - 必要時のみ DOM fallback を追加する
  - 返却形式を JSON 向けに固定する  
    例: `success`, `symbol`, `price`, `source`, `retrieved_at`
- `src/tools/price.js`
  - MCP tool を追加する
- `src/server.js`
  - `registerPriceTools()` を追加登録する
- `src/cli/commands/price.js`
  - `tv price get` もしくは同等の明快なコマンドを追加する
- `src/cli/index.js`
  - 新 command 読み込みを追加する
- `src/core/index.js`
  - 新 core export が必要なら公開面を揃える
- `package.json`
  - 新 unit/e2e テストファイルを既存 test script に組み込む

#### 影響範囲

- CLI の新規ユースケース追加
- MCP tool 拡張
- README の利用例追加

### C. 銘柄切替の条件付き追加

**主対象:** `src/core/symbol.js` など（必要時のみ）

まずは「現在開いているチャートの現在価格」を取得できれば要件達成とみなし、銘柄切替は後続分岐にする。

#### 追加条件

- 価格取得要件が「任意銘柄の価格取得」を含む
- 既存 chart API で安定して symbol 切替できる見込みがある

#### 実装内容

- chart API 経由で symbol 切替を試す
- 切替後、`healthCheck()` または同等の chart snapshot で反映を確認する
- UI 状態破壊を最小化するため、DOM ベタ操作は最後の手段とする

#### 影響範囲

- ユーザーのアクティブチャート状態
- E2E テストの不安定化リスク

## 3) テスト方針（RED / GREEN / REFACTOR、既存 test コマンド活用）

既存のテストコマンドをそのまま使う。

- `npm test`
- `npm run test:e2e`
- `npm run test:all`

### A. connection 改修

#### RED

- `tests/connection.test.js` に以下を追加
  - `TV_CDP_HOST` / `TV_CDP_PORT` の優先ロジック
  - 接続失敗時メッセージに endpoint / hint が含まれること
  - localhost 固定前提に依存しない接続設定ロジック

#### GREEN

- `src/connection.js` を最小修正し、既存 `pickTarget` / `safeString` / `requireFinite` テストを壊さず通す

#### REFACTOR

- host/port 解決、target discovery、retry を責務分離する

### B. price 機能

#### RED

- `tests/price.test.js` を新規追加
  - chart API で価格取得できるケース
  - chart API 失敗時の fallback 判定
  - 返却 JSON の契約
  - 価格が数値で返せない場合のエラー整形

#### GREEN

- `src/core/price.js` と tool/CLI を最小実装して通す

#### REFACTOR

- 取得ロジックと出力整形を分離
- polling / fallback 判定を小関数化

### C. E2E

#### RED

- `tests/e2e.pine-loop.test.js` を env ベースに修正
- `tests/e2e.price.test.js` を追加
  - 接続確認
  - 現在価格取得
  - WSL 想定の `TV_CDP_HOST` / `TV_CDP_PORT` でも skip/実行判定できること

#### GREEN

- Windows 側 TradingView Desktop 起動環境で通るように実装する

#### REFACTOR

- 接続可否チェック helper を共通化する

### D. symbol 機能（必要時のみ）

#### RED

- `tests/symbol.test.js` / `tests/e2e.symbol.test.js` を追加

#### GREEN

- 最小切替実装で通す

#### REFACTOR

- `price` と `symbol` の責務境界を明確化する

## 4) チェックボックス形式の段階的実装ステップ

### Phase 0: 事前固定

- [ ] 本 plan を `docs/exec-plans/active/` に配置する
- [ ] 実装スコープを「WSL/CDP 接続改善 + 現在価格取得」に固定する
- [ ] 銘柄切替は条件付き実装であることを明示する

### Phase 1: 接続改善

- [ ] `tests/connection.test.js` に host/port 可変前提の RED テストを追加する
- [ ] `src/connection.js` の接続先解決を関数化する
- [ ] target discovery 失敗時のエラーメッセージを改善する
- [ ] 既存 `health` / `pine` が新接続フローでも壊れないことを確認する

### Phase 2: 価格取得コア

- [ ] `tests/price.test.js` を追加する
- [ ] `src/core/price.js` を追加する
- [ ] chart API 優先で価格取得を実装する
- [ ] 必要なら DOM fallback を追加する
- [ ] 返却 JSON 契約を確定する

### Phase 3: tool / CLI 公開

- [ ] `src/tools/price.js` を追加する
- [ ] `src/cli/commands/price.js` を追加する
- [ ] `src/server.js` に tool 登録を追加する
- [ ] `src/cli/index.js` に command 読み込みを追加する
- [ ] CLI ヘルプと出力整合性を確認する

### Phase 4: 銘柄切替の要否判定

- [ ] 現在チャート価格取得で要件充足か確認する
- [ ] 充足する場合は symbol 機能を追加しない
- [ ] 充足しない場合のみ symbol 実装へ進む

### Phase 5: 条件付き symbol 実装

- [ ] `tests/symbol.test.js` を追加する
- [ ] `src/core/symbol.js` を追加する
- [ ] `src/tools/symbol.js` / `src/cli/commands/symbol.js` を追加する
- [ ] 反映確認付きで最小実装する

### Phase 6: E2E / ドキュメント

- [ ] `tests/e2e.pine-loop.test.js` の localhost 固定を解消する
- [ ] `tests/e2e.price.test.js` を追加する
- [ ] `package.json` の test script に新規テストを組み込む
- [ ] `README.md` に WSL 接続方法、環境変数、price CLI 使用例を追記する
- [ ] symbol 実装時のみ、その使い方と副作用を README に追記する

### Phase 7: 検証

- [ ] `npm test` を実行する
- [ ] Windows 側 TradingView Desktop 起動環境で `npm run test:e2e` を実行する
- [ ] 必要に応じて `npm run test:all` で最終確認する
- [ ] 変更差分を見直し、スコープ外変更がないことを確認する

## 5) リスク / 確認事項

### リスク

- WSL2 のネットワーク形態差により、Windows 側 host 指定方法が環境で異なる可能性がある
- TradingView 内部 chart API は安定保証がなく、価格取得 / symbol 切替が将来壊れる可能性がある
- DOM fallback は locale・UI 更新・DOM 構造変更に弱い
- E2E は TradingView Desktop 起動状態に依存し、再現性が下がりやすい
- symbol 切替はユーザーの現在表示状態を変える副作用がある

### 実装前に確認したい事項

- 価格取得対象は「現在表示中の銘柄」で十分か
- 任意銘柄指定が必要なら `price --symbol` に寄せるか、`symbol set` を分離するか
- 接続先は env 指定のみで十分か、それとも WSL 用の自動候補探索まで含めるか
- `healthCheck()` に接続先情報を含めるか

## 6) 既存ファイルとの具体的な対応関係

- `src/connection.js`
  - WSL/CDP 接続改善の本丸
  - `findChartTarget()` と `connect()` の責務整理対象
- `src/core/health.js`
  - 既存 chart snapshot を返すため、接続確認・symbol 切替確認の再利用先
- `src/server.js`
  - MCP tool を公開する登録ポイント
- `src/core/pine.js`
  - `evaluate()` 利用、wait/polling、page 上 JS 実行の既存パターン参照元
- `src/tools/health.js`
  - WSL 前提のエラーヒント更新対象
- `src/tools/pine.js`
  - 新規 tool 実装の書式参照元
- `src/cli/commands/health.js`
  - status/discover の最小 command 構成参照元
- `src/cli/commands/pine.js`
  - subcommand 実装パターンの参照元
- `package.json`
  - unit/e2e テスト対象を増やす script 更新対象
- `tests/connection.test.js`
  - connection 改修の単体テスト追加先
- `tests/e2e.pine-loop.test.js`
  - localhost 固定解消と env 化の対象
- `README.md`
  - localhost only 前提の記述更新対象

## 完了条件

- `TV_CDP_HOST` / `TV_CDP_PORT` を使い、WSL/Linux から Windows 側 TradingView Desktop に接続できる
- 現在価格取得 tool/CLI が追加される
- 既存 `health` / `pine` が壊れていない
- E2E が localhost 固定ではなく設定可能 endpoint 前提で動く
- symbol 切替は必要時のみ追加され、不要なら追加しない判断が明記されている
