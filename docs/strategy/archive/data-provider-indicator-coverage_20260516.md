# Data provider indicator coverage

作成日: 2026-05-16

## 結論

現行スクリーニングのファンダメンタル主データ源は **TradingView Scanner を継続**するのが一番良い。

理由は、現行で重視している `ROIC`、`FCF margin`、`gross profit / assets`、`EPS growth`、`revenue growth`、`EV/EBITDA`、`P/FCF`、`debt_to_equity` まで、スクリーニングに必要な横断比較指標を 1 回の cross-sectional scan でまとめて取れるため。2026-05-16 実査でも、現行 `src/core/fundamental-screener.js` の 35 列は TradingView Scanner から全て非 null で返った。

Moomoo は **補完・検証データ源**として使うのが良い。`get_stock_filter()` の field inventory は 120 件あり、価格、時価総額、PER、P/S、P/B、PCF、ROE、ROIC、ROA、売上成長、EPS 成長、各種 margin、RSI / MA / EMA / MACD / Bollinger などを持てる。ただし、現行スクリーニングで重要な `gross profit / assets`、`FCF margin`、`EV/EBITDA`、`debt_to_equity` は exact replacement ではなく、proxy または欠損になる。よって主データ源へ置き換えるより、TradingView 候補の再確認、Moomoo revenue growth 補完、OHLC drift 検証に使う方が安全。

Yahoo Finance は **通常運用では使わない方向へ寄せる**。chart / OHLCV / news search は動くが、2026-05-16 実査でも `quoteSummary` は `401 Unauthorized / Invalid Crumb` を返した。価格系列は Moomoo `request_history_kline()`、quote は Moomoo snapshot、TA は Moomoo kline からの repo 側計算へ寄せる。ニュースは現行 Moomoo / TradingView 実装に直接代替がないため、スクリーニング本体から切り離し、必要時だけ明示 provider で扱う。

## 実査メモ

| Provider | 実査日 | 確認内容 | 結果 |
| --- | --- | --- | --- |
| TradingView Scanner | 2026-05-16 | `america/scan` で現行 screener 35 列を取得 | `NASDAQ:NVDA` など上位行で 35/35 非 null |
| TradingView Scanner | 2026-05-16 | valuation / additional TA 候補 59 列を個別確認 | 58 列が有効、`Perf.1W` のみ unknown field |
| Moomoo OpenAPI | 2026-05-16 | `stock_filter_fields` | 120 fields: financial 46 / indicator 28 / pattern 20 / simple 26 |
| Moomoo OpenAPI | 2026-05-16 | `US.NVDA` snapshot / fundamentals / kline | snapshot, Moomoo fundamentals, 日足 OHLCV 取得成功 |
| Yahoo Finance | 2026-05-16 | chart / search / quoteSummary | chart と search は 200、quoteSummary は 401 |

## 「価格系列・ニュース限定」の具体的な意味

前版で「価格系列・ニュース限定」と書いたのは、Yahoo をファンダメンタルには使わず、以下のような軽い補助用途だけなら使える、という意味だった。

| 用途 | Yahoo で取っていたもの | コード上の該当箇所 | 代替方針 |
| --- | --- | --- | --- |
| 単一銘柄 quote | 現在値、前日終値、1日騰落率、出来高、52週高値/安値 | `src/core/market-intel.js` の `getSymbolQuote()` | Moomoo `get_market_snapshot()` に置換 |
| TA 用価格系列 | 3カ月の日足 close | `fetchDailyCloses()` → `RSI14`, `SMA20`, `SMA50` 計算 | Moomoo `request_history_kline()` に置換 |
| OHLC drift 比較 | Moomoo 日足と比較する外部 daily bars | `src/core/moomoo.js` の `fetchYahooHistory()` | 既定では比較なし。必要時だけ legacy benchmark として明示 |
| ニュース検索 | Yahoo Finance search の `news` | `getFinancialNews()` | 通常無効化。スクリーニング判断には入れない |

つまり「価格系列」は、`open / high / low / close / volume` の時系列データのこと。具体的には RSI、SMA、期間リターン、OHLC drift の計算に使うローソク足データを指す。

「ニュース限定」は、Yahoo search から銘柄ニュースのタイトル、publisher、link、publishedAt を取る用途のこと。ただしこれはスクリーニング本体の品質指標ではないため、通常経路からは外す。

## 現行スクリーニングで使っている指標

