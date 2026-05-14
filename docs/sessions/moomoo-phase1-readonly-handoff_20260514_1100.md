# Session handoff: moomoo Phase 1 read-only integration

## セッションのゴール

- moomoo OpenAPI の Phase 1 read-only 統合を既存 MCP サーバーへ追加する
- OpenD へ実機接続し、Phase 1 ツール群が実際に使えるか確認する
- 次セッションでそのまま Phase 2 以降へ進めるよう、実装内容と検証結果を `docs/` に残す

## 今回やったこと

### 実装

- 既存 `src/server.js` に `registerMoomooTools(server)` を追加
- read-only MCP tools を新設
  - `moomoo_health_check`
  - `moomoo_snapshot`
  - `moomoo_kline_history`
  - `moomoo_stock_filter`
  - `moomoo_plate_list`
  - `moomoo_plate_stocks`
- Node 側 wrapper を追加
  - `src/core/moomoo.js`
  - `src/tools/moomoo.js`
- Python 側 adapter を追加
  - `python/moomoo_adapter.py`
- unit test を追加
  - `tests/moomoo.test.js`
- `package.json` の `test:unit` に `tests/moomoo.test.js` を追加

### 実装方針

- 独立 Python MCP server ではなく、**既存 Node MCP server から Python adapter を `execFile` で呼ぶ**形を採用
- Python 側は OpenD との接続と moomoo API 呼び出しだけを担当
- Node 側は MCP schema、入力 validation、adapter 実行、JSON 整形、エラーメッセージを担当
- Phase 1 の `get_stock_filter()` は汎用 DSL まで広げず、**価格・時価総額・PER・ページング**の最小構成に留めた

## 実機確認結果

### 接続前提

- OpenD は **すでに起動済み**
- WSL からの接続先は既存調査どおり:
  - `MOOMOO_HOST=172.31.144.1`
  - `MOOMOO_PORT=11112`
- これは Windows 側 `127.0.0.1:11111` bind に対する portproxy 経路

### 実機で成功した呼び出し

#### `moomoo_health_check`

- 成功
- 確認できた主な値
  - `program_status_type: READY`
  - `qot_logined: true`
  - `trd_logined: true`
  - `server_ver: 1005`

#### `moomoo_snapshot`

- 成功
- `US.AAPL`, `US.TSLA` の snapshot 取得を確認
- 実機で見えた例
  - `US.AAPL last_price: 298.87`
  - `US.TSLA last_price: 445.27`

#### `moomoo_kline_history`

- 成功
- `US.AAPL`, `K_DAY`, `maxCount=5` で履歴取得を確認
- `time_key`, `open`, `close`, `high`, `low`, `volume` を取得できた

#### `moomoo_stock_filter`

- 成功
- 実行条件
  - `market=US`
  - `minPrice=20`
  - `minMarketCap=10_000_000_000`
  - `peMin=0`
  - `peMax=30`
  - `limit=5`
- 実機結果
  - `all_count=9347`
  - `count=5`
- 注意
  - 条件は通るが、結果の上位がそのまま「戦略上の良銘柄」になるとは限らない
  - Phase 2 で field coverage と絞り込み設計の見直しが必要

#### `moomoo_plate_list`

- 成功
- 実行条件
  - `market=US`
  - `plateClass=ALL`
- 実機結果
  - `count=348`
  - 先頭例
    - `US.LIST20010 / Crypto`
    - `US.LIST2003 / Household & Personal Products`
    - `US.LIST2004 / Internet Content & Information`

#### `moomoo_plate_stocks`

- 成功
- `US.LIST20010` の constituent 取得で `count=77`
- 先頭例
  - `US.ABTC`
  - `US.ABTS`
  - `US.AEHL`
  - `US.AIXC`
  - `US.ALTS`

## 実機で見つかった不具合と修正

### 1. moomoo 接続ログが stdout に混ざる

#### 症状

- `health_check` 実行時、Python adapter 自体は JSON を返しているのに Node 側で
  - `Invalid JSON response from moomoo adapter for moomoo health_check`
  が発生した

#### 原因

- `moomoo-api` が接続・切断ログを stdout に出すため、adapter の JSON 以外の行が混ざった

#### 修正

- `src/core/moomoo.js` で stdout 全体をそのまま parse せず、
  - 行分割
  - 空行除去
  - `{` または `[` で始まる行だけ抽出
  - 最後の JSON 行を parse
  する形に変更

### 2. snapshot DataFrame 内の `NaN` が strict JSON で読めない

#### 症状

- `health_check` は通るが `snapshot` で
  - `Invalid JSON response from moomoo adapter for moomoo snapshot`
  が発生した

#### 原因

- moomoo snapshot の DataFrame に `NaN` が含まれ、Python `json.dumps` が非 strict JSON を出した

#### 修正

- `python/moomoo_adapter.py` の scalar normalizer で
  - 非有限 float (`NaN`, `inf`, `-inf`)
  を `null` に変換するよう変更

### 回帰テスト

- `tests/moomoo.test.js` に
  - stdout にログ行が混ざるケース
  を追加
- `npm run test:unit` は修正後に全件 pass

## 現在の関連ファイル

### 実装本体

- `src/server.js`
- `src/core/moomoo.js`
- `src/tools/moomoo.js`
- `python/moomoo_adapter.py`
- `tests/moomoo.test.js`

### 調査 / 設計文書

- `docs/strategy/moomoo_integration_analysis.md`
- `docs/strategy/moomoo/README.md`
- `docs/strategy/moomoo/00_environment.md`
- `docs/strategy/moomoo/01_quote_api.md`
- `docs/strategy/moomoo/02_trade_api.md`
- `docs/strategy/moomoo/03_mcp_integration.md`

### 実装計画

- `docs/exec-plans/completed/moomoo-phase1-readonly_20260514_1044.md`
- `docs/exec-plans/completed/moomoo-phase1-session-log_20260514_1100.md`

## 現在の到達点

- **Phase 1 read-only 統合は repo に実装済み**
- **OpenD 実機接続で read-only ツール群の主要経路は確認済み**
- 実機でのみ見えた JSON 周りの不具合は修正済み
- `REAL` 発注系や paper order webhook はまだ未着手のまま

## 次セッションの最短再開ポイント

1. この handoff ログを読む
2. `docs/strategy/moomoo_integration_analysis.md` を読む
3. `src/core/moomoo.js` と `python/moomoo_adapter.py` を確認する
4. 判断する
   - Phase 2 の screening / validation 強化へ進むか
   - account read tools を先に増やすか
   - webhook / paper trading の Phase 3 へ進むか

## 次にやるなら有力な候補

### 候補 1: Phase 2 screening 補強

- `get_stock_filter()` で使える field を追加棚卸し
- 現行 TradingView screener 指標との対応表を作る
- plate constituent から breadth 指標を repo 側で計算する

### 候補 2: account read tools

- `get_acc_list()`
- `position_list_query()`
- `accinfo_query()`
- `order_list_query()`

これは Phase 1.5 的に low risk で、paper 運用前の visibility を増やしやすい

### 候補 3: Phase 3 paper trading

- `tv_webhook_server.py` の productionize
- `moomoo_paper_buy`
- `moomoo_cancel_order`
- audit log
- idempotency

## 注意点

- `.codex/config.toml` には今回以前から未コミット変更がある
- `get_stock_filter()` は動くが、戦略向け条件として十分かはまだ未検証
- `subscribe()` ベースの push 監視は今回の Phase 1 では対象外
- `deal_list_query()` は paper trading 非対応という既知制約がある
