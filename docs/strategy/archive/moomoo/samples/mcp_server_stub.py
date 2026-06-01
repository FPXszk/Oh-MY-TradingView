"""moomoo OpenAPI を MCP ツールとして包む最小スタブ。"""

import os

import moomoo as ft

try:
    from mcp.server.fastmcp import FastMCP
except ImportError as exc:  # pragma: no cover - sample guidance only
    raise ImportError(
        "Python MCP 実装が必要です。例: pip install mcp"
    ) from exc

# OpenD 接続設定。実運用では env で上書きする。
OPEND_HOST = os.environ.get("MOOMOO_HOST", "127.0.0.1")
OPEND_PORT = int(os.environ.get("MOOMOO_PORT", "11111"))
SECURITY_FIRM = os.environ.get("MOOMOO_SECURITY_FIRM", "N/A")

mcp = FastMCP("moomoo-openapi-stub")


def open_quote_context() -> ft.OpenQuoteContext:
    """Quote API 用 context を生成する。"""
    return ft.OpenQuoteContext(host=OPEND_HOST, port=OPEND_PORT)


def open_trade_context() -> ft.OpenSecTradeContext:
    """Trade API 用 context を生成する。"""
    return ft.OpenSecTradeContext(
        filter_trdmarket=ft.TrdMarket.US,
        host=OPEND_HOST,
        port=OPEND_PORT,
        security_firm=SECURITY_FIRM,
    )


@mcp.tool()
def moomoo_health_check() -> dict:
    """OpenD 接続状態を返す。"""
    quote_ctx = open_quote_context()
    try:
        ret, data = quote_ctx.get_global_state()
        if ret != ft.RET_OK:
            raise RuntimeError(str(data))
        return {"status": "ok", "data": str(data)}
    finally:
        quote_ctx.close()


@mcp.tool()
def moomoo_snapshot(symbols: list[str]) -> list[dict]:
    """複数銘柄の snapshot を返す。"""
    quote_ctx = open_quote_context()
    try:
        ret, data = quote_ctx.get_market_snapshot(symbols)
        if ret != ft.RET_OK:
            raise RuntimeError(str(data))
        return data.to_dict(orient="records")
    finally:
        quote_ctx.close()


@mcp.tool()
def moomoo_positions() -> list[dict]:
    """SIMULATE 口座のポジション一覧を返す。"""
    trade_ctx = open_trade_context()
    try:
        ret, data = trade_ctx.position_list_query(trd_env=ft.TrdEnv.SIMULATE)
        if ret != ft.RET_OK:
            raise RuntimeError(str(data))
        return data.to_dict(orient="records")
    finally:
        trade_ctx.close()


@mcp.tool()
def moomoo_place_paper_buy(symbol: str, quantity: float) -> list[dict]:
    """SIMULATE で market buy を出す。"""
    trade_ctx = open_trade_context()
    try:
        ret, data = trade_ctx.place_order(
            price=0,
            qty=quantity,
            code=symbol,
            trd_side=ft.TrdSide.BUY,
            order_type=ft.OrderType.MARKET,
            trd_env=ft.TrdEnv.SIMULATE,
        )
        if ret != ft.RET_OK:
            raise RuntimeError(str(data))
        return data.to_dict(orient="records")
    finally:
        trade_ctx.close()


if __name__ == "__main__":
    mcp.run()
