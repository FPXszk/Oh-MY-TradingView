# moomoo OpenAPI 相場データ API 調査

## 現在の状態

**SDK の API surface は確認済みで、Windows portproxy 経由の `172.31.144.1:11112` から live 実査を開始済み。**

この文書では以下を整理する。

1. ユーザーが要求した機能と、実際の `moomoo-api 10.05.6508` の対応メソッド
2. 実行用 Python サンプルの配置
3. OpenD セットアップ完了後に再実行すべき確認ポイント

## 主要所見

- `get_market_snapshot()`、`subscribe()`、`get_order_book()`、`get_rt_ticker()`、`get_rt_data()`、`get_stock_filter()`、`get_plate_list()`、`get_market_state()`、`get_capital_flow()`、`get_capital_distribution()` は SDK に存在する
- ユーザー記載名と SDK 実名が異なる項目がある
  - `get_history_kl_list()` → **`request_history_kline()`**
  - `get_plate_stock_list()` → **`get_plate_stock()`**
- ヒストリカル K 線は `request_history_kline()` が 3 要素返し (`ret`, `data`, `page_req_key`)
- リアルタイム K 線 push は `subscribe()` + `CurKlineHandlerBase` で処理する
- stock filter は `SimpleFilter` / `FinancialFilter` / `CustomIndicatorFilter` / `PatternFilter` を属性代入で組み立てる

## 機能一覧

| # | 機能名 | ユーザー要求 | SDK 実メソッド | sample | 現在ステータス | 備考 |
| --- | --- | --- | --- | --- | --- | --- |
| 2-1 | スナップショット | `get_market_snapshot()` | `get_market_snapshot()` | `quote_sample_01.py` | ✅ 成功 | `US.AAPL`, `US.TSLA` の snapshot を取得 |
| 2-2 | ヒストリカル K 線 | `get_history_kl_list()` | `request_history_kline()` | `quote_sample_02.py` | ✅ 成功 | 日足/週足/1分足を取得 |
| 2-3 | リアルタイム K 線 push | `subscribe()` | `subscribe()` + `CurKlineHandlerBase` | `quote_sample_03.py` | ⚠️ 部分成功 | subscribe / subscription 確認は成功、30 秒監視では push 0 件 |
| 2-4 | 板情報 | `get_order_book()` | `get_order_book()` | `quote_sample_04.py` | ✅ 成功 | 実行前に `SubType.ORDER_BOOK` 購読が必要 |
| 2-5 | ティック | `get_rt_ticker()` | `get_rt_ticker()` | `quote_sample_05.py` | ✅ 成功 | 実行前に `SubType.TICKER` 購読が必要 |
| 2-6 | 時系列 | `get_rt_data()` | `get_rt_data()` | `quote_sample_06.py` | ✅ 成功 | 実行前に `SubType.RT_DATA` 購読が必要 |
| 2-7 | 銘柄フィルタ | `get_stock_filter()` | `get_stock_filter()` | `quote_sample_07.py` | ✅ 成功 | 戻り値は `(last_page, all_count, stock_list)` |
| 2-8 | 板/構成銘柄 | `get_plate_list()` / `get_plate_stock_list()` | `get_plate_list()` / `get_plate_stock()` | `quote_sample_08.py` | ✅ 成功 | `plate_df` の列名は `plate_code` ではなく `code` |
| 2-9 | 市場状態 | `get_market_state()` | `get_market_state()` | `quote_sample_09.py` | ✅ 成功 | `US.AAPL`, `US.TSLA`, `HK.00700` を確認 |
| 2-10 | 資金フロー | `get_capital_flow()` / `get_capital_distribution()` | 同名 | `quote_sample_10.py` | ✅ 成功 | `US.AAPL` の intraday flow / distribution を取得 |

## メソッドシグネチャ確認

### Quote context

```text
get_market_snapshot(self, code_list)
request_history_kline(self, code, start=None, end=None, ktype='K_DAY', autype='qfq', fields=[''], max_count=1000, page_req_key=None, extended_time=False, session='N/A')
get_cur_kline(self, code, num, ktype='K_DAY', autype='qfq')
subscribe(self, code_list, subtype_list, is_first_push=True, subscribe_push=True, is_detailed_orderbook=False, extended_time=False, session='N/A')
get_order_book(self, code, num=10)
get_rt_ticker(self, code, num=500)
get_rt_data(self, code)
get_stock_filter(self, market, filter_list=None, plate_code=None, begin=0, num=200)
get_plate_list(self, market, plate_class)
get_plate_stock(self, plate_code, sort_field='CODE', ascend=True)
get_market_state(self, code_list)
get_capital_flow(self, stock_code, period_type='INTRADAY', start=None, end=None)
get_capital_distribution(self, stock_code)
```

