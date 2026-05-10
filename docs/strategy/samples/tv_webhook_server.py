"""TradingView alert を受けて moomoo paper order を流す FastAPI sample。"""

import os
import traceback
from typing import Optional

import moomoo as ft

try:
    from fastapi import FastAPI, Header, HTTPException
    from pydantic import BaseModel
except ImportError as exc:  # pragma: no cover - sample guidance only
    raise ImportError(
        "fastapi / pydantic が必要です。例: pip install fastapi uvicorn"
    ) from exc

# OpenD 接続設定と Webhook 保護用シークレット。
OPEND_HOST = os.environ.get("MOOMOO_HOST", "127.0.0.1")
OPEND_PORT = int(os.environ.get("MOOMOO_PORT", "11111"))
SECURITY_FIRM = os.environ.get("MOOMOO_SECURITY_FIRM", "N/A")
WEBHOOK_SECRET = os.environ.get("TV_WEBHOOK_SECRET", "change-me")
DEFAULT_MARKET = os.environ.get("MOOMOO_DEFAULT_MARKET", "US")

app = FastAPI(title="TradingView to moomoo webhook sample")


class AlertPayload(BaseModel):
    """TradingView 側から受ける最小 payload。"""

    symbol: str
    side: str
    quantity: float
    order_type: str = "MARKET"
    price: Optional[float] = 0
    note: Optional[str] = None


def normalize_symbol(symbol: str) -> str:
    """市場 prefix が無ければデフォルト市場を補う。"""
    if "." in symbol:
        return symbol
    return f"{DEFAULT_MARKET}.{symbol}"


def place_paper_order(payload: AlertPayload):
    """SIMULATE 専用で paper order を発行する。"""
    trade_ctx = None
    try:
        trade_ctx = ft.OpenSecTradeContext(
            filter_trdmarket=ft.TrdMarket.US,
            host=OPEND_HOST,
            port=OPEND_PORT,
            security_firm=SECURITY_FIRM,
        )
        trd_side = ft.TrdSide.BUY if payload.side.lower() == "buy" else ft.TrdSide.SELL
        order_type = ft.OrderType.MARKET if payload.order_type.upper() == "MARKET" else ft.OrderType.NORMAL

        ret, data = trade_ctx.place_order(
            price=payload.price or 0,
            qty=payload.quantity,
            code=normalize_symbol(payload.symbol),
            trd_side=trd_side,
            order_type=order_type,
            trd_env=ft.TrdEnv.SIMULATE,
            remark=payload.note,
        )
        if ret != ft.RET_OK:
            raise RuntimeError(f"place_order failed: {data}")
        return data.to_dict(orient="records")
    finally:
        if trade_ctx is not None:
            trade_ctx.close()


@app.post("/webhook")
def webhook(payload: AlertPayload, x_tv_secret: str = Header(default="")):
    """シークレット一致時だけ SIMULATE 注文を流す。"""
    if x_tv_secret != WEBHOOK_SECRET:
        raise HTTPException(status_code=401, detail="invalid secret")

    try:
        result = place_paper_order(payload)
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"status": "ok", "result": result}
