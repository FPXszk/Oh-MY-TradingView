# Session log: round8 parallel validation and speed comparison

## Goal

- セッションログから直前までの並列 backtest 文脈を引き継ぐ
- round8 workload を **Mag7 / alt に分けて実際に並列再実行**する
- 過去 round8 raw JSON の所要時間と比較し、どれだけ速くなったかを定量化する

## What the prior logs established

- `docs/working-memory/session-logs/round8-theme-trend_20260405_2219.md`
  - round8 は **Mag7 84 run → alt 120 run** の順に直列実行されていた
- `docs/command.md`
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`
  - dual-worker の warmed parallel 条件は
    - dual-worker reachability
    - `restore_policy: "skip"`
    - Strategy Tester `指標` タブ活性化
    - 各 worker の individual warm-up success
    に整理済みだった

## Historical baseline recovered from raw artifacts

- source:
  - `docs/references/backtests/round8-theme-mag7_20260405.json`
  - `docs/references/backtests/round8-theme-alt_20260405.json`
- comparison note:
  - 過去側は raw JSON の `runtime_ms.sum` を直列 proxy baseline として使っている
  - 今回側は sub-agent / retry を含む実測 wall-clock (`elapsed_ms`) を使っている
  - したがって **同種の時計測ではなく、運用上の参照比較** として読む必要がある
- past Mag7 runtime sum:
  - `1,207,749 ms` (`20.13 min`)
- past alt runtime sum:
  - `1,795,730 ms` (`29.93 min`)
- past sequential baseline:
  - `3,003,479 ms` (`50.06 min`)
- theoretical parallel floor:
  - `1,795,730 ms` (`29.93 min`)

## Validation performed in this session

### Repo / environment baseline

- `npm test`
  - pass
  - `207 / 207`
- worker1 status
  - success
- worker2 status
  - success

### Warm-up

- worker1
  - first warm-up: `metrics_unreadable`
  - second warm-up retry: success
- worker2
  - first warm-up: success

### Parallel execution topology

- **Mag7 sub-agent**
  - worker1 (`TV_CDP_PORT=9223`)
  - runner:
    - `~/.copilot/session-state/.../files/round8-parallel-mag7-runner_20260406_1145.mjs`
- **alt sub-agent**
  - worker2 (`TV_CDP_PORT=9225`)
  - runner:
    - `~/.copilot/session-state/.../files/round8-parallel-alt-runner_20260406_1145.mjs`

### What happened during execution

1. Mag7 / alt を別サブエージェントで並列起動した
2. Mag7 側は最後まで完走した
3. alt 側は途中で worker2 が不安定化し、初回 run では `runner_exception` が大量発生した
4. WSL から
   - `cmd.exe /c start "" /D C:\TradingView C:\TradingView\TradingView.exe --remote-debugging-port=9224 --user-data-dir=C:\TradingView\profiles\worker2 --in-process-gpu`
   で worker2 を再起動した
5. その後、`round8-parallel-alt-retry_20260406_1145.mjs` を別サブエージェントで実行し、`runner_exception` だった 74 run を再試行した
6. retry 後、alt も `success_count = 120` まで回復した

## Final artifacts created

- `docs/references/backtests/round8-theme-mag7-parallel_20260406_1145.json`
- `docs/references/backtests/round8-theme-mag7-parallel_20260406_1145.summary.json`
- `docs/references/backtests/round8-theme-alt-parallel_20260406_1145.json`
- `docs/references/backtests/round8-theme-alt-parallel_20260406_1145.summary.json`
- `docs/references/backtests/round8-parallel-speed-comparison_20260406_1145.json`

## Final measured result

### Current run

- Mag7
  - `run_count = 84`
  - `success_count = 84`
  - `tester_available_count = 53`
  - `runtime sum = 2,165,467 ms`
  - `elapsed = 2,165,631 ms` (`36.09 min`)
  - `metrics_unreadable = 31`
- alt
  - `run_count = 120`
  - `success_count = 120`
  - `tester_available_count = 85`
  - `runtime sum = 2,722,004 ms`
  - final `elapsed = 3,165,607 ms` (`52.76 min`)
  - `metrics_unreadable = 27`
  - initial recovery target:
    - `retry_runs_completed = 74`
  - final raw artifact では
    - `runner_exception = 0`

### Comparison

- past sequential baseline:
  - `3,003,479 ms` (`50.06 min`)
- current parallel window:
  - `3,165,607 ms` (`52.76 min`)
- current aggregate runtime sum:
  - `4,887,471 ms` (`81.46 min`)
- speedup vs past baseline:
  - `0.949x`
- reduction vs past baseline:
  - `-5.4%`
- speedup vs current aggregate runtime:
  - `1.544x`
- efficiency vs theoretical floor:
  - `0.567x`

## Conclusion

- **今回の round8 parallel validation は、過去の直列 baseline に対しては速くならなかった**
- ただしこの比較は
  - 過去側: raw JSON `runtime_ms.sum`
  - 今回側: sub-agent 起動 / worker2 restart / retry を含む end-to-end wall-clock
  の比較なので、**厳密な同時計測比較ではなく運用 proxy 比較** である
- 理由は単純で、
  - worker2 が途中で落ちて retry が必要になったこと
  - Mag7 / alt ともに 1 run あたりの runtime が過去 artifact より大きく膨らんだこと
  - `tester_available_count` が過去より明確に低下したこと
  が重なったため
- 一方で、
  - current run の aggregate runtime sum (`81.46 min`) に対しては
  - actual parallel wall-clock (`52.76 min`) なので
  - **同じ今回の run を直列でやるよりは並列化の効果が出ている**
- したがって 2026-04-06 12:52 時点の結論は:
  - **parallel orchestration 自体は成立**
  - **しかし round8 実 workload での end-to-end speedup は、安定性コスト込みではまだ未達**

## Most actionable follow-up

1. worker2 長時間安定性を改善し、retry なしで alt 120 run を完走させる
2. Mag7 側の `metrics_unreadable` を下げ、`tester_available_count` を過去水準へ戻す
3. その上でもう一度同じ round8 workload を parallel で再計測し、retry なしの wall-clock を比較する
