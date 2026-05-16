# moomoo-readonly-portfolio-diagnostics

作成日時: 2026-05-16 23:28 JST

## 目的

Moomoo OpenAPI で発注系を呼ばずに、口座・保有・残高・注文履歴・約定履歴・ポートフォリオ診断を確認できる read-only MCP tools を追加する。取引は禁止し、`place_order` / `modify_order` / `change_order` / `unlock_trade` は実装対象外にする。

## 前提

- OpenD は WSL から `MOOMOO_HOST=172.31.144.1`, `MOOMOO_PORT=11112` で接続できる。
- 既存 MCP の Moomoo tools は quote / kline / stock filter / plate / validation が中心で、account read tools は未登録。
- 既存 `docs/exec-plans/completed/moomoo-phase2-screening-validation_20260514_1107.md` の dirty 差分は今回の対象外。
- 実口座への発注、注文変更、注文取消、取引ロック解除は一切行わない。

## 変更・削除・作成するファイル

- 変更: `python/moomoo_adapter.py`
  - read-only trade context helper を追加する。
  - `accounts`, `positions`, `balance`, `orders`, `deals`, `portfolio` コマンドを追加する。
  - account id / environment / market / currency / optional date range を payload で受ける。
  - 発注系 SDK メソッドは追加しない。
- 変更: `src/core/moomoo.js`
  - `getMoomooAccounts`, `getMoomooPositions`, `getMoomooBalance`, `getMoomooOrders`, `getMoomooDeals`, `getMoomooPortfolioDiagnostics` を追加する。
  - account read payload の正規化と上限・enum validation を追加する。
  - portfolio diagnostics では保有評価額、含み損益、現金比率、ポジション比率、market/currency/position side 集計を返す。
- 変更: `src/tools/moomoo.js`
  - `moomoo_accounts`, `moomoo_positions`, `moomoo_balance`, `moomoo_orders`, `moomoo_deals`, `moomoo_portfolio` を MCP 登録する。
  - tool description に read-only / no order operation を明記する。
- 変更: `src/server.js`
  - instructions の Moomoo tool list に新 read-only account tools を追記する。
- 変更: `tests/moomoo.test.js`
  - adapter payload の正規化、診断集計、tool registration をテストする。
- 必要に応じて変更: `docs/strategy/moomoo/README.md`, `docs/strategy/moomoo/03_mcp_integration.md`
  - account read tools の現在地を反映する。

## 影響範囲

- Moomoo MCP に口座 read-only 系 tools が増える。
- REAL 口座の情報は読み取り対象にできるが、注文系操作は実装しない。
- 約定履歴は SDK / broker / paper trading の制約で空または unsupported を返す可能性がある。
- 既存 quote / screening / validation tools の挙動は変えない。

## 実装ステップ

- [ ] adapter に read-only trade context と account commands を追加する。
- [ ] core に payload validation と public functions を追加する。
- [ ] portfolio diagnostics の集計ロジックを追加する。
- [ ] MCP tools と server instructions を追加する。
- [ ] unit tests を追加・更新する。
- [ ] live OpenD で read-only smoke を実行する。
- [ ] 計画を completed に移動し、実装を commit / push する。

## 検証

- `node --test tests/moomoo.test.js`
- `git diff --check`
- live read-only smoke:
  - `MOOMOO_HOST=172.31.144.1 MOOMOO_PORT=11112 python3 python/moomoo_adapter.py accounts '{"host":"172.31.144.1","port":11112}'`
  - `MOOMOO_HOST=172.31.144.1 MOOMOO_PORT=11112 node --input-type=module <portfolio diagnostics smoke>`

## リスク

- REAL 口座情報を扱うため、出力の扱いに注意が必要。
- `deal_list_query()` は SDK 版により date range 非対応、paper trading では unsupported の可能性がある。
- `accinfo_query()` の currency 指定結果は口座種別によって `N/A` が多い可能性がある。
