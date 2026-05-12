# moomoo OpenAPI の MCP 統合・自動化設計

## 4-1. Oh-MY-TradingView へ組み込む設計案

## 現行リポジトリの前提

- MCP サーバー本体は `src/server.js`
- `register*Tools(server)` 形式で tool namespace を分割している
- 既存の market 系は Node.js 側実装だが、今回の moomoo 調査は **Python (`moomoo-api`) を基軸** にする必要がある

## 推奨構成

### Option A: Python sidecar + Node tool wrapper (**推奨**)

1. Python 側に moomoo adapter を置く
2. Node 側 `src/tools/moomoo.js` から `child_process` / stdio / localhost HTTP で呼ぶ
3. Node 側 MCP surface は既存 repo の命名規則に合わせて `moomoo_*` を公開する

**利点**

- `moomoo-api` の Python 実装をそのまま活用できる
- OpenD 接続・SIMULATE ガード・トレード安全策を Python 側で一元化できる
- 既存 `register*Tools(server)` パターンに自然に乗る

**注意点**

- WSL の Node から Windows 上 OpenD へ届く host/port を Python 側 config に正しく渡す必要がある
- quote subscription の長寿命処理は、bounded tool と background monitor を分ける必要がある

### Option B: 別 MCP サーバーとして独立運用

- `moomoo` を独立 Python MCP server として走らせる
- Oh-MY-TradingView とは **協調利用** にとどめる

**利点**

- repo 本体の Node 実装を汚さない
- Python で完結する

**弱点**

- TradingView alert → order 実行までの一貫 UX は分断される
- ユーザーは MCP server を 2 本管理する必要がある

## 推奨ツール候補

| MCP ツール名 | 対応 moomoo API | 用途 | 安全ガード |
| --- | --- | --- | --- |
| `moomoo_health_check` | `get_global_state()` | OpenD 疎通確認 | read-only |
| `moomoo_snapshot` | `get_market_snapshot()` | 複数銘柄 quote | read-only |
| `moomoo_kline_history` | `request_history_kline()` | ローソク足履歴 | read-only |
| `moomoo_order_book` | `get_order_book()` | 板情報 | read-only / 権限依存 |
| `moomoo_ticker` | `get_rt_ticker()` | 約定履歴 | read-only |
| `moomoo_rt_data` | `get_rt_data()` | 当日分足 | read-only |
| `moomoo_stock_filter` | `get_stock_filter()` | スクリーナー | read-only |
| `moomoo_accounts` | `get_acc_list()` | 口座一覧 | account read |
| `moomoo_positions` | `position_list_query()` | ポジション照会 | account read |
| `moomoo_balance` | `accinfo_query()` | 残高/資産 | account read |
| `moomoo_paper_buy` | `place_order()` | ペーパー買い注文 | **SIMULATE 固定** |
| `moomoo_order_list` | `order_list_query()` | 注文一覧 | account read |
| `moomoo_cancel_order` | `modify_order(CANCEL)` | 注文キャンセル | **SIMULATE 固定** |
| `moomoo_deal_list` | `deal_list_query()` | 約定一覧 | account read |

## 4-2. 既存 MCP サーバー実装の調査

| リポジトリ | URL | 概要 | 参考にした点 |
| --- | --- | --- | --- |
| `Litash/moomoo-api-mcp` | https://github.com/Litash/moomoo-api-mcp | Python 製。market/account/trade/health を広くカバー | `check_health`、SIMULATE-only fallback、tool 分類 |
| `linboxin/moomoo-mcp-server` | https://github.com/linboxin/moomoo-mcp-server | Python 製。quote / order / technical / diagnostics を提供 | paper mode 切替、tool 命名、diagnostics 発想 |
| `shuizhengqi1/futu-stock-mcp-server` | https://github.com/shuizhengqi1/futu-stock-mcp-server | Futu 系の広範な MCP server | market/subscription/account/trading の包括整理 |

### 調査メモ

- `Litash/moomoo-api-mcp` は **OpenD health check + account/trade tools** まで含み、MCP 化の粒度が最も近い
- `linboxin/moomoo-mcp-server` は **paper trading を安全デフォルト** にしている点が有用
- `futu-stock-mcp-server` は Futu 系だが、**subscription / market / account / trading** を MCP surface としてどう束ねるかの参考になる

## 4-3. TradingView 連携案

## 推奨フロー

1. TradingView alert webhook を Python/FastAPI で受信
2. shared secret と payload schema を検証
3. alert payload を moomoo symbol / order instruction に正規化
4. `SIMULATE` 専用 adapter を呼んで paper order 実行
5. 実行結果を log / artifact / MCP 経由で可視化

## Oh-MY-TradingView との統合ポイント

| 統合ポイント | 具体案 |
| --- | --- |
| `src/server.js` | `registerMoomooTools(server)` を追加して `moomoo_*` namespace を導入 |
| `src/tools/` | Node 側の引数検証・レスポンス整形・安全ガードを担当 |
| `python/` または `docs/strategy/samples/` 起点 | Python adapter / webhook server / monitor を配置し、のちに productionize |
| CLI | `tv moomoo ...` 系コマンドを後段で増やす余地あり |
| observability | paper order / quote monitor のログを `artifacts/` 系へ保存できる |

## 実査で分かった前提

- OpenD は Windows 側 `127.0.0.1:11111` に bind しており、WSL からは直接届かなかった
- 現在の安定経路は Windows portproxy 経由 `172.31.144.1:11112`
- Quote API はこの経路で大半を live 検証済み
- Trade API も `SIMULATE` 口座の read / place / cancel まで確認済み

## 4-4. Webhook サーバー sample

- `docs/strategy/samples/tv_webhook_server.py`
- FastAPI ベース
- shared secret 付き payload を受けて、`SIMULATE` 専用 `place_order()` を呼ぶ構成
- ただし webhook からの実発注サンプル自体は未起動。今回はコード生成と構文確認までに留めた

## 4-5. リアルタイムモニタリング sample

- `docs/strategy/samples/price_monitor.py`
- `get_market_snapshot()` を一定間隔でポーリングし、閾値超過時に print/log
- OpenD / 権限が整えばそのまま利用できる想定

## 実装ロードマップ案

### Phase 1: Read-only bridge

- `moomoo_health_check`
- `moomoo_snapshot`
- `moomoo_kline_history`
- `moomoo_order_book`

### Phase 2: Account visibility

- `moomoo_accounts`
- `moomoo_positions`
- `moomoo_balance`
- diagnostics / entitlement check

### Phase 3: Safe paper trading

- `moomoo_paper_buy`
- `moomoo_cancel_order`
- webhook receiver
- bounded monitor / alert relay

### Phase 4: Production hardening

- explicit live-trading deny-list
- audit log
- order idempotency key
- rate-limit / reconnect policy

## 現時点の制約

- OpenD の bind address は実質 `127.0.0.1` 固定で、WSL からは portproxy 前提になる
- `deal_list_query()` は paper trading では使えない
- `subscribe()` の K 線 push は今回 30 秒窓で未観測のため、相場時間中の追加確認余地がある
