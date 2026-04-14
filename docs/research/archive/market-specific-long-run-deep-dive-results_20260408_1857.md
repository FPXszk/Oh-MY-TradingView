# Market-specific long-run deep dive results

- status: COMPLETED
- method: worker1 single-worker execution -> recovered artifacts

## Artifacts

### US entry sweep

- smoke:
  - `docs/references/backtests/long-run-us-entry-sweep-50x3-smoke-recovered_20260408_1857.json`
  - `docs/references/backtests/long-run-us-entry-sweep-50x3-smoke-recovered_20260408_1857.summary.json`
- pilot:
  - `docs/references/backtests/long-run-us-entry-sweep-50x3-pilot-recovered_20260408_1857.json`
  - `docs/references/backtests/long-run-us-entry-sweep-50x3-pilot-recovered_20260408_1857.summary.json`
- full:
  - `docs/references/backtests/long-run-us-entry-sweep-50x3-full-recovered_20260408_1857.json`
  - `docs/references/backtests/long-run-us-entry-sweep-50x3-full-recovered_20260408_1857.summary.json`

### JP exit sweep

- smoke:
  - `docs/references/backtests/long-run-jp-exit-sweep-50x3-smoke-recovered_20260408_1857.json`
  - `docs/references/backtests/long-run-jp-exit-sweep-50x3-smoke-recovered_20260408_1857.summary.json`
- pilot:
  - `docs/references/backtests/long-run-jp-exit-sweep-50x3-pilot-recovered_20260408_1857.json`
  - `docs/references/backtests/long-run-jp-exit-sweep-50x3-pilot-recovered_20260408_1857.summary.json`
- full:
  - `docs/references/backtests/long-run-jp-exit-sweep-50x3-full-recovered_20260408_1857.json`
  - `docs/references/backtests/long-run-jp-exit-sweep-50x3-full-recovered_20260408_1857.summary.json`

## Phase summary

| campaign | smoke | pilot | full | date range |
| --- | ---: | ---: | ---: | --- |
| `long-run-us-entry-sweep-50x3` | `30/30` | `75/75` | `150/150` | `2000-01-01 -> latest` |
| `long-run-jp-exit-sweep-50x3` | `30/30` | `75/75` | `150/150` | `2000-01-01 -> latest` |

## US full detail

| preset | avg net profit | avg profit factor | wins | top symbols |
| --- | ---: | ---: | ---: | --- |
| `50-20 strict-entry-early` | 7132.97 | 1.380 | 36 | `AAPL`, `LMT`, `CAT`, `MSFT`, `DIS` |
| `60-20 strict-entry-late` | 7073.24 | 1.415 | 40 | `AAPL`, `CAT`, `LMT`, `DIS`, `XLK` |
| `55-20 strict` | 6483.03 | 1.328 | 36 | `AAPL`, `CAT`, `XLK`, `LMT`, `MSFT` |

### US read

- avg net では `50-20 strict-entry-early` が首位
- PF / wins では `60-20 strict-entry-late` が最良
- `55-20 strict` は 2 variant に対して素直に見劣りした
- AAPL の寄与が非常に大きいため、次段では **AAPL 非依存の再現性** を確認したい

## JP full detail

| preset | avg net profit | avg profit factor | wins | top symbols |
| --- | ---: | ---: | ---: | --- |
| `55-20 tight` | 9862.73 | 1.961 | 36 | `TSE:8002`, `TSE:9984`, `TSE:6501`, `TSE:8058`, `TSE:8001` |
| `55-18 tight-exit-tight` | 9846.88 | 3.331 | 38 | `TSE:8002`, `TSE:8058`, `TSE:6501`, `TSE:8306`, `TSE:5406` |
| `55-22 tight-exit-wide` | 7750.08 | 1.922 | 37 | `TSE:8002`, `TSE:8058`, `TSE:8001`, `TSE:9984`, `TSE:8306` |

### JP read

- avg net は `55-20 tight` が僅差首位だが、差は 15.85 と実質同点
- `55-18 tight-exit-tight` は PF が 3.331 まで伸び、wins も最多だった
- `55-22 exit-wide` は avg net / PF ともに優位を取れなかった
- `TSE:8002` の寄与が非常に大きいため、次段では **dominant winner の寄与分解** が必要

## Final read

1. US は **entry 側の微調整で勝ち筋が動く market** で、`50-20 early` と `60-20 late` の二強
2. JP は **exit 側の引き締めが効く market** で、risk-adjusted winner は `55-18 exit-tight`
3. 今回の live execution では smoke / pilot / full の全 phase で unreadable 0 を維持できた
4. worker2 なしでも 300/300 を回収できたため、今ラウンドの primary blocker は strategy quality ではなく **次の比較軸の切り方** に移った