`src/core/fundamental-screener.js` と `src/core/sector-momentum.js` で使う主な指標。

| 分類 | 指標 | 現行用途 |
| --- | --- | --- |
| 銘柄属性 | `name`, `sector`, `industry`, exchange / symbol | sector profile、industry profile、表示 |
| 価格・トレンド | `close`, `SMA50`, `SMA200`, `price_52_week_high`, `RSI` | Minervini 的な上昇トレンド確認 |
| 価格モメンタム | `Perf.1M`, `Perf.3M`, `Perf.6M`, `Perf.Y` | sector strength、rank score |
| 出来高・ボラ | `relative_volume_10d_calc`, `volume`, `ATR`, `beta_1_year` | 流動性、risk / value guard |
| 規模・収益 | `market_cap_basic`, `earnings_per_share_diluted_ttm` | server-side filter、黒字確認 |
| Quality | `return_on_equity`, `return_on_invested_capital`, `gross_margin_ttm`, `gross_profit_ttm`, `total_assets`, `operating_margin_ttm` | profitability / quality rank |
| Cash flow | `free_cash_flow_margin_ttm`, `free_cash_flow_ttm`, `cash_f_operating_activities_ttm`, `net_income_ttm` | FCF quality、cash conversion |
| Growth | `earnings_per_share_diluted_yoy_growth_ttm`, `free_cash_flow_yoy_growth_ttm`, `total_revenue_yoy_growth_ttm`, Moomoo `revenueGrowth` | growth confirmation、Rule of 40 |
| Valuation / risk | `enterprise_value_ebitda_ttm`, `price_free_cash_flow_ttm`, `debt_to_equity`, `net_debt` | risk / value guard |

## ファンダメンタル取得カバレッジ

| 指標グループ | TradingView Scanner | Moomoo OpenAPI | Yahoo Finance |
| --- | --- | --- | --- |
| 銘柄属性 | `name`, `description`, `sector`, `industry`, `country`, `exchange` | `STOCK_CODE`, `STOCK_NAME`, basic info / snapshot | chart meta の `symbol`, `shortName`, `longName`, `exchangeName` 程度 |
| 時価総額 | `market_cap_basic`, `market_cap_calc` | `MARKET_VAL`, `FLOAT_MARKET_VAL`, snapshot `total_market_val`, `circular_market_val` | chart meta では基本不可。quoteSummary は 401 |
| Enterprise value | `enterprise_value_current` | 直接確認できず | quoteSummary 前提だが現在 401 |
| PER | `price_earnings_ttm` | `PE_TTM`, `PE_ANNUAL`, snapshot `pe_ttm_ratio`, `pe_ratio` | quoteSummary 前提だが現在 401 |
| P/S | `price_sales_current` | `PS_TTM` | quoteSummary 前提だが現在 401 |
| P/B | `price_book_fq` | `PB_RATE`, snapshot `pb_ratio` | quoteSummary 前提だが現在 401 |
| P/CF / P/FCF | `price_free_cash_flow_ttm` | `PCF_TTM` は partial proxy。Phase 2 では `raw / 100` が近似 | quoteSummary 前提だが現在 401 |
| EV/EBITDA | `enterprise_value_ebitda_ttm` | 直接確認できず | quoteSummary 前提だが現在 401 |
| 配当利回り | `dividends_yield_current` | snapshot `dividend_ratio_ttm`, `dividend_lfy_ratio`, `trust_dividend_yield` | quoteSummary 前提だが現在 401 |
| 売上 | `total_revenue_ttm` | `SUM_OF_BUSINESS` | quoteSummary 前提だが現在 401 |
| 売上成長 | `total_revenue_yoy_growth_ttm` | `SUM_OF_BUSINESS_GROWTH`, normalized `revenueGrowth` | quoteSummary 前提だが現在 401 |
| EPS | `earnings_per_share_diluted_ttm`, `earnings_per_share_basic_ttm` | `BASIC_EPS`, `DILUTED_EPS`, snapshot `earning_per_share` | quoteSummary 前提だが現在 401 |
| EPS 成長 | `earnings_per_share_diluted_yoy_growth_ttm` | `EPS_GROWTH_RATE` は候補だが要注意 | TradingView は diluted EPS の TTM YoY。moomoo 側は annual quarter 指定の EPS YoY で、同義未検証 |
| EBITDA | `ebitda_ttm`, `ebitda_yoy_growth_ttm` | `EBITDA`, `EBITDA_MARGIN` | quoteSummary 前提だが現在 401 |
| Net income / margin | `net_income_ttm`, `net_margin_ttm` | `NET_PROFIT`, `NET_PROFIT_RATE`, `SHAREHOLDER_NET_PROFIT_TTM` | quoteSummary 前提だが現在 401 |
| Gross profit / margin | `gross_profit_ttm`, `gross_margin_ttm` | `GROSS_PROFIT_RATE` は取れるが `gross_profit_ttm / total_assets` の exact source は不足 | quoteSummary 前提だが現在 401 |
| Operating margin | `operating_margin_ttm` | `OPERATING_MARGIN_TTM`, `OPERATING_PROFIT_TTM` | quoteSummary 前提だが現在 401 |
| FCF / FCF margin | `free_cash_flow_ttm`, `free_cash_flow_margin_ttm`, `free_cash_flow_yoy_growth_ttm` | exact replacement は未確認。`OPERATING_CASH_FLOW_TTM`, `NOCF_*` は補助候補 | quoteSummary 前提だが現在 401 |
| Capex | `capital_expenditures_ttm` | 直接確認できず | quoteSummary 前提だが現在 401 |
| ROE / ROA / ROIC | `return_on_equity`, `return_on_assets`, `return_on_invested_capital` | `RETURN_ON_EQUITY_RATE`, `ROA_TTM`, `ROIC` | quoteSummary 前提だが現在 401 |
| Debt / leverage | `total_debt`, `net_debt`, `debt_to_equity` | `DEBT_ASSET_RATE`, `EQUITY_MULTIPLIER`。`debt_to_equity` exact ではない | quoteSummary 前提だが現在 401 |
| Liquidity ratio | `current_ratio`, `quick_ratio` | `CURRENT_RATIO`, `QUICK_RATIO`, `CURRENT_ASSET_RATIO`, `CURRENT_DEBT_RATIO` | quoteSummary 前提だが現在 401 |
| Cash conversion | `cash_f_operating_activities_ttm`, `net_income_ttm` から repo 側計算 | `NET_PROFIT_CASH_COVER_TTM`, `OPERATING_REVENUE_CASH_COVER`, `OPERATING_CASH_FLOW_TTM` | quoteSummary 前提だが現在 401 |
| beta | `beta_1_year` | 直接確認できず | quoteSummary 前提だが現在 401 |

