# Preset-Driven CLI Backtest Path

**Date:** 2026-04-06 13:29
**Status:** Active

## Goal

Add `node src/cli/index.js backtest preset <preset-id> --symbol NVDA` CLI path.
Preserve existing `backtest nvda-ma` behavior unchanged.

## Files to Change

| File | Action | Description |
|---|---|---|
| `src/core/backtest.js` | Modify | Extract common orchestration into `runPresetBacktest({ presetId, symbol })`, make `runNvdaMaBacktest()` a thin wrapper |
| `src/core/index.js` | Modify | Re-export `runPresetBacktest` and `loadPreset` |
| `src/cli/commands/backtest.js` | Modify | Add `preset` subcommand with `--symbol` option |
| `tests/backtest.test.js` | Modify | Add tests for `loadPreset` and `runPresetBacktest` argument validation |
| `config/backtest/strategy-presets.json` | Read only | Update `execution_context.current_repo_cli` from `fixed_nvda_ma_only` to `preset_capable` |

## Out of Scope

- New builders or presets
- Changes to research-backtest.js Pine builder logic
- E2E test changes
- README changes (CLI help is self-documenting)

## Implementation Steps

- [ ] **RED**: Add failing tests for `loadPreset` and preset backtest argument validation
- [ ] **GREEN**: Implement `loadPreset` and `runPresetBacktest` in `src/core/backtest.js`
- [ ] **GREEN**: Wire up `preset` subcommand in CLI
- [ ] **GREEN**: Update `src/core/index.js` exports
- [ ] **REFACTOR**: Make `runNvdaMaBacktest` a thin wrapper around `runPresetBacktest`
- [ ] Run `npm test` to validate all tests pass
- [ ] Update `strategy-presets.json` execution_context
- [ ] Worker verification (if environment allows)

## Validation

```bash
npm test
```

## Risks

- `runNvdaMaBacktest` refactor must preserve exact same behavior (STRATEGY_TITLE used in strategy attachment verification)
- Preset-driven path uses `buildResearchStrategySource` which has different Pine structure than `buildNvdaMaSource`
