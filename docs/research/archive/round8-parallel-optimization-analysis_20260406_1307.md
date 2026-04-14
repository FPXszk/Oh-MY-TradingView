# Round8 並列分割・安定化・高速化の調査メモ

## 結論

直前の round8 並列検証が speedup 未達だった主因は、**分割の偏り** よりも **worker2 の途中断と retry**、および **parallel 実行時の runtime 膨張 / `metrics_unreadable` 増加** にあった。  
次回の第一候補は、**strategy 単位チャンク + runtime 重み付き 2-worker 配分**、またはそれに近い **20〜40 run shard + checkpoint / partial retry** である。

## 事実関係

### 直前の実測

| 指標 | 値 |
|---|---:|
| past sequential baseline | `3,003,479 ms` (`50.06 min`) |
| current parallel wall-clock | `3,165,607 ms` (`52.76 min`) |
| speedup vs past baseline | `0.949x` |
| reduction vs past baseline | `-5.4%` |
| current aggregate runtime | `4,887,471 ms` (`81.46 min`) |
| speedup vs current aggregate runtime | `1.544x` |

### 現状分割

- worker1 = Mag7 `84 run`
- worker2 = alt `120 run`

過去 raw JSON を基準にした予測 runtime は次の通り。

| split | run_count | predicted runtime |
|---|---:|---:|
| Mag7 | `84` | `1,207,749 ms` (`20.13 min`) |
| alt | `120` | `1,795,730 ms` (`29.93 min`) |

この時点で **9.8 分の偏り**、**1.487x の不均衡** があり、固定分割としては片側が重かった。

## なぜ遅くなったか

### 1. worker2 crash + retry が最も大きい

- alt 初回 run では途中で worker2 が不安定化し、`runner_exception` が大量発生した
- その後、worker2 再起動 + `74 run` の recovery retry が必要になった
- 最終的に alt は `success_count = 120` まで回復したが、wall-clock には大きく効いた

### 2. per-run runtime が過去より膨らんだ

| segment | past runtime sum | current runtime sum | ratio |
|---|---:|---:|---:|
| Mag7 | `1,207,749 ms` | `2,165,467 ms` | `1.793x` |
| alt | `1,795,730 ms` | `2,722,004 ms` | `1.516x` |
| total | `3,003,479 ms` | `4,887,471 ms` | `1.627x` |

parallel 実行では、past sequential よりも 1 run あたり runtime が全体的に膨張していた。

### 3. `metrics_unreadable` がまとまって出た

| segment | run_count | tester_available_count | unreadable count |
|---|---:|---:|---:|
| Mag7 | `84` | `53` | `31` |
| alt | `120` | `85` | `27` |

特に Mag7 側は `31/84` が unreadable で、速度面でも品質面でも悪化要因になった。

## shard 戦略の比較

過去 runtime を重みとして、次回の分割候補を比較すると以下になる。

| 戦略 | 予測 wall-clock | 予測偏り | retry blast radius | コメント |
|---|---:|---:|---:|---|
| 現状固定 (`84 / 120`) | `29.93 min` | `9.80 min` | 最大 `120 run` | 理解しやすいが偏りが大きい |
| run 数均等 `102 / 102` | `25.03 min` 前後 | `0.703 sec` | 最大 `102 run` | 速いが retry が重い |
| strategy 単位分割 | `25.1 min` 前後 | `8.669 sec` | 最大 `27 run` | **速度と retry 性のバランスが良い** |
| universe 単位分割 | 現状固定と同等 | 大 | 最大 `120 run` | 論理的だが不均衡を温存 |
| `30 run` shard | `28.0 min` 前後 | 中 | 最大 `30 run` (`14.7%`) | retry しやすいが少し遅い |
| `40 run` shard | `25.0 min` 前後 | 小 | 最大 `40 run` (`19.6%`) | `34 run × 6 shard` の historical greedy 試算では各 shard `8.34 min` 前後に揃う |
| `20 run` shard | `25.5 min` 前後 | 小 | 最大 `20 run` (`9.8%`) | retry 最強だが shard 数が多い |

## 推奨案

### 第一候補: strategy 単位チャンク + runtime 重み付き配分

理由:

1. `12 strategy` を chunk として扱えるので意味的にわかりやすい
2. 過去 runtime を使って 2 worker に配ると、固定分割より大幅に均等化できる
3. retry blast radius が最大でも `27 run` 程度に落ちる
4. 後から work-stealing queue に拡張しやすい

### 第二候補: 30〜40 run shard + checkpoint / partial retry

理由:

1. crash 時の再試行範囲を `30〜40 run` に限定できる
2. 今回の `74 run` recovery よりかなり小さい
3. chunk 完了ごとに health check を挟みやすい
4. `20 run` shard より orchestration 数を抑えやすい

### 使い分け

- **速度優先**: strategy 単位チャンク
- **安定性優先**: `30〜40 run` shard

## すぐ試せる運用改善

### 1. warm-up gate の厳格化

現状は「1 回 success」で warm-up を通していたが、次回は以下へ引き上げたい。

1. 各 worker で `tester_available: true` を **3 連続**
2. 3 連続の中で `metrics_unreadable = 0`
3. warm-up runtime が明らかに膨らんでいないこと

### 2. health check cadence

- `10 run` ごとに `status` / `json/version` を確認
- 応答なしや異常なら、その shard を止めて partial retry へ移る

### 3. restart budget

- 1 parallel session あたり worker 再起動は **最大 1 回**
- 2 回目の crash が出たら session を打ち切って原因切り分け優先

### 4. readiness gate

parallel 開始条件を次に固定する。

- `success: true`
- `tester_available: true`
- `restore_policy: "skip"`
- `restore_success: true`
- `restore_skipped: true`

## 追加設計が要る改善

### 1. checkpoint + partial retry

今回いちばん効く改善候補。  
runner が shard ごと、または `10 run` ごとに checkpoint JSON を残せば、crash 後に未完了分だけ再開できる。

### 2. `metrics_unreadable` の early abort

今は unreadable run が一定時間を使い切るため、固定 timeout を丸ごと消費しやすい。  
初期兆候で早めに失敗判定し、その場で再試行または shard rollback できると、壁時計を削りやすい。

### 3. runtime inflation の原因切り分け

次のいずれが支配的かはまだ断定できていない。

- parallel 負荷による TradingView 側の競合
- worker の warm state 劣化
- 長時間実行による chart / tester state 劣化

したがって、次回は **「full rerun 前に sample shard を parallel / sequential で比較」** が必要。

## 次回の最小実験案

### 案 A

- strategy 単位で `12 chunk`
- 過去 runtime に基づく greedy 2-way 配分
- `10 run` ごと health check
- crash 時は chunk 単位 retry

### 案 B

- `30〜40 run` shard を `6〜7 個`
- 2 worker の queue で順次消化
- shard 完了ごとに checkpoint
- failure は shard 単位で retry

## まとめ

- 今回の失敗は「parallel が無意味」ではなく、**粗い固定分割 + worker2 安定性不足 + retry コスト** の問題だった
- 分割戦略だけ見れば、`84 / 120` より **`102 / 102` 相当の runtime 均等化** が望ましい
- 運用まで含めるなら、**strategy 単位チャンク** か **30〜40 run shard** が現実解
- 次回の優先順位は
  1. warm-up / readiness gate を厳格化
  2. `10 run` cadence の health check
  3. checkpoint / partial retry
  4. strategy chunk か 30〜40 run shard で再計測
  の順が妥当
