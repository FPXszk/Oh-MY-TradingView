# Strongest family overlay ablation

- status: CURRENT / READY FOR RUN
- scope: `strongest-overlay-us-12x9`, `strongest-overlay-jp-12x9`, optional `strongest-overlay-{us,jp}-50x9`
- method: one-axis overlay ablation on the strongest Donchian deep-pullback tight family

## Question

Does `Chandelier Exit` or `ATR Trailing Stop` improve the strongest family relative to the pure base when all other axes stay fixed?

## Fixed axes

- regime filter: `RSP > SMA200`
- RSI regime: `RSI14 > 55`
- stop loss: `8% hard stop`
- family line: Donchian deep-pullback tight
- universes:
  - focused: `next-long-run-us-12`, `next-long-run-jp-12`
  - broader: `long-run-us-50`, `long-run-jp-50`

## Variable axis

- `exit_overlay`
  - none
  - chandelier
  - atr-trailing

## Important control correction

The live preset `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` currently uses `entry_period=57`, while its overlay variants use `entry_period=55`.

To keep the overlay tranche one-axis-only, this study adds the retired research control:

- `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-true-55-20-control`

## Cohort

| anchor | none | chandelier | atr |
| --- | --- | --- | --- |
| 55/18 tight | `...exit-tight` | `...exit-tight-profit-protect-chandelier` | `...exit-tight-profit-protect-atr-trailing` |
| 55/20 tight | `...true-55-20-control` | `...tight-profit-protect-chandelier` | `...tight-profit-protect-atr-trailing` |
| 55/22 wide | `...exit-wide` | `...exit-wide-profit-protect-chandelier` | `...exit-wide-profit-protect-atr-trailing` |

## Planned artifact targets

### Focused

- `artifacts/campaigns/strongest-overlay-us-12x9/<phase>/final-results.json`
- `artifacts/campaigns/strongest-overlay-us-12x9/<phase>/recovered-results.json`
- `artifacts/campaigns/strongest-overlay-jp-12x9/<phase>/final-results.json`
- `artifacts/campaigns/strongest-overlay-jp-12x9/<phase>/recovered-results.json`

### Broader

- `artifacts/campaigns/strongest-overlay-us-50x9/<phase>/final-results.json`
- `artifacts/campaigns/strongest-overlay-us-50x9/<phase>/recovered-results.json`
- `artifacts/campaigns/strongest-overlay-jp-50x9/<phase>/final-results.json`
- `artifacts/campaigns/strongest-overlay-jp-50x9/<phase>/recovered-results.json`

### Durable comparison outputs

- `references/backtests/strongest-overlay-us-12x9-<phase>_YYYYMMDD_HHMM.json`
- `references/backtests/strongest-overlay-us-12x9-<phase>_YYYYMMDD_HHMM.summary.json`
- `references/backtests/strongest-overlay-jp-12x9-<phase>_YYYYMMDD_HHMM.json`
- `references/backtests/strongest-overlay-jp-12x9-<phase>_YYYYMMDD_HHMM.summary.json`

## Comparison template

For each market and phase, compare these standard metrics in the same order:

1. `net_profit`
2. `profit_factor`
3. `max_drawdown`
4. `percent_profitable`
5. `closed_trades`
6. `best_symbol`

## Interpretation rule

- Prefer winners that improve `profit_factor` and/or reduce `max_drawdown` **without collapsing net profit**.
- If a result is carried by one dominant `best_symbol`, mark it as **focused-only / not yet robust**.
- Promote to broader only when the focused read is not obviously single-symbol-dependent.

## Result table placeholder

| market | phase | anchor | variant | net_profit | profit_factor | max_drawdown | percent_profitable | closed_trades | best_symbol | read |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| US | smoke | 55/18 | none | — | — | — | — | — | — | pending |

## Adoption / reject placeholder

- adopted overlay:
- rejected overlay:
- still ambiguous:

## Next question

If overlay contribution is isolated, the next queued tranche is `FTD necessity`, then `exit 18/20/22`, then `strict entry timing`, then `regime 55/60`.
