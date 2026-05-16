# Yahoo fundamentals to Moomoo handoff

Date: 2026-05-16

## Summary

Yahoo Finance `quoteSummary` fundamentals remained unavailable during the session:

- `https://query1.finance.yahoo.com/v10/finance/quoteSummary/NVDA?...` returned `401 Unauthorized`
- response body included `Invalid Crumb`
- Yahoo chart endpoints still returned price/OHLC data, so only the failing fundamentals path was replaced

The implemented replacement uses Moomoo OpenAPI for fundamentals / revenue-growth enrichment while keeping Yahoo chart usage for quote, TA, and OHLC benchmark paths.

## Commits

- `927ea3c docs: moomoo-replace-yahoo-fundamentals_20260516_1524`
- `d4cd157 fix: replace yahoo fundamentals with moomoo`

Both commits were pushed to `origin/main`.

## Files changed in implementation

- `src/core/moomoo.js`
  - Added Moomoo fundamentals batch/single-symbol helpers.
  - Uses snapshot plus `get_stock_filter()` with market-cap descending financial filters.
  - Handles unresolved snapshot symbols without dropping stock-filter fundamentals.
  - Retries one invalid-JSON stock-filter adapter response.
- `src/core/market-intel.js`
  - Default `getSymbolFundamentals()` / batch financials now use Moomoo.
  - Yahoo `quoteSummary` remains only behind `OMTV_USE_YAHOO_FUNDAMENTALS=1` for deterministic legacy tests.
- `src/core/fundamental-screener.js`
  - Existing `enrichWithYahoo` option name remains for compatibility.
  - Internal enrichment now uses Moomoo revenue growth.
  - Output source becomes `tradingview_scanner+moomoo`.
- `python/moomoo_adapter.py`
  - Falls back to writable temp `HOME` if the Moomoo SDK log path is read-only.
- `scripts/screener/run-fundamental-screening.mjs`
  - Report text now says `Moomoo 補完`.
- `src/tools/moomoo.js`, `src/tools/screener.js`
  - Tool descriptions updated to remove Yahoo fundamentals wording.
- Tests were updated for Moomoo fundamentals behavior and compatibility hooks.

## Validation

Unit tests:

```bash
timeout 60s node --test tests/moomoo.test.js tests/market-intel.test.js tests/market-intel-analysis.test.js tests/fundamental-screener.test.js tests/daily-screener-report.test.js
```

Result:

- 127 tests passed
- 0 failed

Live Moomoo checks:

```bash
MOOMOO_HOST=172.31.144.1 MOOMOO_PORT=11112 MOOMOO_ADAPTER_TIMEOUT_MS=30000 node scripts/screener/run-fundamental-screening.mjs
```

Result:

- `totalScanned=837`
- `serverFiltered=837`
- `phase1Filtered=837`
- `clientFiltered=530`
- `matched=30`
- report written to `docs/reports/screener/daily-ranking.md`

Additional live enrichment check showed non-null Moomoo revenue growth in the top 30:

- `MU`: `0.48851`
- `DELL`: `0.18804`
- `ADI`: `0.16893`

## Notes

- `docs/exec-plans/completed/moomoo-phase2-screening-validation_20260514_1107.md` was already dirty before this task and was intentionally not included in the implementation commit.
- Moomoo `get_stock_filter()` has a frequency limit: maximum 10 calls per 30 seconds. The implementation keeps fundamentals paging bounded to avoid the live limit in normal screener use.
