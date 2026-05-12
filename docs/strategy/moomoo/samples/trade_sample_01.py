"""get_acc_list() で口座一覧を取得する sample。"""

import os
import traceback

import moomoo as ft

# OpenD 接続設定。取引系は security_firm も受けられるようにする。
OPEND_HOST = os.environ.get("MOOMOO_HOST", "127.0.0.1")
OPEND_PORT = int(os.environ.get("MOOMOO_PORT", "11111"))
SECURITY_FIRM = os.environ.get("MOOMOO_SECURITY_FIRM", "N/A")
FILTER_TRD_MARKET = ft.TrdMarket.US


def main() -> None:
    trade_ctx = None
    try:
        trade_ctx = ft.OpenSecTradeContext(
            filter_trdmarket=FILTER_TRD_MARKET,
            host=OPEND_HOST,
            port=OPEND_PORT,
            security_firm=SECURITY_FIRM,
        )
        ret, data = trade_ctx.get_acc_list()
        if ret != ft.RET_OK:
            raise RuntimeError(f"get_acc_list failed: {data}")
        print(data.to_string())
    except Exception:
        print(f"[ERROR] host={OPEND_HOST} port={OPEND_PORT}")
        traceback.print_exc()
        raise SystemExit(1)
    finally:
        if trade_ctx is not None:
            trade_ctx.close()


if __name__ == "__main__":
    main()
