"""get_plate_list() / get_plate_stock() でセクターと構成銘柄を取得する sample。"""

import os
import traceback

import moomoo as ft

# OpenD 接続設定。
OPEND_HOST = os.environ.get("MOOMOO_HOST", "127.0.0.1")
OPEND_PORT = int(os.environ.get("MOOMOO_PORT", "11111"))
TARGET_MARKET = ft.Market.US
PLATE_CLASS = ft.Plate.ALL


def main() -> None:
    quote_ctx = None
    try:
        quote_ctx = ft.OpenQuoteContext(host=OPEND_HOST, port=OPEND_PORT)
        ret, plate_df = quote_ctx.get_plate_list(TARGET_MARKET, PLATE_CLASS)
        if ret != ft.RET_OK:
            raise RuntimeError(f"get_plate_list failed: {plate_df}")

        print("=== plate list ===")
        print(plate_df.head().to_string())

        if plate_df.empty:
            print("plate list is empty")
            return

        plate_code = plate_df.iloc[0]["code"]
        ret, stock_df = quote_ctx.get_plate_stock(plate_code)
        if ret != ft.RET_OK:
            raise RuntimeError(f"get_plate_stock failed: {stock_df}")
        print("=== plate constituents ===")
        print(stock_df.head().to_string())
    except Exception:
        print(f"[ERROR] host={OPEND_HOST} port={OPEND_PORT} market={TARGET_MARKET}")
        traceback.print_exc()
        raise SystemExit(1)
    finally:
        if quote_ctx is not None:
            quote_ctx.close()


if __name__ == "__main__":
    main()
