# moomoo Phase 2 screening / validation

## Summary

Phase 2 では `get_stock_filter()` / `get_plate_list()` / `get_plate_stock()` / `request_history_kline()` を、TradingView 候補の再確認導線として使えるところまで実装した。

- `moomoo_stock_filter_fields` で `StockField` inventory を取得可能にした
- `moomoo_stock_filter` は simple / financial / indicator / pattern filter DSL を受けられるようにした
- `moomoo_plate_breadth` で plate 構成銘柄から breadth を repo 側で集計できるようにした
- `moomoo_ohlc_compare` で moomoo 日足と repo 側比較 series を並べて drift を確認できるようにした
- `moomoo_screening_validate` で stock filter 候補と plate 構成銘柄を突き合わせ、candidate を proxy score で再採点できるようにした

実機 OpenD (`MOOMOO_HOST=172.31.144.1`, `MOOMOO_PORT=11112`, `MOOMOO_PYTHON_BIN=/usr/bin/python3`) で live validation を実施し、完了基準の **「TradingView 候補を moomoo データで再確認できること」** は満たせた。

## 実装メモ

- `get_stock_filter()` は `filter_min` / `filter_max` を入れるだけでは条件が効かず、`is_no_filter = False` を明示する必要があった
- Yahoo comparison 側は `US.NVDA` のような moomoo symbol ではなく `NVDA` の ticker へ変換する必要があった
- `request_history_kline()` は一過性の stdout noise / JSON parse failure があるため、comparison 側では invalid JSON の場合だけ 1 回リトライする

## `get_stock_filter()` inventory

live inventory (`moomoo_stock_filter_fields`) の取得結果:

| category | count |
| --- | ---: |
| simple | 26 |
| financial | 46 |
| pattern | 20 |
| indicator | 28 |

代表 field:

| field | category | note |
| --- | --- | --- |
| `CUR_PRICE` | simple | 現在値 |
| `CUR_PRICE_TO_HIGHEST52_WEEKS_RATIO` | simple | 52 週高値接近度 |
| `MARKET_VAL` | simple | 時価総額 |
| `PE_TTM` | simple | TTM PER |
| `CHANGE_RATE_BEGIN_YEAR` | simple | 年初来 change rate |
| `ROIC` | financial | 資本効率 |
| `RSI` | indicator | CustomIndicatorFilter で利用可能 |
| `MA` / `EMA` | indicator | parameter 指定で SMA/EMA 系に使える |

## 現行 repo スクリーナー指標との対応表

`src/core/fundamental-screener.js` の主要指標を、moomoo でどう再現できるか整理すると次のとおり。

| repo indicator | repo での用途 | moomoo source | status | note |
| --- | --- | --- | --- | --- |
| `close` | 現在値 | `CUR_PRICE`, `snapshot.last_price` | direct | filter / snapshot 両方で扱える |
| `market_cap_basic` | 大型株絞り込み | `MARKET_VAL`, `snapshot.total_market_val` | direct | Phase 2 で live 確認済み |
| `price_52_week_high` / `pctOf52wHigh` | 高値圏確認 | `CUR_PRICE_TO_HIGHEST52_WEEKS_RATIO`, `snapshot.highest52weeks_price` | direct | score と breadth の両方で利用可 |
| `Perf.3M` | price momentum | `request_history_kline()` から 63 bars 近似 | proxy | `perf3m` を repo 側計算 |
| `Perf.6M` | price momentum | `request_history_kline()` から 126 bars 近似 | proxy | `perf6m` を repo 側計算 |
| `Perf.Y` | 12M momentum | `request_history_kline()` から 252 bars 近似 | proxy | 251 bars しか取れないと `null` になる |
| `SMA50` / `SMA200` | トレンド確認 | `request_history_kline()` or indicator `MA` | proxy | Phase 2 実装では history から算出 |
| `RSI` | regime / momentum 補助 | indicator `RSI` | direct | screening DSL で条件化できる |
| `relative_volume_10d_calc` | 出来高補強 | `VOLUME_RATIO`, `snapshot.volume_ratio` | proxy | exact 10d relvol ではないが近い |
| `return_on_invested_capital` | quality | `ROIC` | direct | financial field として利用可 |
| `gross_profit_ttm / total_assets` | quality | 直接は無し | unavailable | 近いのは `GROSS_PROFIT_RATE` だが別物 |
| `operating_margin_ttm` | quality | `OPERATING_MARGIN_TTM` | direct | financial field |
| `free_cash_flow_margin_ttm` | quality | 直接は無し | unavailable | Phase 2 時点では未確認 |
| `total_revenue_yoy_growth_ttm` | growth | `SUM_OF_BUSINESS_GROWTH` 近辺 | partial | 名寄せ要追加。即採用は保留 |
| `earnings_per_share_diluted_yoy_growth_ttm` | growth | `EPS_GROWTH_RATE` | direct | financial field |
| `free_cash_flow_yoy_growth_ttm` | growth | 直接は無し | unavailable | 未確認 |
| `price_free_cash_flow_ttm` | valuation | `PCF_TTM` が近い | partial | `P/FCF` そのものではない |
| `enterprise_value_ebitda_ttm` | valuation | 直接は無し | unavailable | 未確認 |
| `beta_1_year` | risk | 直接は無し | unavailable | 別データ源が必要 |
| `debt_to_equity` | risk | 直接は無し | unavailable | 近いのは `DEBT_ASSET_RATE` |

