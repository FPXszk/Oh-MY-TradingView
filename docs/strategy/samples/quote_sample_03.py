"""subscribe() と CurKlineHandlerBase でリアルタイム K 線を監視する sample。"""

import os
import time
import traceback

import moomoo as ft

# OpenD 接続設定。
OPEND_HOST = os.environ.get("MOOMOO_HOST", "127.0.0.1")
OPEND_PORT = int(os.environ.get("MOOMOO_PORT", "11111"))
SYMBOL = "US.AAPL"
SUBTYPE = ft.SubType.K_1M
MONITOR_SECONDS = 30


class CurKlinePrinter(ft.CurKlineHandlerBase):
    """受信した K 線 dataframe をそのまま表示する。"""

    def __init__(self) -> None:
        super().__init__()
        self.push_count = 0

    def on_recv_rsp(self, rsp_pb):
        ret, data = super().on_recv_rsp(rsp_pb)
        if ret != ft.RET_OK:
            print(f"[PUSH ERROR] {data}")
            return ret, data
        self.push_count += 1
        print("[PUSH]")
        print(data.tail().to_string())
        return ret, data


def main() -> None:
    quote_ctx = None
    try:
        quote_ctx = ft.OpenQuoteContext(host=OPEND_HOST, port=OPEND_PORT)
        handler = CurKlinePrinter()
        quote_ctx.set_handler(handler)
        ret, data = quote_ctx.subscribe(
            [SYMBOL],
            [SUBTYPE],
            is_first_push=True,
            subscribe_push=True,
        )
        if ret != ft.RET_OK:
            raise RuntimeError(f"subscribe failed: {data}")

        print(f"Subscribed to {SYMBOL} {SUBTYPE}. Monitoring for {MONITOR_SECONDS}s...")
        time.sleep(MONITOR_SECONDS)
        print(f"push_count={handler.push_count}")
        if handler.push_count == 0:
            print("No K-line push was observed during the monitoring window.")

        ret, data = quote_ctx.query_subscription()
        if ret != ft.RET_OK:
            raise RuntimeError(f"query_subscription failed: {data}")
        print(data)
    except Exception:
        print(f"[ERROR] host={OPEND_HOST} port={OPEND_PORT} symbol={SYMBOL} subtype={SUBTYPE}")
        traceback.print_exc()
        raise SystemExit(1)
    finally:
        if quote_ctx is not None:
            try:
                quote_ctx.unsubscribe([SYMBOL], [SUBTYPE])
            except Exception:
                pass
            quote_ctx.close()


if __name__ == "__main__":
    main()
