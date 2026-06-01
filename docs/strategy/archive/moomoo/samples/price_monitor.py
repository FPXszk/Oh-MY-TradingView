"""価格が閾値を超えたら通知するシンプルなモニター sample。"""

import os
import time
import traceback

import moomoo as ft

# OpenD 接続設定と監視条件。
OPEND_HOST = os.environ.get("MOOMOO_HOST", "127.0.0.1")
OPEND_PORT = int(os.environ.get("MOOMOO_PORT", "11111"))
SYMBOL = os.environ.get("MOOMOO_MONITOR_SYMBOL", "US.AAPL")
THRESHOLD = float(os.environ.get("MOOMOO_THRESHOLD", "200"))
POLL_SECONDS = int(os.environ.get("MOOMOO_POLL_SECONDS", "5"))
MAX_POLLS = int(os.environ.get("MOOMOO_MAX_POLLS", "12"))


def main() -> None:
    quote_ctx = None
    try:
        quote_ctx = ft.OpenQuoteContext(host=OPEND_HOST, port=OPEND_PORT)
        for index in range(MAX_POLLS):
            ret, data = quote_ctx.get_market_snapshot([SYMBOL])
            if ret != ft.RET_OK:
                raise RuntimeError(f"get_market_snapshot failed: {data}")

            current_price = float(data.iloc[0]["last_price"])
            print(f"[{index + 1}/{MAX_POLLS}] {SYMBOL} last_price={current_price}")

            if current_price >= THRESHOLD:
                print(f"[ALERT] {SYMBOL} crossed {THRESHOLD}")
                return

            time.sleep(POLL_SECONDS)

        print("[INFO] threshold was not crossed within the monitor window")
    except Exception:
        print(f"[ERROR] host={OPEND_HOST} port={OPEND_PORT} symbol={SYMBOL}")
        traceback.print_exc()
        raise SystemExit(1)
    finally:
        if quote_ctx is not None:
            quote_ctx.close()


if __name__ == "__main__":
    main()
