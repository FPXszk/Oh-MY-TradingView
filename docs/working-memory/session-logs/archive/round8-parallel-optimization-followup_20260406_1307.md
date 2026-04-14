# Session log: round8 parallel optimization follow-up

## Goal

- 直前の round8 parallel validation を踏まえ、分割粒度・安定性・速度改善の観点で次回の最適案を整理する
- full rerun は行わず、既存 artifact を主軸にして durable な調査結果を残す

## Inputs revisited

- `docs/working-memory/session-logs/round8-parallel-validation_20260406_1252.md`
- `docs/references/backtests/round8-parallel-speed-comparison_20260406_1145.json`
- `docs/references/backtests/round8-theme-mag7_20260405.json`
- `docs/references/backtests/round8-theme-alt_20260405.json`
- `docs/references/backtests/round8-theme-mag7-parallel_20260406_1145.json`
- `docs/references/backtests/round8-theme-alt-parallel_20260406_1145.json`
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/command.md`

## What was analyzed

### Shard options

- 現状固定分割 (`Mag7 84 / alt 120`)
- run 数均等 `102 / 102`
- historical runtime 重み付き 2-way balance
- strategy 単位分割
- universe 単位分割
- `20 / 30 / 40 run` の retry-friendly shard

### Stability / speed levers

- worker2 の長時間安定性
- warm-up / readiness gate
- `metrics_unreadable` の分布
- retry blast radius
- checkpoint / partial retry
- `10 run` cadence の health check

## Key observations

1. **固定分割は偏っていた**
   - past runtime 基準で `Mag7 20.13 min` / `alt 29.93 min`
   - gap は `9.8 min`
2. **今回の遅化は分割偏りだけでは説明できない**
   - current aggregate runtime は `81.46 min`
   - current wall-clock は `52.76 min`
   - つまり parallel 効果自体はあるが、worker2 crash と retry がそれを相殺した
3. **worker2 crash の blast radius が大きすぎた**
   - initial recovery target は `74 run`
   - full workload に対して `36.3%`
4. **Mag7 / alt とも runtime inflation が大きかった**
   - Mag7 `1.793x`
   - alt `1.516x`
5. **`metrics_unreadable` は依然として高い**
   - Mag7 `31`
   - alt `27`

## Judgement

### Best next split

- **第一候補**: strategy 単位チャンク + runtime 重み付き配分
- **第二候補**: `30〜40 run` shard + checkpoint / partial retry

### Best next operational changes

1. warm-up を `tester_available: true` の 3 連続へ厳格化
2. `10 run` ごとの health check
3. restart budget を 1 回に制限
4. checkpoint / partial retry を runner 設計へ入れる

## Why these beat the current split

- `84 / 120` 固定分割は理解しやすいが、片側が重く、failure 時の被害も大きい
- strategy chunk なら
  - **予測上は** wall-clock を理論上限近くまで寄せやすい
  - retry 単位が `27 run` 程度に縮む
- `30〜40 run` shard なら
  - 壁時計はやや不利でも
  - crash 時の回復しやすさが大きく改善する

## Session outcome

- durable doc:
  - `docs/research/round8-parallel-optimization-analysis_20260406_1307.md`
- runbook / command 更新:
  - long-running workload 向けの shard / warm-up / checkpoint guidance を最小追加
- conclusion:
  - **次回は固定 `Mag7 / alt` 分割ではなく、runtime-aware chunking を前提に試すべき**
