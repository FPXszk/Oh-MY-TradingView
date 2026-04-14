# Session log: dual-worker both-visible feasibility

## Goal

- worker1 / worker2 を両方 visible にできるかを実測で確認する
- 無理なら、安定運用できる topology を明確化する

## Baseline before experiment

- known-good topology は `Session0 hidden + visible Session1`
- stable 条件は
  - `restore_policy: "skip"`
  - Strategy Tester `指標` タブ活性化
  - warm-up 後の parallel 実行

## Experiment summary

### 1. Baseline reconfirm

- worker1 (`9223`) / worker2 (`9225`) の `status` success を再確認
- individual preset backtest は両 worker success

### 2. WSL direct launch does not become visible

- WSL から `cmd /c start` / `Start-Process` で新しい worker (`9226`) を起動した
- process 観測では **Session0** に作成された
- つまり **WSL からの通常起動 = visible session 起動** にはならなかった

### 3. Task Scheduler `/IT` can launch a visible worker

- Task Scheduler `/IT` で disposable worker (`9228`) を起動した
- process 観測では **Session1** に作成された
- `curl http://127.0.0.1:9228/json/version` も成功し、CDP endpoint は生きていた

### 4. Move worker1 to visible Session1

- 既存 Session0 worker1 (`9222`) を停止
- Task Scheduler `/IT` で worker1 を `9222` のまま Session1 に起動
- process 観測では `9222` worker1 が **Session1** に載った

### 5. both-visible verification

- worker1 / worker2 とも visible Session1 にいる状態で検証
- `status` は両 worker success
- individual preset backtest は両 worker success
- しかし parallel distinct preset backtest では
  - worker1: `tester_reason_category: "metrics_unreadable"`
  - worker2: `tester_reason_category: "metrics_unreadable"`
  となった

## Key observation

- **same-session visible + visible は launch 可能**
- ただし **parallel backtest の stable topology ではない**
- failure は strategy apply ではなく、Strategy Tester metrics 読み取り側に出た

## Restore to stable baseline

- worker1 を Session0 へ戻した
- その直後の no-warm-up parallel では worker2 が `metrics_unreadable` を返した
- 既知条件どおり worker1 / worker2 individual を先に通して warm-up した後、parallel を再実行
- 結果:
  - worker1 parallel -> `tester_available: true`
  - worker2 parallel -> `tester_available: true`

## Conclusion

- **same-session visible + visible は非推奨**
- 現時点の stable 推奨構成は引き続き
  - worker1: Session0 hidden
  - worker2: Session1 visible
- 将来追加で試す価値があるのは
  - 別 Windows user / 別 interactive session の visible + visible
- ただし今回は追加資格情報やセッション準備が必要になるため未検証

## Recommended operator guidance

1. stable parallel を優先するなら `Session0 hidden + visible Session1` を維持する
2. visible 化を試す場合は disposable port/profile で切り分ける
3. worker topology を戻した後は、parallel 前に individual warm-up を入れる

## References

- `docs/command.md`
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`
