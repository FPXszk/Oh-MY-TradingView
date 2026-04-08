# Next long-run market-matched 200 results

- status: COMPLETED
- method: worker1 single-worker execution -> recovered artifacts

## Artifacts

### US entry sweep 100x3

- smoke:
  - `docs/references/backtests/long-run-us-entry-sweep-100x3-smoke-recovered_20260409_0643.json`
  - `docs/references/backtests/long-run-us-entry-sweep-100x3-smoke-recovered_20260409_0643.summary.json`
- pilot:
  - `docs/references/backtests/long-run-us-entry-sweep-100x3-pilot-recovered_20260409_0643.json`
  - `docs/references/backtests/long-run-us-entry-sweep-100x3-pilot-recovered_20260409_0643.summary.json`
- full:
  - `docs/references/backtests/long-run-us-entry-sweep-100x3-full-recovered_20260409_0643.json`
  - `docs/references/backtests/long-run-us-entry-sweep-100x3-full-recovered_20260409_0643.summary.json`

### JP exit sweep 100x3

- smoke:
  - `docs/references/backtests/long-run-jp-exit-sweep-100x3-smoke-recovered_20260409_0643.json`
  - `docs/references/backtests/long-run-jp-exit-sweep-100x3-smoke-recovered_20260409_0643.summary.json`
- pilot:
  - `docs/references/backtests/long-run-jp-exit-sweep-100x3-pilot-recovered_20260409_0643.json`
  - `docs/references/backtests/long-run-jp-exit-sweep-100x3-pilot-recovered_20260409_0643.summary.json`
- full:
  - `docs/references/backtests/long-run-jp-exit-sweep-100x3-full-recovered_20260409_0643.json`
  - `docs/references/backtests/long-run-jp-exit-sweep-100x3-full-recovered_20260409_0643.summary.json`

## Phase summary

| campaign | smoke | pilot | full | date range |
| --- | ---: | ---: | ---: | --- |
| `long-run-us-entry-sweep-100x3` | `30/30` | `75/75` | `300/300` | `2000-01-01 -> latest` |
| `long-run-jp-exit-sweep-100x3` | `30/30` | `75/75` | `300/300` | `2000-01-01 -> latest` |

## US full detail

| preset | avg net profit | avg profit factor | wins | top symbols |
| --- | ---: | ---: | ---: | --- |
| `50-20 strict-entry-early` | 9741.65 | 1.438 | 75 | `NVDA`, `AAPL`, `META`, `BLK`, `GS` |
| `55-20 strict` | 8652.78 | 1.378 | 72 | `NVDA`, `AAPL`, `META`, `BLK`, `CAT` |
| `60-20 strict-entry-late` | 8489.42 | 1.444 | 79 | `NVDA`, `AAPL`, `META`, `BLK`, `CI` |

### US read

- avg net では `50-20 strict-entry-early` が首位
- PF / wins では `60-20 strict-entry-late` が最良
- `55-20 strict` は 100-symbol 拡張後も 2 variant に対して見劣りした
- dominant winners は `NVDA`, `AAPL`, `META`, `BLK` で、次段では bucket ごとの寄与分解が必要

## JP full detail

| preset | avg net profit | avg profit factor | wins | top symbols |
| --- | ---: | ---: | ---: | --- |
| `55-20 tight` | 8548.16 | 1.668 | 75 | `TSE:8002`, `TSE:9984`, `TSE:5802`, `TSE:6506`, `TSE:9107` |
| `55-18 tight-exit-tight` | 8105.93 | 2.332 | 75 | `TSE:8002`, `TSE:6506`, `TSE:8058`, `TSE:6501`, `TSE:8306` |
| `55-22 tight-exit-wide` | 7693.68 | 1.655 | 73 | `TSE:8002`, `TSE:6857`, `TSE:6506`, `TSE:5802`, `TSE:8058` |

### JP read

- avg net は `55-20 tight` が首位
- `55-18 tight-exit-tight` は PF が 2.332 まで伸び、wins は `55-20` と同数
- `55-22 exit-wide` は avg net / PF ともに優位を取れなかった
- dominant winners は `TSE:8002`, `TSE:6506`, `TSE:9984`, `TSE:5802`, `TSE:8058`

## Final read

1. US は **entry 側の early / late 調整が依然として本線** で、avg net は `50-20 early`、risk-adjusted では `60-20 late`
2. JP は **exit 側の引き締めが効く market** という読みを維持しつつ、100 symbols では avg net の `55-20 tight` も無視できない
3. 今回の live execution では smoke / pilot / full の全 phase で unreadable 0 を維持し、**600/600** を回収できた
4. operational blocker は worker2 の distinct parallel smoke 安定化であり、next step までは worker1 single-worker が known-good
