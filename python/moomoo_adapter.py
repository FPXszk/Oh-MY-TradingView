#!/usr/bin/env python3
"""Minimal JSON adapter for moomoo OpenAPI read-only Phase 1 tools."""

from __future__ import annotations

import json
import math
import sys
from dataclasses import asdict, is_dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any, NoReturn

try:
    import moomoo as ft
except ImportError as exc:  # pragma: no cover - runtime integration guard
    print(
        json.dumps(
            {
                "success": False,
                "error": "moomoo-api is not installed. Run `pip install moomoo-api` in the runtime used by this MCP server.",
                "details": str(exc),
            }
        ),
        file=sys.stderr,
    )
    raise SystemExit(2) from exc


def fail(message: str, details: str | None = None, exit_code: int = 1) -> "NoReturn":
    payload = {"success": False, "error": message}
    if details:
        payload["details"] = details
    print(json.dumps(payload), file=sys.stderr)
    raise SystemExit(exit_code)


def normalize_scalar(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        if isinstance(value, float) and not math.isfinite(value):
            return None
        return value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return None


def normalize_object(value: Any) -> Any:
    scalar = normalize_scalar(value)
    if scalar is not None or value is None:
        return scalar

    if isinstance(value, dict):
        return {str(key): normalize_object(item) for key, item in value.items()}

    if isinstance(value, (list, tuple)):
        return [normalize_object(item) for item in value]

    if is_dataclass(value):
        return normalize_object(asdict(value))

    to_dict = getattr(value, "to_dict", None)
    if callable(to_dict):
        try:
            if value.__class__.__name__ == "DataFrame":
                return normalize_object(value.to_dict(orient="records"))
            return normalize_object(to_dict())
        except TypeError:
            pass

    if hasattr(value, "__dict__"):
        public = {
            key: normalize_object(item)
            for key, item in vars(value).items()
            if not key.startswith("_")
        }
        if public:
            return public

    public_attrs: dict[str, Any] = {}
    for key in dir(value):
        if key.startswith("_"):
            continue
        try:
            item = getattr(value, key)
        except Exception:
            continue
        if callable(item):
            continue
        normalized = normalize_scalar(item)
        if normalized is not None or item is None:
            public_attrs[key] = normalized
    if public_attrs:
        return public_attrs

    return str(value)


def load_payload() -> dict[str, Any]:
    if len(sys.argv) < 3:
        fail("adapter requires a command and JSON payload")
    try:
        payload = json.loads(sys.argv[2])
    except json.JSONDecodeError as exc:
        fail("invalid JSON payload", str(exc))
    if not isinstance(payload, dict):
        fail("payload must decode to an object")
    return payload


def open_quote_context(payload: dict[str, Any]):
    host = payload.get("host", "127.0.0.1")
    port = int(payload.get("port", 11111))
    return ft.OpenQuoteContext(host=host, port=port)


def get_enum(enum_group: Any, name: str, label: str):
    try:
        return getattr(enum_group, str(name).upper())
    except AttributeError as exc:
        fail(f"unsupported {label}: {name}", str(exc))


def build_stock_filters(payload: dict[str, Any]) -> list[Any]:
    filters: list[Any] = []

    if payload.get("min_price") is not None:
        price_filter = ft.SimpleFilter()
        price_filter.stock_field = ft.StockField.CUR_PRICE
        price_filter.filter_min = float(payload["min_price"])
        price_filter.sort = ft.SortDir.DESCEND
        filters.append(price_filter)

    if payload.get("min_market_cap") is not None:
        market_cap_filter = ft.SimpleFilter()
        market_cap_filter.stock_field = ft.StockField.MARKET_VAL
        market_cap_filter.filter_min = float(payload["min_market_cap"])
        filters.append(market_cap_filter)

    if payload.get("pe_min") is not None or payload.get("pe_max") is not None:
        pe_filter = ft.FinancialFilter()
        pe_filter.stock_field = ft.StockField.PE_TTM
        if payload.get("pe_min") is not None:
            pe_filter.filter_min = float(payload["pe_min"])
        if payload.get("pe_max") is not None:
            pe_filter.filter_max = float(payload["pe_max"])
        pe_filter.quarter = ft.FinancialQuarter.ANNUAL
        filters.append(pe_filter)

    return filters


def cmd_health_check(payload: dict[str, Any]) -> dict[str, Any]:
    quote_ctx = open_quote_context(payload)
    try:
        ret, data = quote_ctx.get_global_state()
        if ret != ft.RET_OK:
            fail("get_global_state failed", str(data))
        return {"success": True, "state": normalize_object(data)}
    finally:
        quote_ctx.close()


def cmd_snapshot(payload: dict[str, Any]) -> dict[str, Any]:
    symbols = payload.get("symbols")
    if not isinstance(symbols, list) or not symbols:
        fail("symbols must be a non-empty list")

    quote_ctx = open_quote_context(payload)
    try:
        ret, data = quote_ctx.get_market_snapshot(symbols)
        if ret != ft.RET_OK:
            fail("get_market_snapshot failed", str(data))
        rows = normalize_object(data)
        return {"success": True, "symbols": symbols, "count": len(rows), "rows": rows}
    finally:
        quote_ctx.close()


def cmd_kline_history(payload: dict[str, Any]) -> dict[str, Any]:
    symbol = payload.get("symbol")
    if not isinstance(symbol, str) or not symbol.strip():
        fail("symbol is required")

    quote_ctx = open_quote_context(payload)
    try:
        ret, data, page_req_key = quote_ctx.request_history_kline(
            symbol.strip(),
            start=payload.get("start"),
            end=payload.get("end"),
            ktype=payload.get("ktype", "K_DAY"),
            autype=payload.get("autype", "qfq"),
            max_count=int(payload.get("max_count", 100)),
            page_req_key=payload.get("page_req_key"),
            extended_time=bool(payload.get("extended_time", False)),
        )
        if ret != ft.RET_OK:
            fail("request_history_kline failed", str(data))
        rows = normalize_object(data)
        return {
            "success": True,
            "symbol": symbol.strip(),
            "ktype": payload.get("ktype", "K_DAY"),
            "autype": payload.get("autype", "qfq"),
            "page_req_key": page_req_key,
            "count": len(rows),
            "rows": rows,
        }
    finally:
        quote_ctx.close()


def cmd_stock_filter(payload: dict[str, Any]) -> dict[str, Any]:
    market_name = payload.get("market")
    if not isinstance(market_name, str) or not market_name.strip():
        fail("market is required")

    filters = build_stock_filters(payload)
    quote_ctx = open_quote_context(payload)
    try:
        ret, data = quote_ctx.get_stock_filter(
            get_enum(ft.Market, market_name, "market"),
            filter_list=filters,
            begin=int(payload.get("begin", 0)),
            num=int(payload.get("limit", 20)),
        )
        if ret != ft.RET_OK:
            fail("get_stock_filter failed", str(data))
        last_page, all_count, stock_list = data
        rows = normalize_object(stock_list)
        return {
            "success": True,
            "market": market_name.upper(),
            "last_page": bool(last_page),
            "all_count": int(all_count),
            "count": len(rows),
            "rows": rows,
        }
    finally:
        quote_ctx.close()


def cmd_plate_list(payload: dict[str, Any]) -> dict[str, Any]:
    market_name = payload.get("market")
    if not isinstance(market_name, str) or not market_name.strip():
        fail("market is required")
    plate_class_name = str(payload.get("plate_class", "ALL"))

    quote_ctx = open_quote_context(payload)
    try:
        ret, data = quote_ctx.get_plate_list(
            get_enum(ft.Market, market_name, "market"),
            get_enum(ft.Plate, plate_class_name, "plate_class"),
        )
        if ret != ft.RET_OK:
            fail("get_plate_list failed", str(data))
        rows = normalize_object(data)
        return {
            "success": True,
            "market": market_name.upper(),
            "plate_class": plate_class_name.upper(),
            "count": len(rows),
            "rows": rows,
        }
    finally:
        quote_ctx.close()


def cmd_plate_stocks(payload: dict[str, Any]) -> dict[str, Any]:
    plate_code = payload.get("plate_code")
    if not isinstance(plate_code, str) or not plate_code.strip():
        fail("plate_code is required")

    quote_ctx = open_quote_context(payload)
    try:
        ret, data = quote_ctx.get_plate_stock(
            plate_code.strip(),
            sort_field=str(payload.get("sort_field", "CODE")),
            ascend=bool(payload.get("ascend", True)),
        )
        if ret != ft.RET_OK:
            fail("get_plate_stock failed", str(data))
        rows = normalize_object(data)
        return {
            "success": True,
            "plate_code": plate_code.strip(),
            "count": len(rows),
            "rows": rows,
        }
    finally:
        quote_ctx.close()


COMMANDS = {
    "health_check": cmd_health_check,
    "snapshot": cmd_snapshot,
    "kline_history": cmd_kline_history,
    "stock_filter": cmd_stock_filter,
    "plate_list": cmd_plate_list,
    "plate_stocks": cmd_plate_stocks,
}


def main() -> None:
    command = sys.argv[1] if len(sys.argv) > 1 else None
    if command not in COMMANDS:
        fail(f"unsupported command: {command}")
    payload = load_payload()
    result = COMMANDS[command](payload)
    print(json.dumps(normalize_object(result)))


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:  # pragma: no cover - runtime integration guard
        fail("unexpected adapter failure", str(exc))
