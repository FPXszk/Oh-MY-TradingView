"""request_history_kline() で日足・週足・1分足を取得する sample。"""

import os
import traceback

import moomoo as ft

# OpenD 接続設定と対象銘柄。
OPEND_HOST = os.environ.get("MOOMOO_HOST", "127.0.0.1")
OPEND_PORT = int(os.environ.get("MOOMOO_PORT", "11111"))
SYMBOL = "US.AAPL"
KLINE_TYPES = [ft.KLType.K_DAY, ft.KLType.K_WEEK, ft.KLType.K_1M]
MAX_COUNT = 10


def main() -> None:
    quote_ctx = None
    try:
        quote_ctx = ft.OpenQuoteContext(host=OPEND_HOST, port=OPEND_PORT)
        for ktype in KLINE_TYPES:
            ret, data, page_req_key = quote_ctx.request_history_kline(
                SYMBOL,
                ktype=ktype,
                max_count=MAX_COUNT,
            )
            if ret != ft.RET_OK:
                raise RuntimeError(f"request_history_kline failed: ktype={ktype} detail={data}")
            print(f"=== {ktype} page_req_key={page_req_key} ===")
            print(data.to_string())
    except Exception:
        print(f"[ERROR] host={OPEND_HOST} port={OPEND_PORT} symbol={SYMBOL}")
        traceback.print_exc()
        raise SystemExit(1)
    finally:
        if quote_ctx is not None:
            quote_ctx.close()


if __name__ == "__main__":
    main()
