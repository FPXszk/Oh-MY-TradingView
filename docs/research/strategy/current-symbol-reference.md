# Current symbol reference

このファイルは **銘柄側から戦略を見るための入口** です。current config 上の campaign / universe と、上記 artifact で観測できた best strategy をまとめます。

- US campaign: `next-long-run-us-12x10` / universe: `next-long-run-us-12`
- JP campaign: `next-long-run-jp-12x10` / universe: `next-long-run-jp-12`
- score artifact (US): `artifacts/campaigns/next-long-run-us-finetune-100x10/smoke/recovered-results.json`
- score artifact (JP): `artifacts/campaigns/next-long-run-jp-finetune-100x10/smoke/recovered-results.json`
- note: campaign / universe は current config、score 列は上記 artifact に含まれる銘柄だけ埋まります。

## US current universe

| symbol | label | bucket | latest best strategy | avg net | avg PF | avg MDD | campaign period |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| `NVDA` | NVIDIA | winners | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `AAPL` | Apple | winners | `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow` | 129359.65 | 3.0595 | 23392.98 | 2000-01-01 -> 2099-12-31 |
| `META` | Meta Platforms | winners | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `MSFT` | Microsoft | winners | `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` | 15580.38 | 1.9466 | 4591.57 | 2000-01-01 -> 2099-12-31 |
| `DIS` | Walt Disney | mature-range | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `QCOM` | Qualcomm | mature-range | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `CAT` | Caterpillar | mature-range | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `XOM` | Exxon Mobil | mature-range | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback` | 2583.33 | 1.2383 | 3248.97 | 2000-01-01 -> 2099-12-31 |
| `INTC` | Intel | defense-test | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `VZ` | Verizon | defense-test | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `PFE` | Pfizer | defense-test | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `T` | AT&T | defense-test | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |

## JP current universe

| symbol | label | bucket | latest best strategy | avg net | avg PF | avg MDD | campaign period |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| `TSE:7203` | Toyota Motor | winners | `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late` | 12587.40 | 1.7357 | 7389.40 | 2000-01-01 -> 2099-12-31 |
| `TSE:8002` | Marubeni | winners | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `TSE:5802` | Sumitomo Electric Industries | winners | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `TSE:8058` | Mitsubishi Corp. | winners | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `TSE:9984` | SoftBank Group | mature-range | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | 39355.80 | 2.1759 | 14802.80 | 2000-01-01 -> 2099-12-31 |
| `TSE:6857` | Advantest | mature-range | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `TSE:9107` | Kawasaki Kisen Kaisha | mature-range | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `TSE:6506` | Yaskawa Electric | mature-range | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `TSE:7201` | Nissan Motor | defense-test | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `TSE:4503` | Astellas Pharma | defense-test | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
| `TSE:9432` | NTT | defense-test | `donchian-60-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-late` | -3165.51 | 0.6577 | 3769.98 | 2000-01-01 -> 2099-12-31 |
| `TSE:7751` | Canon | defense-test | `—` | — | — | — | 2000-01-01 -> 2099-12-31 |
