# Session log: dual-worker distinct strategy backtest trial

## Goal

- Add the smallest repo CLI path that can run different strategy presets on worker1 and worker2
- Verify whether the recovered dual-worker environment can execute two different backtests

## Implementation

- Added CLI subcommand:
  - `tv backtest preset <preset-id> --symbol <symbol>`
- Added preset loading in `src/core/backtest.js`
  - reads `config/backtest/strategy-presets.json`
  - validates the preset
  - rejects presets that the current generator cannot build
- Added `runPresetBacktest()` using the existing backtest orchestration path
- Fixed study-limit recovery so preset runs use the correct strategy title

## Validation

- `npm test`
  - passed
  - total: `198`

## Worker checks

### worker1

- endpoint:
  - `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223`
- command:

```bash
node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA
```

- result:
  - success
  - `tester_available: true`
  - `apply_failed: false`
  - metrics:
    - `net_profit: 89721.99`
    - `closed_trades: 25`
    - `percent_profitable: 40`
    - `profit_factor: 2.2900946024427`
    - `max_drawdown: 56232.95`

### worker2

- endpoint:
  - `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225`
- preset command:

```bash
node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA
```

- result:
  - compile success
  - `study_added: false`
  - `tester_available: false`
  - `apply_failed: true`
  - `apply_reason: "Strategy not verified in chart studies after compile + retry"`

### worker2 baseline cross-check

- command:

```bash
node src/cli/index.js backtest nvda-ma
```

- result:
  - same attach failure pattern as preset path
  - compile success
  - `study_added: false`
  - `apply_failed: true`

## Conclusion

- Repo-side support for distinct strategy backtests is now in place
- worker1 can execute a preset-driven backtest successfully
- worker2 still fails at TradingView strategy attachment even on the legacy `nvda-ma` path
- Therefore the remaining blocker is currently treated as **TradingView UI / worker state**, not the new repo CLI implementation
