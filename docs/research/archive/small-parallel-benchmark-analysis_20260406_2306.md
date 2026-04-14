# Small parallel benchmark analysis

## 結論

小さい benchmark（`20 run = 4 preset × 5 symbol`）では、**sequential より parallel は明確に速くなった**。  
ただし、今回の sample では **推奨 1 位だった strategy-aware split より、2-run shard split の方が速かった**。

## 実験条件

- workload:
  - presets: `ema-cross-9-21`, `rsi-mean-reversion`, `keltner-breakout`, `donchian-55-20-baseline-r5`
  - symbols: `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`
  - total: `20 run`
- warm-up:
  - 各 worker で `ema-cross-9-21 / AAPL` を 3 回
  - `tester_available: true` 3 連続を確認
- calibration:
  - `AAPL` で 4 preset を 1 回ずつ実行
  - 4 preset の runtime はほぼ同一で、strategy-aware 配分もほぼ均等化できた

## 結果

| mode | wall-clock | speedup vs sequential | reduction | tester_available | unreadable |
|---|---:|---:|---:|---:|---:|
| sequential | `408,728 ms` (`6.81 min`) | `1.000x` | `0.0%` | `20/20` | `0` |
| strategy-aware parallel | `279,535 ms` (`4.66 min`) | `1.462x` | `31.6%` | `12/20` | `8` |
| shard parallel | `265,226 ms` (`4.42 min`) | `1.541x` | `35.1%` | `13/20` | `7` |

比較 JSON:

- `docs/references/backtests/small-parallel-benchmark-comparison_20260406_2229.json`

## なぜ shard の方が速かったか

今回の差は、**配分の重さ** よりも **`metrics_unreadable` がどこに固まったか** の影響が大きい。

- strategy-aware:
  - worker1 の `keltner-breakout` で unreadable が連続し、`35s` 前後の run がまとまって出た
  - worker2 の `donchian-55-20-baseline-r5` 側でも unreadable が連続した
  - 結果として、重い run が strategy chunk に偏って残った
- shard:
  - unreadable 自体は消えていない
  - ただし 2-run shard に混ぜたことで、`35s` 級 run が 1 worker / 1 chunk に寄り切らず、max wall-clock が少し縮んだ

つまり、この sample では **runtime-aware の事前重みだけでは unreadable cluster を予測できず、細かい shard の方が実測 wall-clock に強かった**。

## 何が確認できたか

1. **parallel 自体の speedup は確認できた**
   - round8 follow-up のような「past baseline 比で速くならない」ケースとは違い、この小 workload では両 parallel とも sequential を明確に上回った
2. **小さい sample では shard の優位が出うる**
   - TradingView tester の不安定さが残る状態では、strategy chunk の理論均等化より shard の分散効果が勝つことがある
3. **長時間 workload の recommendation をそのまま反転するにはまだ弱い**
   - 今回は `20 run` の sample
   - mode 順序は randomized ではない
   - retry / restart を伴う failure までは発生していない

## 実運用への含意

- **速度だけを小 sample で見た限り**
  - 1 位: `2-run shard parallel`
  - 2 位: `strategy-aware parallel`
  - 3 位: `sequential`
- **長時間 round8 級 workload の暫定方針**
  - 依然として第一候補は `strategy-aware split + runtime-aware balance`
  - ただし、warm-up を通しても `metrics_unreadable` が cluster するなら、より細かい shard へ寄せる判断材料が増えた

## 次に試すべきこと

1. `20 run` ではなく `30〜40 run` 相当の中規模 sample で再比較する
2. strategy-aware を `5 run chunk` のままにせず、`chunk + micro-shard checkpoint` のハイブリッドを試す
3. unreadable を検知した時点で shard rollback / partial retry へ切り替えると wall-clock がさらに縮むかを測る