### 戻り値で注意が必要なもの

- `request_history_kline()` → `ret, dataframe, page_req_key`
- `get_stock_filter()` → `ret, result`
- `get_plate_list()` / `get_plate_stock()` → `ret, dataframe`
- `get_capital_flow()` / `get_capital_distribution()` → `ret, dataframe`

### `get_stock_filter()` の戻り shape

`get_stock_filter()` の SDK 実装を確認したところ、正常時は以下の形で返る。

```text
(RET_OK, (last_page: bool, all_count: int, stock_list: list[FilterStockData]))
```

今回の US 市場実査では、以下のような結果を確認した。

```text
last_page=False
all_count=9429
returned=20
```

## Stock filter で使える主な列挙

### filter object 種別

- `SimpleFilter`
- `FinancialFilter`
- `CustomIndicatorFilter`
- `PatternFilter`

### `StockField` の代表例

- シンプル: `CUR_PRICE`, `VOLUME`, `TURNOVER`, `CHANGE_RATE`, `MARKET_VAL`, `FLOAT_MARKET_VAL`
- 財務: `PE_TTM`, `PB_RATE`, `PS_TTM`, `ROA_TTM`, `RETURN_ON_EQUITY_RATE`, `NET_PROFIT`
- テクニカル/インジケータ: `MA`, `EMA`, `MACD`, `RSI`, `BOLL_UPPER`, `BOLL_LOWER`
- パターン: `MACD_GOLD_CROSS_LOW`, `RSI_TOP_DIVERGENCE`, `KDJ_GOLD_CROSS_LOW`

### 併用列挙

- `Market`: `US`, `HK`, `SH`, `SZ`, `JP`, `SG`, `AU`, `CA`, `FX`, `CC`
- `KLType`: `K_1M`, `K_5M`, `K_15M`, `K_30M`, `K_60M`, `K_DAY`, `K_WEEK`, `K_MON`, `K_YEAR`
- `SortDir`: `ASCEND`, `DESCEND`
- `FinancialQuarter`: `ANNUAL`, `INTERIM`, `FIRST_QUARTER`, `THIRD_QUARTER`, `MOST_RECENT_QUARTER`
- `RelativePosition`: `MORE`, `LESS`, `CROSS_UP`, `CROSS_DOWN`
- `Plate`: `ALL`, `INDUSTRY`, `REGION`, `CONCEPT`, `OTHER`

## ライブ検証結果メモ

- 実行経路は `MOOMOO_HOST=172.31.144.1`, `MOOMOO_PORT=11112`
- `quote_sample_04.py` / `05.py` / `06.py` は、購読なしで直接 API を叩くとエラーになるため sample 側で事前 `subscribe()` を追加した
- `quote_sample_08.py` は `get_plate_list()` の戻り DataFrame の列名が `plate_code` ではなく `code` だったため修正した
- `quote_sample_03.py` は subscription 状態確認までは成功したが、今回の 30 秒監視では `push_count=0` だった
- `quote_sample_07.py` は `last_page / all_count / stock_list` を展開するよう修正し、US 市場で 9,429 件ヒットする条件の先頭 20 件を取得できた

## 追加で確認したい観点

### スナップショット

- AAPL / TSLA の snapshot で返る列一覧
- market cap / turnover / volume / lot size 等が US 株でどこまで埋まるか

### ヒストリカル K 線

- 日足 / 週足 / 1 分足の取得可否
- page key を跨ぐ長期間取得
- `extended_time` の挙動

### リアルタイム push

- `SubType.K_1M` の push が相場時間中に届くか
- WSL 経由で callback thread が安定するか

### 板 / 資金フロー

- LV1/LV2 権限で何が変わるか
- `get_capital_flow()` / `get_capital_distribution()` が権限不足時にどう返るか

## サンプル配置

- `docs/strategy/samples/quote_sample_01.py` 〜 `quote_sample_10.py`

各サンプルは以下の方針で作成した。

- 先頭 docstring で目的を説明
- `OPEND_HOST` / `OPEND_PORT` など設定値を先頭へ集約
- 例外時は stack trace をそのまま表示
- `MOOMOO_HOST=172.31.144.1`, `MOOMOO_PORT=11112` を渡せば WSL からそのまま実行できる
