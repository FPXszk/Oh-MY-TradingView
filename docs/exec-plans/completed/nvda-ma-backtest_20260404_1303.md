# 実装計画: NVDA 固定 5/20 移動平均クロス戦略のバックテスト対応 (20260404_1303)

- ステータス: PLAN
- 競合確認: `docs/exec-plans/active/` に既存 active plan なし
- 方針: **初回は replay ではなく Pine strategy + Strategy Tester 読み取りを優先**する

## 背景

現状の `Oh-MY-TradingView` には、WSL/Linux から Windows 側 TradingView Desktop CDP へ接続する改善と、価格取得 (`price get`) が入っている。  
次タスクでは、**NVDA を対象に、5/20 移動平均クロス戦略を固定で適用し、TradingView 上でバックテスト結果を取得できる状態**を目指す。  
ユーザー要望として「バックテストに関しても tv CLI にあるならそれを使用して」があるため、**既存の CLI/MCP/core を最大限流用し、その上に最小限の backtest 導線を追加**する。

## スコープ

### スコープ内

1. NVDA 固定でチャートへ切り替える
2. 5/20 MA クロス戦略の Pine strategy を固定生成する
3. 既存 Pine compile loop でチャートへ適用する
4. Strategy Tester を開き、主要バックテスト指標を読み取る
5. tv CLI / MCP から最小 backtest 実行面を追加する
6. 単体テストと E2E テストを追加する

### スコープ外（初回）

- 任意シンボル対応
- 任意の短期/長期 MA パラメータ対応
- replay / bar replay 制御
- 複数戦略プリセット対応
- 期間変更 UI の自動操作
- Strategy Tester 全項目の完全取得
- 最適化 / パラメータスイープ

## 1) 変更 / 作成 / 更新ファイル一覧

### 新規作成

- `src/core/backtest.js`
  - NVDA 固定の 5/20 MA クロス Pine strategy source 生成
  - backtest 実行オーケストレーション
  - Strategy Tester 読み取り・結果正規化
- `src/tools/backtest.js`
  - MCP tool 登録
- `src/cli/commands/backtest.js`
  - CLI コマンド追加
- `tests/backtest.test.js`
  - source builder / parser / result normalizer の単体テスト
- `tests/e2e.backtest.test.js`
  - TradingView Desktop 実機 E2E

### 更新

- `src/core/index.js`
  - backtest API export 追加
- `src/server.js`
  - `registerBacktestTools()` 登録
- `src/cli/index.js`
  - backtest command 読み込み
- `package.json`
  - 既存 test script へ backtest test を追加
- `README.md`
  - backtest の使い方・制約・前提条件を追記

### 条件付きで更新

- `src/core/health.js`
  - Strategy Tester 利用可否の事前診断情報を強める場合のみ
- `tests/e2e.pine-loop.test.js`
  - 共通 helper 抽出が必要な場合のみ最小変更

## 2) 実装内容と影響範囲

### A. NVDA 固定 + 5/20 MA クロス固定の strategy source 生成

**主対象:** `src/core/backtest.js`

#### 実装内容

- Pine v6 の `strategy()` スクリプトをコード生成する
- 短期線 `ta.sma(close, 5)`、長期線 `ta.sma(close, 20)` を使用する
- `ta.crossover()` でエントリー、`ta.crossunder()` でクローズする最小構成にする
- 初回はユーザー入力を受けず、strategy 名・symbol・MA 値を固定にする

#### 影響範囲

- 新しい backtest フローの起点
- Pine source をユーザー手入力せずに安定生成できるようになる

### B. 既存機能流用による backtest 実行フロー

**主対象:** `src/core/backtest.js`

#### 実装内容

以下の既存フローを流用して一連実行する:

1. `healthCheck()` で接続・チャート利用可否を確認
2. `setActiveSymbol({ symbol: 'NVDA' })` で NVDA に切り替え
3. `getCurrentPrice({ symbol: 'NVDA' })` または切替後 `getCurrentPrice()` で symbol settle を確認
4. `setSource({ source })` で strategy を Pine Editor に投入
5. `smartCompile()` で compile / add to chart / error 検査を実行
6. compile 成功後に Strategy Tester を開く
7. Strategy Tester の summary から主要指標を取得する

