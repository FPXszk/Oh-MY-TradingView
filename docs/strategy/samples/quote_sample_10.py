"""get_capital_flow() / get_capital_distribution() で資金フローを確認する sample。"""

import os
import traceback

import moomoo as ft

# OpenD 接続設定。
OPEND_HOST = os.environ.get("MOOMOO_HOST", "127.0.0.1")
OPEND_PORT = int(os.environ.get("MOOMOO_PORT", "11111"))
SYMBOL = "US.AAPL"


def main() -> None:
    quote_ctx = None
    try:
        quote_ctx = ft.OpenQuoteContext(host=OPEND_HOST, port=OPEND_PORT)

        ret, flow_df = quote_ctx.get_capital_flow(SYMBOL, period_type="INTRADAY")
        if ret != ft.RET_OK:
            raise RuntimeError(f"get_capital_flow failed: {flow_df}")
        print("=== capital flow ===")
        print(flow_df.to_string())

        ret, distribution_df = quote_ctx.get_capital_distribution(SYMBOL)
        if ret != ft.RET_OK:
            raise RuntimeError(f"get_capital_distribution failed: {distribution_df}")
        print("=== capital distribution ===")
        print(distribution_df.to_string())
    except Exception:
        print(f"[ERROR] host={OPEND_HOST} port={OPEND_PORT} symbol={SYMBOL}")
        traceback.print_exc()
        raise SystemExit(1)
    finally:
        if quote_ctx is not None:
            quote_ctx.close()


if __name__ == "__main__":
    main()
