# moomoo OpenAPI 取引 API 調査

## 現在の状態

**OpenD ログイン済み・`SIMULATE` 口座確認済みのため、US 株 (`AAPL`) 前提で live 実査を実施した。**

実行経路は `MOOMOO_HOST=172.31.144.1`, `MOOMOO_PORT=11112`。OpenD 自体は Windows 側 `127.0.0.1:11111` bind だが、portproxy 経由で WSL から到達させている。

## 安全制約

- 発注系 sample は **`TrdEnv.SIMULATE` 固定**
- 本番口座 (`REAL`) は使わない
- ユーザーが `SIMULATE` 口座有効を確認するまで `place_order()` / `modify_order()` 実査はしない

## 主要所見

- `OpenSecTradeContext` / `OpenFutureTradeContext` / `OpenCryptoTradeContext` が存在する
- 株式向けの初期化は `OpenSecTradeContext(filter_trdmarket=..., host=..., port=...)`
- ユーザー記載と SDK 実名が異なる項目がある
  - `get_position_list()` → **`position_list_query()`**
  - `get_funds()` → **`accinfo_query()`**
  - `get_order_list()` → **`order_list_query()`**
  - `cancel_order()` → **`modify_order(ft.ModifyOrderOp.CANCEL, ...)`**
- `unlock_trade()` は存在するが、SIMULATE だけなら通常不要

## 機能一覧

| # | 機能名 | ユーザー要求 | SDK 実メソッド | sample | 現在ステータス | 備考 |
| --- | --- | --- | --- | --- | --- | --- |
| 3-1 | 口座一覧 | `get_acc_list()` | `get_acc_list()` | `trade_sample_01.py` | ✅ 成功 | `REAL` 1口座 + `SIMULATE` 1口座を確認 |
| 3-2 | ポジション照会 | `get_position_list()` | `position_list_query()` | `trade_sample_02.py` | ✅ 成功 | `SIMULATE` 口座の既存 `US.RDW` ポジションを取得 |
| 3-3 | 残高/資産照会 | `get_funds()` | `accinfo_query()` | `trade_sample_03.py` | ✅ 成功 | USD ベースの cash / market value / margin 指標を取得 |
| 3-4 | 発注テスト | `place_order()` | `place_order()` | `trade_sample_04.py` | ✅ 成功 | `US.AAPL` 1 株 market buy を `SIMULATE` で発注、`order_id=282827` |
| 3-5 | 注文照会 | `get_order_list()` | `order_list_query()` | `trade_sample_05.py` | ✅ 成功 | 発注直後 `SUBMITTED`、取消後 `CANCELLED_ALL` を確認 |
| 3-6 | キャンセル/変更 | `cancel_order()` / `modify_order()` | `modify_order()` / `change_order()` | `trade_sample_06.py` | ✅ 成功 | `modify_order(CANCEL, order_id=282827)` で取消成功 |
| 3-7 | 約定履歴 | `get_deal_list()` | `deal_list_query()` | `trade_sample_07.py` | ⚠️ 制約確認 | `Paper trading does not support deal data.` |

## メソッドシグネチャ確認

```text
OpenSecTradeContext(filter_trdmarket='HK', host='127.0.0.1', port=11111, is_encrypt=None, security_firm='N/A', ai_type=0)

get_acc_list(self)
position_list_query(self, code='', pl_ratio_min=None, pl_ratio_max=None, trd_env='REAL', acc_id=0, acc_index=0, refresh_cache=False, position_market='N/A', asset_category='N/A', currency='USD')
accinfo_query(self, trd_env='REAL', acc_id=0, acc_index=0, refresh_cache=False, currency='HKD', asset_category='N/A')
place_order(self, price, qty, code, trd_side, order_type='NORMAL', adjust_limit=0, trd_env='REAL', acc_id=0, acc_index=0, remark=None, time_in_force='DAY', fill_outside_rth=False, aux_price=None, trail_type=None, trail_value=None, trail_spread=None, session='N/A', jp_acc_type='JP_GENERAL', position_id=None)
order_list_query(self, order_id='', status_filter_list=[], code='', start='', end='', trd_env='REAL', acc_id=0, acc_index=0, refresh_cache=False, order_market='N/A')
modify_order(self, modify_order_op, order_id, qty, price, adjust_limit=0, trd_env='REAL', acc_id=0, acc_index=0, aux_price=None, trail_type=None, trail_value=None, trail_spread=None)
change_order(self, order_id, price, qty, adjust_limit=0, trd_env='REAL', acc_id=0)
deal_list_query(self, code='', trd_env='REAL', acc_id=0, acc_index=0, refresh_cache=False, deal_market='N/A')
unlock_trade(self, password=None, password_md5=None, is_unlock=True)
```

## 取引関連の主な列挙

- `TrdEnv`: `SIMULATE`, `REAL`
- `TrdSide`: `BUY`, `SELL`, `BUY_BACK`, `SELL_SHORT`
- `OrderType`: `MARKET`, `NORMAL`, `STOP`, `STOP_LIMIT`, `TRAILING_STOP`, `TWAP`, `VWAP`
- `ModifyOrderOp`: `NORMAL`, `CANCEL`, `DISABLE`, `ENABLE`, `DELETE`
- `TrdMarket`: `US`, `HK`, `CN`, `CRYPTO`, `FUTURES`, `FUTURES_SIMULATE_US`, `FUTURES_SIMULATE_HK` など

## ライブ検証結果メモ

### 口座一覧

- `REAL` 側: `FUTUJP` の cash 口座を 1 件確認
- `SIMULATE` 側: `acc_id=1058261`, `acc_type=MARGIN`, `sim_acc_type=STOCK_AND_OPTION`, `trdmarket_auth=[US]`

### ポジション / 残高

- `position_list_query(trd_env=SIMULATE)` では既存 `US.RDW` ポジションを取得できた
- `accinfo_query(trd_env=SIMULATE, currency='USD')` では `cash`, `market_val`, `total_assets`, `initial_margin`, `available_funds` などの列を取得できた

### 発注 / 注文一覧 / キャンセル

- `place_order(..., code='US.AAPL', qty=1, order_type=MARKET, trd_env=SIMULATE)` は成功
- 戻り値 dataframe で `order_id=282827`, `order_status=SUBMITTED` を確認
- `order_list_query()` では同注文を再取得できた
- `modify_order(CANCEL, order_id=282827, trd_env=SIMULATE)` は成功
- 取消後の `order_list_query()` で `order_status=CANCELLED_ALL` を確認

### 約定履歴

- `deal_list_query(trd_env=SIMULATE)` は失敗ではなく **仕様制約の確認** になった
- 返却メッセージ:

```text
Paper trading does not support deal data.
```

## 補足

- 今回の market order は相場時間外のため約定せず、`SUBMITTED` → `CANCELLED_ALL` で終了した
- `trade_sample_06.py` は `MOOMOO_TARGET_ORDER_ID` 環境変数が必要
- リアル口座 (`REAL`) には触れていない

## サンプル配置

- `docs/strategy/samples/trade_sample_01.py` 〜 `trade_sample_07.py`

各 sample は **実行時に `TrdEnv.SIMULATE` を明示** し、例外時は stack trace を表示する。