#### 影響範囲

- 既存 `price` / `pine` / `health` を壊さずに上位ユースケースとして統合する
- TradingView UI/DOM の Strategy Tester 読み取り部分のみ新たに壊れやすいポイントが増える

### C. Strategy Tester の読み取り

**主対象:** `src/core/backtest.js`

#### 実装内容

- Strategy Tester を開く helper を追加する
- DOM あるいは TradingView 内部 UI 状態から、まず以下の主要 metrics を優先して読む
  - `net_profit`
  - `closed_trades` または `total_trades`
  - `percent_profitable`
  - `profit_factor`
  - `max_drawdown`（取得できる場合）
- 読み取れない場合は `success: false` ではなく、
  - strategy 適用は成功
  - tester 読み取りは unavailable
 という構造化結果にする案を採用する

#### 影響範囲

- TV Desktop の UI 変更に追従が必要
- 最初は summary 読み取りの最小成功に範囲を絞る

### D. CLI / MCP の公開面

**主対象:** `src/tools/backtest.js`, `src/cli/commands/backtest.js`, `src/server.js`, `src/cli/index.js`

#### 実装内容

- MCP には固定用途の semantic tool を追加する
  - 例: `tv_backtest_nvda_ma_5_20`
- CLI には固定用途のコマンドを追加する
  - 例: `tv backtest nvda-ma`
- 初回は汎用パラメータを増やさず、**再現性の高い固定タスク**として出す

#### 影響範囲

- CLI と MCP の操作面が拡張される
- 既存コマンドへの後方互換性影響は小さい

## 3) 既存 tv CLI / MCP / core の流用方針

### そのまま流用するもの

- `src/core/price.js`
  - `setActiveSymbol()`
  - `getCurrentPrice()`
  - `symbolMatches()`
- `src/core/pine.js`
  - `ensurePineEditorOpen()`
  - `setSource()`
  - `smartCompile()`
  - `getErrors()`
- `src/core/health.js`
  - `healthCheck()`
  - `discover()`
- `src/server.js`
  - semantic MCP tool の登録パターン
- `src/cli/commands/pine.js`
  - CLI subcommand 実装パターン
- `tests/e2e.price.test.js` / `tests/e2e.pine-loop.test.js`
  - CDP 可用性判定と E2E 構造

### 流用理由

- **symbol switch** は既に `price` 経由で実装済みで、NVDA 固定タスクにそのまま使える
- **price get** は symbol 切替後の settle 確認・健全性確認に使える
- **pine compile loop** は最も重要な既存資産で、strategy 適用の中心に据える
- **health/discover** は接続確認と Strategy Tester 調査の出発点になる
- **replay** はまだ repo にないため、初回では新規に触らず、参考設計としてのみ位置づける

### 初回で流用しない / 後回しにするもの

- replay / data 系の新規サブシステム
- strategy の汎用 preset registry
- timeframe 切替や期間指定 UI の自動制御

## 4) テスト方針（RED → GREEN → REFACTOR）

既存の test コマンドをそのまま活用する。

- `npm test`
- `npm run test:e2e`
- `npm run test:all`

### A. unit test

#### RED

`tests/backtest.test.js` を先に追加し、以下を失敗させる。

- NVDA 固定 5/20 MA クロス strategy source が期待どおり生成される
- Strategy Tester の抽出結果を正規化できる
- 指標が一部欠損しても破綻せず構造化結果に落とせる
- compile failure / tester unavailable の分岐を整理できる

#### GREEN

- `src/core/backtest.js` を最小実装し、source builder / parser / normalizer を通す

#### REFACTOR

- source builder
- tester opener
- metric parser
- result normalizer

を小関数へ分離する

### B. E2E test

#### RED

`tests/e2e.backtest.test.js` を追加し、以下を先に失敗させる。

- `runNvdaMaBacktest()` が `success: true` または `tester_available: false` を含む構造化結果を返す
- symbol が NVDA 系表記で返る
- compile failure 時にエラー情報が返る

#### GREEN

