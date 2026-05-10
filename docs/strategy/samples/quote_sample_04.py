"""get_order_book() で板情報を取得する sample。"""

import os
import pprint
import traceback

import moomoo as ft

# OpenD 接続設定。
OPEND_HOST = os.environ.get("MOOMOO_HOST", "127.0.0.1")
OPEND_PORT = int(os.environ.get("MOOMOO_PORT", "11111"))
SYMBOL = "US.AAPL"
DEPTH = 10


def main() -> None:
    quote_ctx = None
    try:
        quote_ctx = ft.OpenQuoteContext(host=OPEND_HOST, port=OPEND_PORT)
        ret, data = quote_ctx.subscribe([SYMBOL], [ft.SubType.ORDER_BOOK], subscribe_push=False)
        if ret != ft.RET_OK:
            raise RuntimeError(f"subscribe failed: {data}")
        ret, data = quote_ctx.get_order_book(SYMBOL, num=DEPTH)
        if ret != ft.RET_OK:
            raise RuntimeError(f"get_order_book failed: {data}")
        pprint.pp(data)
    except Exception:
        print(f"[ERROR] host={OPEND_HOST} port={OPEND_PORT} symbol={SYMBOL} depth={DEPTH}")
        traceback.print_exc()
        raise SystemExit(1)
    finally:
        if quote_ctx is not None:
            quote_ctx.close()


if __name__ == "__main__":
    main()