## Moomoo field inventory

`moomoo_stock_filter_fields` で確認した分類。

| category | count | 代表 field |
| --- | ---: | --- |
| simple | 26 | `CUR_PRICE`, `MARKET_VAL`, `PE_TTM`, `PB_RATE`, `PS_TTM`, `PCF_TTM`, `VOLUME`, `TURNOVER_RATE`, `CUR_PRICE_TO_HIGHEST52_WEEKS_RATIO` |
| financial | 46 | `SUM_OF_BUSINESS_GROWTH`, `NET_PROFIT_RATE`, `GROSS_PROFIT_RATE`, `ROIC`, `ROA_TTM`, `OPERATING_MARGIN_TTM`, `EPS_GROWTH_RATE`, `CURRENT_RATIO`, `QUICK_RATIO`, `DEBT_ASSET_RATE` |
| indicator | 28 | `PRICE`, `MA5`, `MA20`, `MA60`, `MA250`, `RSI`, `EMA20`, `MACD`, `BOLL_UPPER`, `BOLL_LOWER` |
| pattern | 20 | `MA_ALIGNMENT_LONG`, `EMA_ALIGNMENT_LONG`, `RSI_GOLD_CROSS_LOW`, `MACD_GOLD_CROSS_LOW`, `BOLL_BREAK_UPPER` |

## テクニカル指標カバレッジ

