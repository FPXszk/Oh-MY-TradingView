"""modify_order(CANCEL) で注文キャンセルを行う sample。"""

import os
import traceback

import moomoo as ft

# OpenD 接続設定。TARGET_ORDER_ID は実注文後に差し替える。
OPEND_HOST = os.environ.get("MOOMOO_HOST", "127.0.0.1")
OPEND_PORT = int(os.environ.get("MOOMOO_PORT", "11111"))
SECURITY_FIRM = os.environ.get("MOOMOO_SECURITY_FIRM", "N/A")
FILTER_TRD_MARKET = ft.TrdMarket.US
TRADING_ENV = ft.TrdEnv.SIMULATE
TARGET_ORDER_ID = os.environ.get("MOOMOO_TARGET_ORDER_ID", "")


def main() -> None:
    if not TARGET_ORDER_ID:
        raise SystemExit("MOOMOO_TARGET_ORDER_ID is required")

    trade_ctx = None
    try:
        trade_ctx = ft.OpenSecTradeContext(
            filter_trdmarket=FILTER_TRD_MARKET,
            host=OPEND_HOST,
            port=OPEND_PORT,
            security_firm=SECURITY_FIRM,
        )
        ret, data = trade_ctx.modify_order(
            ft.ModifyOrderOp.CANCEL,
            TARGET_ORDER_ID,
            qty=0,
            price=0,
            trd_env=TRADING_ENV,
        )
        if ret != ft.RET_OK:
            raise RuntimeError(f"modify_order failed: {data}")
        print(data.to_string())
    except Exception:
        print(f"[ERROR] host={OPEND_HOST} port={OPEND_PORT} env={TRADING_ENV} order_id={TARGET_ORDER_ID}")
        traceback.print_exc()
        raise SystemExit(1)
    finally:
        if trade_ctx is not None:
            trade_ctx.close()


if __name__ == "__main__":
    main()
