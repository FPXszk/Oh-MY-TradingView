# moomoo Phase 2 screening / validation

## Summary

Phase 2 では `get_stock_filter()` / `get_plate_list()` / `get_plate_stock()` / `request_history_kline()` を、TradingView 候補の再確認導線として使えるところまで実装した。

- `moomoo_stock_filter_fields` で `StockField` inventory を取得可能にした
- `moomoo_stock_filter` は simple / financial / indicator / pattern filter DSL を受けられるようにした
- `moomoo_plate_breadth` で plate 構成銘柄から breadth を repo 側で集計できるようにした
- `moomoo_ohlc_compare` で moomoo 日足と repo 側比較 series を並べて drift を確認できるようにした
- `moomoo_screening_validate` で stock filter 候補と plate 構成銘柄を突き合わせ、candidate を proxy score で再採点できるようにした
- `moomoo_screening_validate` は `benchmark` / `moomoo-only` の 2 mode を持ち、external benchmark なしでも候補再確認を回せるようにした
- `moomoo_fundamental_probe` で `SUM_OF_BUSINESS_GROWTH` / `DEBT_ASSET_RATE` / `PCF_TTM` を repo reference と個別比較できるようにした

実機 OpenD (`MOOMOO_HOST=172.31.144.1`, `MOOMOO_PORT=11112`, `MOOMOO_PYTHON_BIN=/usr/bin/python3`) で live validation を実施し、完了基準の **「TradingView 候補を moomoo データで再確認できること」** は満たせた。

## 実装メモ

- `get_stock_filter()` は `filter_min` / `filter_max` を入れるだけでは条件が効かず、`is_no_filter = False` を明示する必要があった
- Yahoo comparison 側は `US.NVDA` のような moomoo symbol ではなく `NVDA` の ticker へ変換する必要があった
- `request_history_kline()` は一過性の stdout noise / JSON parse failure があるため、comparison 側では invalid JSON の場合だけ 1 回リトライする
- `FilterStockData` は tuple key を含むため、adapter 側で `sum_of_business_growth|annual` のような string key へ正規化する必要があった
- `SUM_OF_BUSINESS_GROWTH` / `DEBT_ASSET_RATE` / `PCF_TTM` は `no_filter=true` では値を拾えず、広い min/max を付けた通常 filter として request する必要があった
- 2026-05-14 実査時点で Yahoo `quoteSummary` は `401` を返し、probe 内の Yahoo fundamentals は欠損した

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
| `earnings_per_share_diluted_yoy_growth_ttm` | growth | `EPS_GROWTH_RATE` | partial | moomoo 側は annual report ベースの EPS YoY。TradingView の diluted EPS TTM YoY と live 差分確認が必要 |
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

## Validation mode split

`moomoo_screening_validate` は、2026-05-14 以降は以下の 2 mode を持つ。

| mode | 含むもの | 含まないもの | 用途 |
| --- | --- | --- | --- |
| `moomoo-only` | stock filter / plate breadth / repo-side proxy score / moomoo history metrics | external OHLC benchmark | TradingView 候補を moomoo データだけで再確認したい時 |
| `benchmark` | `moomoo-only` の全要素 + `moomoo_ohlc_compare` | なし | 外部系列との差分まで含めて検証したい時 |

live 実査 (`MARKET_VAL >= 50B`, sort `DESCEND`, plate `US.LIST20077`):

| mode | requested candidates in stock filter | requested candidates in plate | top requested ranks |
| --- | --- | --- | --- |
| `moomoo-only` | NVDA / AVGO / AMD all true | NVDA / AVGO / AMD all true | NVDA 1, AVGO 3, AMD 4 |
| `benchmark` | NVDA / AVGO / AMD all true | NVDA / AVGO / AMD all true | NVDA 1, AVGO 3, AMD 4 |

`moomoo-only` 上位 3:

| rank | symbol | proxy score | perf3m | perf6m | pct of 52w high |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | `US.NVDA` | 71.00 | 18.8331 | 13.4664 | 99.12 |
| 3 | `US.AVGO` | 57.60 | 21.8533 | 16.7620 | 95.23 |
| 4 | `US.AMD` | 51.40 | 108.5869 | 82.5969 | 94.95 |

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

## Fundamental proxy probe

`moomoo_fundamental_probe` を `US.LIST20077` (`Semiconductors`) 上で `US.NVDA` / `US.AVGO` / `US.AMD` に実行した。

### Revenue growth (`SUM_OF_BUSINESS_GROWTH` vs TradingView `total_revenue_yoy_growth_ttm`)

| symbol | moomoo pct | TradingView pct | abs diff (pct pt) |
| --- | ---: | ---: | ---: |
| `US.NVDA` | 65.4730 | 65.4735 | 0.0005 |
| `US.AVGO` | 23.8740 | 25.2214 | 1.3474 |
| `US.AMD` | 34.3370 | 34.9694 | 0.6324 |

読み筋:

- `SUM_OF_BUSINESS_GROWTH` は revenue growth proxy としてかなり近い
- 少なくとも semi leader 3 銘柄では、TradingView revenue growth と大きく乖離していない
- Yahoo side は `quoteSummary` が `401` で失敗し、今回の live probe では比較できなかった

### P/FCF (`PCF_TTM / 100` vs TradingView `price_free_cash_flow_ttm`)

| symbol | moomoo raw | moomoo approx (`/100`) | TradingView P/FCF | abs diff |
| --- | ---: | ---: | ---: | ---: |
| `US.NVDA` | 5324.988 | 53.2499 | 65.9386 | 12.6887 |
| `US.AVGO` | 6647.899 | 66.4790 | 70.4669 | 3.9879 |
| `US.AMD` | 7469.743 | 74.6974 | 85.7330 | 11.0356 |

読み筋:

- `PCF_TTM` は `raw / 100` に正規化すると数量感は近い
- ただし TradingView `price_free_cash_flow_ttm` と完全一致ではなく、symbol によって 4〜13pt ずれる
- したがって **exact 置換ではなく partial proxy** とみなすのが安全

### Debt metric (`DEBT_ASSET_RATE` vs TradingView `debt_to_equity`)

| symbol | moomoo debt/assets pct | TradingView debt/equity |
| --- | ---: | ---: |
| `US.NVDA` | 23.9400 | 0.072552 |
| `US.AVGO` | 52.4860 | 0.827036 |
| `US.AMD` | 18.1040 | 0.060051 |

読み筋:

- これは **同じ公式ではない**
- `DEBT_ASSET_RATE` は debt/assets、TradingView `debt_to_equity` は debt/equity なので、置換ではなく「負債の重さを別角度で見る補助指標」に留めるべき
- したがって `debt_to_equity` の exact replacement として採用するのは不可

## Remaining gaps

- OHLC comparison の基準は今は Yahoo daily series。TradingView raw bar export を直接使う比較ではない
- `perfY` を安定して埋めるには 252 超の bar を確保する扱いを追加確認したい
- `FCF margin`, `EV/EBITDA`, `beta`, `debt_to_equity` の exact mapping は未解決
- `SUM_OF_BUSINESS_GROWTH` は revenue growth proxy として有望だが、他 sector / market でも同じ近さかは未確認
- `PCF_TTM` は partial proxy までで、exact P/FCF replacement には未達
- Yahoo `quoteSummary` の 401 が続く場合、現行 Yahoo enrichment はさらに不安定になりうる
- plate breadth は snapshot ベースなので intraday breadth / multi-day breadth は別設計が必要