結論として、**一次フィルタに必要な価格 / 時価総額 / 52週高値接近 / RSI / ROIC / operating margin あたりは moomoo 側でかなり持てる**。一方、`Perf.*`、SMA、breadth、exact FCF / valuation 指標は repo 側計算や別データ源の併用が前提。

## Breadth validation

live 実査:

- plate: `US.LIST20077` (`Semiconductors`)
- analyzed constituents: 15

結果:

| metric | value |
| --- | ---: |
| advance ratio | 80.00% |
| near 52w high ratio (`>= 90%`) | 93.33% |
| volume support ratio (`volume_ratio >= 1`) | 6.67% |
| average 1d change | 2.2366% |
| average pct of 52w high | 96.16% |
| breadth score | 60.00 |

上位サンプル:

| symbol | change 1d | pct of 52w high |
| --- | ---: | ---: |
| `US.ADI` | 3.0359% | 99.24 |
| `US.NVDA` | 2.2873% | 99.12 |
| `US.TXN` | 3.7843% | 99.04 |
| `US.ASML` | 3.9870% | 98.69 |
| `US.LRCX` | 2.1435% | 98.48 |

読み筋としては、**semi plate は breadth 自体かなり強いが、volume support は広がっていない**。theme persistence / breadth の一次確認としては十分使える。

## OHLC drift validation

`moomoo_ohlc_compare` を `US.NVDA`, `US.AVGO`, `US.AMD` へ実行した。比較対象は repo 側で扱いやすい daily series (Yahoo chart)。

| symbol | compared bars | avg abs close diff pct | max abs close diff pct | perf3m | perf6m | pct of 52w high |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `US.NVDA` | 251 | 0.009938 | 0.023570 | 18.8331 | 13.4664 | 99.12 |
| `US.AVGO` | 251 | 0.378310 | 0.803749 | 21.8533 | 16.7620 | 95.23 |
| `US.AMD` | 251 | 0.000002 | 0.000006 | 108.5869 | 82.5969 | 94.95 |

傾向:

- `NVDA`, `AMD` は drift がかなり小さい
- `AVGO` は平均 close 差が ~0.38% あり、他 2 銘柄よりズレが大きい
- 251 bars のため `perfY` は `null` になりうる。完全な 12M proxy には追加 1 bar を取れる条件確認が必要

## Screening validation workflow

live 実査:

- stock filter: `MARKET_VAL >= 50B`, sort `DESCEND`
- plate: `US.LIST20077` (`Semiconductors`)
- requested candidates: `US.NVDA`, `US.AVGO`, `US.AMD`

結果:

- stock filter total: 451
- stock filter returned: top 20
- plate constituent count: 15
- stock filter と plate の intersection: 6
- requested 3 銘柄は **全て stock filter に残り、plate にも属していた**

proxy rank:

| rank | symbol | proxy score | avg abs close diff pct | note |
| ---: | --- | ---: | ---: | --- |
| 1 | `US.NVDA` | 70.83 | 0.009938 | 時価総額最大、52w high 近接、SMA50/200 上 |
| 3 | `US.AVGO` | 56.33 | 0.378310 | 高値圏だが drift は NVDA/AMD より大きい |
| 4 | `US.AMD` | 52.33 | 0.000002 | 3M/6M momentum が強い一方、PE は重い |

この時点で、**TradingView 側で見ている semi leader 候補を moomoo 側で「filter に残るか」「theme breadth が追い風か」「daily OHLC drift が許容範囲か」の 3 点で再確認できる**。

## Remaining gaps

- OHLC comparison の基準は今は Yahoo daily series。TradingView raw bar export を直接使う比較ではない
- `perfY` を安定して埋めるには 252 超の bar を確保する扱いを追加確認したい
- `FCF margin`, `EV/EBITDA`, `beta`, `debt_to_equity` の exact mapping は未解決
- plate breadth は snapshot ベースなので intraday breadth / multi-day breadth は別設計が必要
