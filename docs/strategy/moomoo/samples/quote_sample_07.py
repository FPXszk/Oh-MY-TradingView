"""get_stock_filter() で簡易スクリーニングを行う sample。"""

import os
import traceback

import moomoo as ft

# OpenD 接続設定。
OPEND_HOST = os.environ.get("MOOMOO_HOST", "127.0.0.1")
OPEND_PORT = int(os.environ.get("MOOMOO_PORT", "11111"))
TARGET_MARKET = ft.Market.US
LIMIT = 20


def build_filters():
    """単純な価格・時価総額・PER 条件を組む。"""
    price_filter = ft.SimpleFilter()
    price_filter.stock_field = ft.StockField.CUR_PRICE
    price_filter.filter_min = 20
    price_filter.sort = ft.SortDir.DESCEND

    market_cap_filter = ft.SimpleFilter()
    market_cap_filter.stock_field = ft.StockField.MARKET_VAL
    market_cap_filter.filter_min = 10_000_000_000

    pe_filter = ft.FinancialFilter()
    pe_filter.stock_field = ft.StockField.PE_TTM
    pe_filter.filter_min = 0
    pe_filter.filter_max = 30
    pe_filter.quarter = ft.FinancialQuarter.ANNUAL

    return [price_filter, market_cap_filter, pe_filter]


def main() -> None:
    quote_ctx = None
    try:
        quote_ctx = ft.OpenQuoteContext(host=OPEND_HOST, port=OPEND_PORT)
        ret, data = quote_ctx.get_stock_filter(
            TARGET_MARKET,
            filter_list=build_filters(),
            begin=0,
            num=LIMIT,
        )
        if ret != ft.RET_OK:
            raise RuntimeError(f"get_stock_filter failed: {data}")
        last_page, all_count, stocks = data
        print(f"last_page={last_page} all_count={all_count} returned={len(stocks)}")
        for item in stocks:
            print(f"{item.stock_code}\t{item.stock_name}")
    except Exception:
        print(f"[ERROR] host={OPEND_HOST} port={OPEND_PORT} market={TARGET_MARKET}")
        traceback.print_exc()
        raise SystemExit(1)
    finally:
        if quote_ctx is not None:
            quote_ctx.close()


if __name__ == "__main__":
    main()
