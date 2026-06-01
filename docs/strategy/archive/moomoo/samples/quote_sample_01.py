"""get_market_snapshot() で複数銘柄のスナップショットを取得する sample。"""

import os
import traceback

import moomoo as ft

# OpenD 接続設定。必要に応じて環境変数で上書きする。
OPEND_HOST = os.environ.get("MOOMOO_HOST", "127.0.0.1")
OPEND_PORT = int(os.environ.get("MOOMOO_PORT", "11111"))
SYMBOLS = ["US.AAPL", "US.TSLA"]


def main() -> None:
    quote_ctx = None
    try:
        quote_ctx = ft.OpenQuoteContext(host=OPEND_HOST, port=OPEND_PORT)
        ret, data = quote_ctx.get_market_snapshot(SYMBOLS)
        if ret != ft.RET_OK:
            raise RuntimeError(f"get_market_snapshot failed: {data}")
        print(data.to_string())
    except Exception:
        print(f"[ERROR] host={OPEND_HOST} port={OPEND_PORT} symbols={SYMBOLS}")
        traceback.print_exc()
        raise SystemExit(1)
    finally:
        if quote_ctx is not None:
            quote_ctx.close()


if __name__ == "__main__":
    main()
