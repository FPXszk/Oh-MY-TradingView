# Session log: small parallel benchmark validation

## Goal

前回深掘りした parallel optimization の仮説を、round8 full rerun の前に小さい実 workload で検証する。

## Sample

- presets:
  - `ema-cross-9-21`
  - `rsi-mean-reversion`
  - `keltner-breakout`
  - `donchian-55-20-baseline-r5`
- symbols:
  - `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`
- total:
  - `20 run`

## Execution flow

1. worker1 / worker2 の `json/version` と `status` を確認
2. 各 worker で `ema-cross-9-21 / AAPL` を 3 回回し、warm-up gate を通した
3. `AAPL` で 4 preset を 1 回ずつ calibration し、strategy-aware 配分を作成
4. sequential を実行
5. strategy-aware parallel を **2 サブエージェント並列** で実行
6. warm-up をやり直した後、shard parallel を **2 サブエージェント並列** で実行
7. comparison JSON を生成した

## Result summary

| mode | wall-clock | tester_available | unreadable |
|---|---:|---:|---:|
| sequential | `408,728 ms` | `20/20` | `0` |
| strategy-aware parallel | `279,535 ms` | `12/20` | `8` |
| shard parallel | `265,226 ms` | `13/20` | `7` |

## Notes

- prepare 時の calibration は 4 preset ともほぼ同一 runtime だった
- strategy-aware は理論上ほぼ均等に割れたが、`keltner-breakout` / `donchian-55-20-baseline-r5` 側で unreadable が固まり、実測 wall-clock が伸びた
- shard は unreadable を消せていないが、長い unreadable run が分散したぶん max worker time が少し縮んだ
- したがって、この sample では **推奨順の 1 位と 2 位が入れ替わった**

## Artifacts

- `docs/references/backtests/small-parallel-benchmark-comparison_20260406_2229.json`
- session files:
  - `small-parallel-benchmark-config_20260406_2229.json`
  - `small-parallel-benchmark-common_20260406_2229.mjs`
  - `small-parallel-benchmark-orchestrator_20260406_2229.mjs`
  - `small-parallel-benchmark-worker-runner_20260406_2229.mjs`
  - `small-parallel-benchmark-compare_20260406_2229.mjs`