- 実機で通る最小 DOM / wait / retry を実装する
- `TV_CDP_HOST` / `TV_CDP_PORT` ベースの既存可用性チェックに合わせる

#### REFACTOR

- E2E 内の CDP availability helper や cleanup を共通化する

### C. カバレッジ方針

- source builder / parser / normalizer の unit test を厚くして **80% 以上** を目標にする
- UI 依存の Strategy Tester 読み取りは E2E で補完する

## 5) 検証コマンド

- `npm test`
- `npm run test:e2e`
- `npm run test:all`
- `node src/cli/index.js status`
- `node src/cli/index.js price get --symbol NVDA`
- 実装後: `node src/cli/index.js backtest nvda-ma`

## 6) リスク / 注意点

- TradingView Strategy Tester の DOM / 文言 / 配置は壊れやすい
- compile 成功から tester summary 反映までタイムラグがある可能性がある
- チャートの timeframe / session / extended hours 設定で成績が変わる
- `NVDA` と `NASDAQ:NVDA` の表記差があるため `symbolMatches()` ベースで扱う必要がある
- Strategy Tester を内部 API で取れない場合は DOM scraping fallback が必要になる

## 7) 実装前に固定しておく判断

- 初回は **NVDA 固定**
- 初回は **5/20 MA クロス固定**
- 初回は **Pine strategy + Strategy Tester 読み取り優先**
- 初回は **replay を実装しない**
- 初回は **CLI/MCP ともに fixed-use の semantic command/tool** を採用する

## 8) チェックボックス形式の実装ステップ

### Phase 0: 調査固定

- [ ] Strategy Tester を開く方法と summary 読み取り経路を確認する
- [ ] 取得対象 metrics を `net_profit`, `closed_trades`, `percent_profitable`, `profit_factor`, `max_drawdown` に固定する
- [ ] 初回は replay を行わない方針を確定する

### Phase 1: RED（unit）

- [ ] `tests/backtest.test.js` を追加する
- [ ] strategy source builder の失敗テストを書く
- [ ] tester result normalizer の失敗テストを書く
- [ ] unavailable / partial result の失敗テストを書く

### Phase 2: GREEN（core 最小実装）

- [ ] `src/core/backtest.js` を追加する
- [ ] NVDA 5/20 MA クロス source builder を実装する
- [ ] `healthCheck()` → `setActiveSymbol()` → `getCurrentPrice()` → `setSource()` → `smartCompile()` の実行フローを実装する
- [ ] compile error を構造化して返す

### Phase 3: Strategy Tester 読み取り

- [ ] Strategy Tester open helper を実装する
- [ ] summary metrics 読み取りを実装する
- [ ] partial / unavailable の fallback 返却形を実装する
- [ ] retry / wait を最小限で入れる

### Phase 4: CLI / MCP 公開

- [ ] `src/tools/backtest.js` を追加する
- [ ] `src/cli/commands/backtest.js` を追加する
- [ ] `src/server.js` に tool 登録を追加する
- [ ] `src/cli/index.js` に command 読み込みを追加する
- [ ] `src/core/index.js` に export を追加する

### Phase 5: RED/GREEN（E2E）

- [ ] `tests/e2e.backtest.test.js` を追加する
- [ ] CDP available 時のみ動く backtest E2E を実装する
- [ ] NVDA で compile → tester summary 取得まで確認する

### Phase 6: ドキュメント / 検証

- [ ] `package.json` の test script に新規テストを組み込む
- [ ] `README.md` に backtest 使用例と制約を追記する
- [ ] `npm test` を通す
- [ ] `npm run test:e2e` を通す
- [ ] `npm run test:all` で最終確認する
- [ ] 差分が fixed scope を超えていないことを確認する

## 完了条件

- `tv` CLI から NVDA 固定 5/20 MA クロス backtest を実行できる
- MCP からも同等の固定用途 tool を呼べる
- 既存 `price` / `pine` / `health` を再利用して strategy 適用できる
- Strategy Tester の主要 summary を構造化して返せる
- tester が読めない場合でも失敗理由と fallback 情報を返せる
- 既存テストと新規テストが通る
