# Moomoo read-only portfolio diagnostics session log

Date: 2026-05-16

## Summary

Moomoo account visibility was added as read-only MCP tooling. The implementation intentionally does not add or call order placement, order modification, order cancellation, or trade unlock methods.

## User request

- Build the previously discussed read-only portfolio diagnostics tooling.
- Add read-only MCP tools for:
  - `moomoo_accounts`
  - `moomoo_positions`
  - `moomoo_balance`
  - `moomoo_orders`
  - `moomoo_deals`
- Start from portfolio diagnostics.
- Keep trading strictly prohibited.

## Commits

- `c0d6498 docs:moomoo-readonly-portfolio-diagnostics_20260516_2328`
- `897be7f feat: add moomoo read-only portfolio diagnostics`

Both commits were pushed to `origin/main`.

## What changed

- Added read-only trade/account commands to `python/moomoo_adapter.py`:
  - `accounts`
  - `positions`
  - `balance`
  - `orders`
  - `deals`
- Added core functions in `src/core/moomoo.js`:
  - `getMoomooAccounts`
  - `getMoomooPositions`
  - `getMoomooBalance`
  - `getMoomooOrders`
  - `getMoomooDeals`
  - `getMoomooPortfolioDiagnostics`
- Added MCP tools in `src/tools/moomoo.js`:
  - `moomoo_accounts`
  - `moomoo_positions`
  - `moomoo_balance`
  - `moomoo_orders`
  - `moomoo_deals`
  - `moomoo_portfolio`
- Updated `src/server.js` tool instructions.
- Updated Moomoo docs:
  - `docs/strategy/moomoo/README.md`
  - `docs/strategy/moomoo/03_mcp_integration.md`
- Moved the exec plan to:
  - `docs/exec-plans/completed/moomoo-readonly-portfolio-diagnostics_20260516_2328.md`

## Safety notes

- No order methods were added:
  - no `place_order`
  - no `modify_order`
  - no `change_order`
  - no `unlock_trade`
- Account card fields are stripped from adapter output:
  - `card_num`
  - `uni_card_num`
- Account IDs are returned as strings to avoid JavaScript integer precision loss.

## Portfolio diagnostic behavior

`moomoo_portfolio` reads accounts, positions, and balances, then returns:

- total assets
- cash
- market value
- unrealized P/L
- cash ratio
- invested ratio
- position count
- per-position weight
- market / currency / side breakdown

By default, portfolio totals prefer REAL accounts and exclude SIMULATE accounts unless explicitly requested.

## Live smoke result

Environment:

```bash
MOOMOO_HOST=172.31.144.1
MOOMOO_PORT=11112
```

Read-only portfolio diagnostics returned:

```json
{
  "success": true,
  "readOnly": true,
  "accountCount": 1,
  "realAccountCount": 1,
  "positionCount": 3,
  "totalAssets": 14829.58,
  "cashRatioPct": 72.39,
  "investedRatioPct": 27.61,
  "symbols": ["US.ASTS", "US.SIL", "US.GDX"]
}
```

## Validation

Targeted tests:

```bash
node --test tests/moomoo.test.js
```

Result:

- 28 tests passed
- 0 failed

Full unit suite:

```bash
npm test
```

Result:

- 979 tests passed
- 0 failed

Other checks:

```bash
git diff --check
```

Result:

- clean

## Remaining work / notes

- Existing dirty file intentionally left untouched:
  - `docs/exec-plans/completed/moomoo-phase2-screening-validation_20260514_1107.md`
- Possible next step: add a scheduled or CLI-generated daily portfolio report using `moomoo_portfolio`, without enabling any trade operation.
