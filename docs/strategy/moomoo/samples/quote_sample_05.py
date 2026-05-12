"""get_rt_ticker() で直近ティックを取得する sample。"""

import os
import traceback

import moomoo as ft

# OpenD 接続設定。
OPEND_HOST = os.environ.get("MOOMOO_HOST", "127.0.0.1")
OPEND_PORT = int(os.environ.get("MOOMOO_PORT", "11111"))
SYMBOL = "US.AAPL"
COUNT = 50


def main() -> None:
    quote_ctx = None
    try:
        quote_ctx = ft.OpenQuoteContext(host=OPEND_HOST, port=OPEND_PORT)
        ret, data = quote_ctx.subscribe([SYMBOL], [ft.SubType.TICKER], subscribe_push=False)
        if ret != ft.RET_OK:
            raise RuntimeError(f"subscribe failed: {data}")
        ret, data = quote_ctx.get_rt_ticker(SYMBOL, num=COUNT)
        if ret != ft.RET_OK:
            raise RuntimeError(f"get_rt_ticker failed: {data}")
        print(data.to_string())
    except Exception:
        print(f"[ERROR] host={OPEND_HOST} port={OPEND_PORT} symbol={SYMBOL} count={COUNT}")
        traceback.print_exc()
        raise SystemExit(1)
    finally:
        if quote_ctx is not None:
            quote_ctx.close()


if __name__ == "__main__":
    main()
