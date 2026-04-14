# Session log: mid parallel benchmark / hybrid / partial retry

## Goal

小 sample の次として、`32 run` の中規模 sample で

1. sequential / strategy-aware / shard を再比較する
2. chunk + micro-shard checkpoint の hybrid を試す
3. unreadable 検知時の rollback / partial retry が wall-clock を縮めるかを測る

## Workload

- presets:
  - `ema-cross-9-21`
  - `rsi-mean-reversion`
  - `keltner-breakout`
  - `donchian-55-20-baseline-r5`
- symbols:
  - `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`, `NVDA`, `TSLA`, `JPM`
- total:
  - `32 run`

## Execution order

1. baseline `npm test`
2. mid-size prepare
3. sequential
4. prepare 再実行
5. strategy-aware parallel（2 sub-agents）
6. prepare 再実行
7. shard parallel（2 sub-agents）
8. prepare 再実行
9. hybrid parallel（2 sub-agents）
10. prepare 再実行
11. hybrid partial retry（2 sub-agents）
12. comparison JSON 生成

## Result summary

| mode | wall-clock | tester_available | unreadable |
|---|---:|---:|---:|
| sequential | `654,517 ms` | `32/32` | `0` |
| strategy-aware parallel | `447,922 ms` | `18/32` | `14` |
| shard parallel | `432,416 ms` | `20/32` | `12` |
| hybrid parallel | `448,916 ms` | `18/32` | `14` |
| hybrid partial retry | `756,911 ms` | `28/56 attempts` | `24/56 attempts` |

## Notes

- mid-size sample でも shard が最速だった
- strategy-aware と hybrid は wall-clock がほぼ同じで、micro-shard checkpoint の追加だけでは unreadable を減らせなかった
- hybrid partial retry は rollback trigger が aggressive すぎ、retry queue が増えすぎて逆に最遅になった
- 特に worker1 側は first pass `6 run` に対し retry pass `23 run` となり、rollback が future work 削減より retry 増幅に寄った

## Artifacts

- `docs/references/backtests/mid-parallel-benchmark-comparison_20260406_2330.json`
- session files:
  - `mid-parallel-benchmark-config_20260406_2330.json`
  - `mid-parallel-benchmark-common_20260406_2330.mjs`
  - `mid-parallel-benchmark-orchestrator_20260406_2330.mjs`
  - `mid-parallel-benchmark-worker-runner_20260406_2330.mjs`
  - `mid-parallel-benchmark-compare_20260406_2330.mjs`
