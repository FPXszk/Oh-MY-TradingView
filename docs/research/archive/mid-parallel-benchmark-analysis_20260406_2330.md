# Mid parallel benchmark analysis

## 結論

`32 run` の中規模 sample でも、**最速は shard parallel** だった。  
一方で、`strategy-aware + micro-shard checkpoint` の hybrid は pure strategy-aware を改善できず、**unreadable を引いた瞬間に rollback / partial retry へ切り替える現在の実装は、wall-clock をむしろ悪化させた**。

## 実験条件

- workload:
  - presets: `ema-cross-9-21`, `rsi-mean-reversion`, `keltner-breakout`, `donchian-55-20-baseline-r5`
  - symbols: `AAPL`, `MSFT`, `GOOGL`, `AMZN`, `META`, `NVDA`, `TSLA`, `JPM`
  - total: `32 run`
- warm-up:
  - 各 mode 開始前に各 worker で `ema-cross-9-21 / AAPL` を 3 回
  - `tester_available: true` 3 連続を確認
- mode:
  - sequential
  - strategy-aware parallel
  - shard parallel
  - hybrid parallel (`strategy-aware + 4-run micro-shard checkpoint`)
  - hybrid partial retry (`metrics_unreadable` 検知で micro-shard rollback + retry queue`)

## 結果

| mode | wall-clock | speedup vs sequential | reduction | tester_available | unreadable |
|---|---:|---:|---:|---:|---:|
| sequential | `654,517 ms` (`10.91 min`) | `1.000x` | `0.0%` | `32/32` | `0` |
| strategy-aware parallel | `447,922 ms` (`7.47 min`) | `1.461x` | `31.6%` | `18/32` | `14` |
| shard parallel | `432,416 ms` (`7.21 min`) | `1.514x` | `33.9%` | `20/32` | `12` |
| hybrid parallel | `448,916 ms` (`7.48 min`) | `1.458x` | `31.4%` | `18/32` | `14` |
| hybrid partial retry | `756,911 ms` (`12.62 min`) | `0.865x` | `-15.6%` | `28/56 attempts` | `24/56 attempts` |

比較 artifact:

- `references/backtests/mid-parallel-benchmark-comparison_20260406_2330.json`

## 何が分かったか

### 1. shard の優位は 20 run の偶然ではなかった

小 sample (`20 run`) に続き、中規模 sample (`32 run`) でも shard parallel が最速だった。

- small sample: `265,226 ms`
- mid sample: `432,416 ms`

少なくとも現状の TradingView worker 条件では、**runtime-aware の事前均等化より unreadable の分散効果の方が効いている**。

### 2. hybrid checkpoint 単体では改善しなかった

hybrid は strategy-aware の配分を維持しつつ micro-shard ごとに checkpoint を切ったが、

- strategy-aware: `447,922 ms`
- hybrid: `448,916 ms`

で、wall-clock はほぼ同等だった。  
今回の `4-run micro-shard checkpoint` は、**観測粒度は上げたが unreadable cluster 自体は減らせていない**。

### 3. 現在の partial retry 実装は逆効果だった

今回の hybrid partial retry は、

1. `metrics_unreadable` を検知
2. 当該 run と micro-shard の残り未実行 run を retry queue へ移す
3. cooldown 後に retry queue のみ再実行

という流れだったが、実測では最下位になった。

- wall-clock: `756,911 ms`
- sequential 比: `0.865x`
- retry を含む総試行回数: `56`

主因は、**unreadable を最初の 1 回で rollback trigger にしたことで retry queue が大きく膨らんだ** ことにある。

#### 具体例

- worker1
  - first pass は `6 run`
  - retry pass は `23 run`
  - `keltner-breakout__ms-01` / `__ms-02` では、最初の run 直後に `3 run` ずつ rollback
- worker2
  - first pass は `10 run`
  - retry pass は `17 run`
  - `donchian` と `ema-cross` 側で rollback → retry round が 2 回発生

つまり、**rollback が future work を減らすより、再試行仕事を増やす方に働いた**。

## 実運用への含意

### いま一番安全な結論

1. **中規模 sample でも shard parallel を第一候補にしてよい**
2. **micro-shard checkpoint は observability / retry 境界としては有用だが、単体では高速化しない**
3. **`metrics_unreadable` を 1 回検知しただけで自動 rollback するのは現時点では非推奨**

### なぜ partial retry が失敗したか

partial retry の発想自体が悪いというより、今回の policy が aggressive すぎた。

- unreadable 1 回で即 rollback
- 4-run micro-shard の残り run をまとめて retry
- retry round 中の unreadable でも再度 queue を積み増し

この条件では、**retry amplification** が wall-clock 改善を打ち消した。

## 次にやるなら

1. rollback trigger を「最初の unreadable 1 回」から「連続 unreadable」や「status 劣化併発」へ厳しくする
2. rollback 対象を micro-shard 全残りではなく、current run のみ or 1 run 先までに絞る
3. `4-run` ではなく `2-run` micro-shard で partial retry の blast radius をさらに下げる

## まとめ

- `32 run` でも **shard parallel が最速**
- `strategy-aware + micro-shard checkpoint` は **checkpoint を細かくしても速くならなかった**
- **naive な unreadable-triggered partial retry は遅くなる**
- 現時点の暫定順位は
  1. shard parallel
  2. strategy-aware parallel
  3. hybrid parallel
  4. sequential
  5. hybrid partial retry
  となる
