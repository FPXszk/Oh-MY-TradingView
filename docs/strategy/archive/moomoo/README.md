# moomoo OpenAPI 機能一覧

## いまの到達点

- **WSL 側 `moomoo-api` 導入、Windows 側 OpenD 導入・ログインは完了**
- **OpenD は `127.0.0.1:11111` 固定 listen だったため、WSL からは Windows portproxy 経由 `172.31.144.1:11112` を使用**
- **Quote API は live 実査を開始し、大半の sample が成功**

詳細は以下を参照。

- `00_environment.md` — 環境確認と現在のブロッカー
- `01_quote_api.md` — 相場データ API の実メソッド整理
- `02_trade_api.md` — 取引 API の実メソッド整理
- `03_mcp_integration.md` — MCP 統合設計と既存実装調査

## 相場データ API

| 機能名 | メソッド | 動作確認 | 権限 | 備考 |
| --- | --- | --- | --- | --- |
| スナップショット | `get_market_snapshot()` | ✅ 成功 | LV1 想定 | `US.AAPL` / `US.TSLA` で確認済み |
| ヒストリカル K 線 | `request_history_kline()` | ✅ 成功 | LV1 想定 | 要求名 `get_history_kl_list()` に相当 |
| リアルタイム K 線 | `subscribe()` | ⚠️ 部分成功 | subscription / 権限依存 | subscription 確認済み、今回 30 秒窓では push 0 件 |
| 板情報 | `get_order_book()` | ✅ 成功 | LV2 可能性 | 実行前に購読が必要 |
| ティック | `get_rt_ticker()` | ✅ 成功 | 権限依存 | 実行前に購読が必要 |
| 時系列 | `get_rt_data()` | ✅ 成功 | LV1 想定 | 実行前に購読が必要 |
| 銘柄フィルタ | `get_stock_filter()` | ✅ 成功 | 市場/権限依存 | 戻り値は `(last_page, all_count, stock_list)` |
| セクター/構成銘柄 | `get_plate_list()` / `get_plate_stock()` | ✅ 成功 | 市場依存 | 要求名 `get_plate_stock_list()` に相当 |
| 市場状態 | `get_market_state()` | ✅ 成功 | 低 | `US` / `HK` を確認 |
| 資金フロー | `get_capital_flow()` / `get_capital_distribution()` | ✅ 成功 | LV2 可能性 | `US.AAPL` で取得成功 |

## 取引 API

| 機能名 | メソッド | 動作確認(Paper) | 備考 |
| --- | --- | --- | --- |
| 口座一覧 | `get_acc_list()` | ✅ 成功 | `REAL` 1件 + `SIMULATE` 1件を確認 |
| ポジション照会 | `position_list_query()` | ✅ 成功 | 要求名 `get_position_list()` に相当 |
| 残高照会 | `accinfo_query()` | ✅ 成功 | 要求名 `get_funds()` に相当 |
| 発注 | `place_order(..., trd_env=SIMULATE)` | ✅ 成功 | `US.AAPL` 1株、`order_id=282827` |
| 注文照会 | `order_list_query()` | ✅ 成功 | 要求名 `get_order_list()` に相当 |
| キャンセル/変更 | `modify_order()` / `change_order()` | ✅ 成功 | `modify_order(CANCEL)` で取消確認 |
| 約定履歴 | `deal_list_query()` | ⚠️ 制約確認 | paper trading では非対応 |

## MCP 統合ポイント

| MCP ツール名 | 対応する moomoo API | 優先度 | 実装難易度 |
| --- | --- | --- | --- |
| `moomoo_health_check` | `get_global_state()` | 高 | 低 |
| `moomoo_snapshot` | `get_market_snapshot()` | 高 | 低 |
| `moomoo_kline_history` | `request_history_kline()` | 高 | 中 |
| `moomoo_order_book` | `get_order_book()` | 中 | 中 |
| `moomoo_accounts` | `get_acc_list()` | 中 | 中 |
| `moomoo_positions` | `position_list_query()` | 中 | 中 |
| `moomoo_balance` | `accinfo_query()` | 中 | 中 |
| `moomoo_orders` | `order_list_query()` | 中 | 中 |
| `moomoo_deals` | `deal_list_query()` | 低 | 中 |
| `moomoo_portfolio` | `get_acc_list()` + `position_list_query()` + `accinfo_query()` | 高 | 中 |
| `moomoo_paper_buy` | `place_order()` | 高 | 高 |
| `moomoo_cancel_order` | `modify_order(CANCEL)` | 高 | 高 |

## Oh-MY-TradingView との統合ロードマップ

### Phase 1

- Windows OpenD の導入 / 起動 / ログイン
- `moomoo_health_check` と read-only quote tools の実査

### Phase 2

- 権限確認 (対象市場、LV1/LV2、SIMULATE)
- account read tools の有効化 (`moomoo_accounts` / `moomoo_positions` / `moomoo_balance` / `moomoo_orders` / `moomoo_deals` / `moomoo_portfolio`)

### Phase 3

- paper order workflow の実査
- TradingView webhook → moomoo paper order の接続

### Phase 4

- audit log
- reconnect / retry policy
- live-trading explicit confirmation gate

## 制約・注意事項

- **OpenD 未導入では何も始まらない**
- **本番発注 (`REAL`) はこの調査対象外**
- WSL からの安定接続先は現状 `172.31.144.1:11112` (Windows portproxy) を使う
- `moomoo-api 10.05.6508` では、要求名と実メソッド名が一部異なる
- `docs/strategy/samples/` には実行準備済みサンプルを配置済み

## Portfolio Diagnostics Workflow

- standalone workflow:
  - `.github/workflows/moomoo-portfolio-diagnostics.yml`
- unified workflow:
  - `.github/workflows/portfolio-health-check.yml`

既定の出力先:

- `docs/reports/screener/portfolio/moomoo_portfolio_diagnostics.md`
- `docs/reports/screener/portfolio/moomoo_portfolio_diagnostics.json`

2026-05-21 時点では、workflow 側で `python -m pip install moomoo-api` を実行してから診断を回すため、Windows runner 上に事前 venv が無くても read-only diagnostics を実行できる。