| 指標グループ | TradingView Scanner | Moomoo OpenAPI | Yahoo Finance |
| --- | --- | --- | --- |
| OHLCV | `close`, `volume` と scan 用価格列。scanner は横断取得向き | `request_history_kline()` で `open`, `high`, `low`, `close`, `volume`, `turnover`, `turnover_rate` | chart endpoint で `open`, `high`, `low`, `close`, `volume`, `adjclose` |
| 期間リターン | `Perf.1M`, `Perf.3M`, `Perf.6M`, `Perf.Y`, `Perf.YTD` | kline から repo 側計算。`CHANGE_RATE_BEGIN_YEAR` は filter field にあり | chart から repo 側計算 |
| 52週高値・安値 | `price_52_week_high`, `price_52_week_low`, `High.1M`, `High.3M`, `High.6M`, `High.All` | snapshot `highest52weeks_price`, `lowest52weeks_price`, `CUR_PRICE_TO_HIGHEST52_WEEKS_RATIO` | chart meta `fiftyTwoWeekHigh`, `fiftyTwoWeekLow` |
| SMA | `SMA5`, `SMA10`, `SMA20`, `SMA30`, `SMA50`, `SMA100`, `SMA200` | `MA5`, `MA10`, `MA20`, `MA30`, `MA60`, `MA120`, `MA250`, custom `MA` | chart close から repo 側計算。現行は SMA20 / SMA50 |
| EMA | `EMA5`, `EMA10`, `EMA20`, `EMA30`, `EMA50`, `EMA100`, `EMA200` | `EMA5`, `EMA10`, `EMA20`, `EMA30`, `EMA60`, `EMA120`, `EMA250`, custom `EMA` | chart close から repo 側計算可能 |
| RSI | `RSI`, `RSI7` | `RSI` indicator / RSI pattern fields | chart close から repo 側計算。現行は RSI14 |
| MACD | `MACD.macd`, `MACD.signal` | `MACD_DIFF`, `MACD_DEA`, `MACD`, MACD pattern fields | chart close から repo 側計算可能 |
| Stochastic / KDJ | `Stoch.K`, `Stoch.D` | `KDJ_K`, `KDJ_D`, `KDJ_J`, KDJ pattern fields | chart OHLC から repo 側計算可能 |
| Bollinger | TradingView candidate field は追加調査余地あり | `BOLL_UPPER`, `BOLL_MIDDLER`, `BOLL_LOWER`, Bollinger pattern fields | chart close から repo 側計算可能 |
| Trend recommendation | `Recommend.All`, `Recommend.MA`, `Recommend.Other` | 直接同等は未確認 | なし |
| Volatility / ATR | `ATR`, `Volatility.W`, `Volatility.M` | kline から repo 側計算 | chart OHLC から repo 側計算 |
| Volume support | `relative_volume_10d_calc`, `volume` | `VOLUME_RATIO`, snapshot `volume_ratio` | chart volume から repo 側計算 |
| Pattern scan | TradingView scanner の recommendation / indicator fields で近似 | `MA_ALIGNMENT_*`, `RSI_*`, `MACD_*`, `BOLL_*` pattern fields | 生 OHLCV から自前実装が必要 |

## Provider 別の実務評価

| Provider | 強み | 弱み | この repo での推奨役割 |
| --- | --- | --- | --- |
| TradingView Scanner | 横断スクリーニングが強い。ファンダメンタル、valuation、price momentum、TA を同じ scan で取れる。現行指標との対応が最も良い | 非公式 API 依存。TradingView 側の field 名変更には弱い | **主データ源**。候補抽出、rank、sector momentum に使う |
| Moomoo OpenAPI | OpenD 経由で snapshot / kline / stock filter / plate を取れる。field inventory が広く、実機検証しやすい | `get_stock_filter()` の頻度制限あり。TradingView と完全同義でない指標がある。FCF / EV / beta 周りが弱い | **補完・検証**。revenue growth 補完、候補再確認、OHLC drift、plate breadth に使う |
| Yahoo Finance | chart / OHLCV / search news は軽く使える | quoteSummary fundamentals が 401 で不安定。公式保証なし。横断 screener ではない | **通常運用では使わない**。必要時だけ legacy fallback |

## 採用方針

1. ファンダメンタル ranking は TradingView Scanner を主にする。
2. `enrichWithYahoo` という legacy option 名は互換性のため残し、中身は Moomoo revenue growth 補完として扱う。
3. Moomoo の `SUM_OF_BUSINESS_GROWTH` は revenue growth proxy として採用可能。ただし `PCF_TTM`、`DEBT_ASSET_RATE` は exact replacement として扱わない。
4. Yahoo `quoteSummary` fundamentals は復旧しても主経路へ戻さない。認証 crumb / cookie 依存が再発しやすく、スクリーニング運用に向かない。
5. テクニカルは、横断スクリーニングなら TradingView、検証や独自計算なら Moomoo OHLCV を使う。Yahoo OHLCV は明示的な legacy benchmark が必要な時だけ使う。
