# EPS growth provider gap investigation

Date: 2026-06-01

## Question

Can TradingView `earnings_per_share_diluted_yoy_growth_ttm` and moomoo `EPS_GROWTH_RATE` be mixed as one `EPS YoY` column?

## Short answer

Not safely.

- TradingView's field is a **diluted EPS TTM YoY** metric.
- Our moomoo fallback currently requests **`EPS_GROWTH_RATE` with `quarter: 'ANNUAL'`**.
- Live comparisons on the same symbols show large divergences and asymmetric nullability, so this is not just a transport fallback.

## Current repo behavior

`src/core/moomoo.js` requests `EPS_GROWTH_RATE` as an annual financial filter field:

```js
{
  type: 'financial',
  field: 'EPS_GROWTH_RATE',
  min: -100000,
  max: 100000,
  quarter: 'ANNUAL',
}
```

`src/core/fundamental-screener.js` then fills TradingView nulls with the moomoo value:

```js
epsGrowthTtm: row.epsGrowthTtm ?? metrics.earningsGrowthPct ?? null
```

That means the report label `EPS YoY` currently mixes:

- TradingView `diluted EPS TTM YoY`
- moomoo `annual EPS YoY`

## Official definition check

### TradingView

TradingView help for "EPS diluted growth %" says the **TTM YoY** variant compares diluted EPS for the latest trailing-twelve-month period against the TTM period one year earlier.

### moomoo

Moomoo OpenAPI documents `EPS_GROWTH_RATE` as **"Year-on-year growth rate of EPS"** / `EPS 前年比成長率`.

The field description itself does not say "diluted" and our repo explicitly requests it with `quarter: 'ANNUAL'`.

## Live evidence

Using `MOOMOO_HOST=172.31.144.1` and `MOOMOO_PORT=11112` on 2026-06-01:

| Symbol | TradingView `earnings_per_share_diluted_yoy_growth_ttm` | moomoo `EPS_GROWTH_RATE` | Note |
| --- | ---: | ---: | --- |
| `SNDK` | `null` | `-144.492%` | Reported negative value comes from moomoo fallback, not TradingView |
| `MU` | `409.1169%` | `992.857%` | Same symbol, both non-null, but magnitude differs sharply |
| `QCOM` | `-6.3809%` | `-44.444%` | Direction matches, scale differs sharply |
| `ADEA` | `61.8384%` | `null` | TradingView has a value while moomoo does not |

## Interpretation

The mismatch is strong enough that the current fallback should be treated as a **semantic substitution**, not a same-field backfill.

Likely causes include one or more of:

- TTM vs annual period mismatch
- diluted EPS vs generic EPS mismatch
- provider-specific handling when prior-period EPS is very small or negative
- different fiscal-period alignment rules

## Practical conclusion

Until equivalence is proven, we should avoid silently mixing these two values into one `EPS YoY` column.

Safer options are:

- keep TradingView as the only source for `EPS YoY` and leave missing values as `N/A`
- or display moomoo values in a separate field / separate source tag
- or annotate the column with source provenance per symbol
