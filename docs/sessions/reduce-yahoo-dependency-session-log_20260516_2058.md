# Reduce Yahoo dependency session log

Date: 2026-05-16

## Summary

Yahoo Finance usage was reduced from normal market-data flow and kept only as explicit legacy fallback paths.

The main goal was to avoid Yahoo as much as possible while still keeping compatibility where existing tests or manual legacy checks need it.

## Commits

- `2c5d81d docs:reduce-yahoo-dependency_20260516_2042`
- `426025e refactor: reduce yahoo market data dependency`

Both commits were pushed to `origin/main`.

## What changed

- `market_quote` and `market_snapshot` now use Moomoo snapshot by default.
- `market_ta_summary` and `market_ta_rank` now use Moomoo kline by default.
- Yahoo quote / chart usage is now an opt-in legacy fallback via `OMTV_USE_YAHOO_MARKET_DATA=1`.
- Yahoo news search is disabled by default and only runs with `OMTV_USE_YAHOO_NEWS=1`.
- Moomoo OHLC comparison no longer defaults to Yahoo as benchmark.
- Yahoo OHLC comparison remains available only when `benchmarkProvider: "yahoo_finance"` is explicitly requested.
- Tool descriptions, CLI text, server tool guide, and tests were updated to match the new default behavior.
- `docs/strategy/data-provider-indicator-coverage_20260516.md` now explains what the previous "価格系列・ニュース限定" wording meant.

## Meaning of the Yahoo wording

The previous "価格系列" wording meant OHLCV time-series data:

- open
- high
- low
- close
- volume

Those bars were used for RSI, SMA, returns, and OHLC drift checks. The normal source is now Moomoo `request_history_kline()`.

The previous "ニュース限定" wording meant Yahoo Finance search news fields:

- title
- publisher
- link
- publishedAt

This is no longer part of the normal path. It is disabled unless explicitly enabled.

## Validation

Unit tests:

```bash
timeout 90s node --test tests/market-intel.test.js tests/market-intel-analysis.test.js tests/moomoo.test.js
```

Result:

- 115 tests passed
- 0 failed

Live Moomoo smoke:

```bash
MOOMOO_HOST=172.31.144.1 MOOMOO_PORT=11112 node --input-type=module
```

Checked:

- `getSymbolQuote("NVDA")`
- `getMultiSymbolTaSummary(["NVDA"])`

Result:

- quote source: `moomoo`
- TA source: `moomoo`

## Notes

- Fundamentals were already moved away from Yahoo in the previous session.
- TradingView Scanner remains the main source for cross-sectional screening fundamentals.
- Moomoo is now the default source for quote / TA / kline-based checks.
- Yahoo is retained only as explicit legacy fallback.
- `docs/exec-plans/completed/moomoo-phase2-screening-validation_20260514_1107.md` was already dirty and was intentionally not included.
