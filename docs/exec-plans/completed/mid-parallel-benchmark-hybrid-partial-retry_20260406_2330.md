# 実行計画: 中規模 parallel benchmark 再比較と hybrid / partial-retry 検証 (20260406_2330)

- ステータス: COMPLETED
- 種別: 調査 / 実験 / docs 更新中心
- 前提:
  - 直前の小規模 benchmark 結果は `docs/research/small-parallel-benchmark-analysis_20260406_2306.md`
  - 小 sample (`20 run`) では `shard parallel` が最速だった
  - 長時間 workload 指針は `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md` の Long-running research workload guidance に従う
  - `command.md` 7c に small-sample caveat が追記済み
  - round8 optimization analysis では `checkpoint + partial retry` と `metrics_unreadable early abort` が次の改善候補
  - 直前 benchmark は repo 本体ではなく session artifact runner で実施し、repo には結果 JSON / docs のみ残した
  - 現在の active plan は `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md` のみであり、本 plan は benchmark 実験系で非競合

## 1. 問題設定と到達目標

小規模 sample では shard が最速だったが、`20 run` では sample size が小さく、strategy-aware の理論優位を否定するには弱い。  
次は **30〜40 run 相当の中規模 sample** で再比較しつつ、strategy-aware の弱点だった unreadable cluster と retry blast radius を減らすために、**chunk + micro-shard checkpoint** と **unreadable 検知時の shard rollback / partial retry** を実測する。

### 到達目標

- 中規模 sample で `sequential / strategy-aware / shard` の再比較結果を durable に残す
- `strategy-aware + micro-shard checkpoint` の hybrid が wall-clock / unreadable / retry 範囲で改善するか確認する
- unreadable 検知時に **full 継続** より **rollback / partial retry 切替** の方が速いか確認する
- repo 本体変更を最小化し、session artifact runner 中心で再現可能な実験手順として整理する

## 2. scope / out-of-scope

### scope

- 中規模 sample (`30〜40 run`) の manifest 設計
- 3 本の実験実施
  1. mid-size sample 再比較
  2. hybrid (`strategy-aware chunk + micro-shard checkpoint`)
  3. unreadable 検知時の shard rollback / partial retry
- session artifact runner の実験ロジック追加・調整
- 必要最小限の repo docs / comparison artifact 更新
- 既存コマンドベースでの readiness / validation 実施

### out-of-scope

- repo 本体の大規模な backtest 実装刷新
- 新規 CLI コマンドの恒久追加（必要最小限の純粋関数抽出を除く）
- dual-worker topology の再設計
- full round8 workload の rerun
- visible + visible など別トポロジ再検証
- 永続的な大規模 checkpoint 基盤の本格導入

## 3. 参照・変更・作成候補ファイル

### 参照

- `docs/research/small-parallel-benchmark-analysis_20260406_2306.md`
- `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `command.md`
- `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md`
- `docs/references/backtests/small-parallel-benchmark-comparison_20260406_2229.json`
- `docs/research/round8-parallel-optimization-analysis_20260406_1307.md`

### 新規作成候補（repo）

- `docs/exec-plans/active/mid-parallel-benchmark-hybrid-partial-retry_20260406_2330.md`
- `docs/research/mid-parallel-benchmark-analysis_20260406_2330.md`
- `docs/references/backtests/mid-parallel-benchmark-comparison_20260406_2330.json`
- `docs/working-memory/session-logs/mid-parallel-benchmark-hybrid-partial-retry_20260406_2330.md`

### 更新候補（必要時のみ）

- `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `command.md`
- `tests/backtest.test.js`
- `tests/e2e.backtest.test.js`

### session workspace artifact（repo 非コミットを基本）

- `~/.copilot/session-state/.../files/mid-parallel-benchmark-*.mjs`
- `~/.copilot/session-state/.../files/mid-parallel-benchmark-*.json`
- `~/.copilot/session-state/.../files/mid-parallel-benchmark-*.log`

> 原則として、実験 orchestration は session artifact runner に閉じ込め、repo には docs / JSON / 必要最小限のテストだけを残す。

## 4. 実験順序と依存関係

### Experiment 1: mid-size sample 再比較

目的:

- `30〜40 run` で `sequential / strategy-aware / shard` を再比較し、小 sample の結論が維持されるか確認する

依存:

- なし（開始点）
- ただし warm-up gate / dual-worker readiness は必須

出力:

- mode 別 wall-clock
- unreadable 件数
- worker ごとの run 偏り
- comparison JSON の baseline

### Experiment 2: hybrid（chunk + micro-shard checkpoint）

目的:

- strategy-aware の chunk 粒度は保ちつつ、5-run 固定 chunk の弱点を減らす
- chunk 内または chunk 境界で micro-shard checkpoint を切り、retry 範囲を狭める

依存:

- Experiment 1 の manifest と runtime 観測
- 中規模 sample の同等 workload を再利用する

出力:

- pure strategy-aware 比の wall-clock 差
- checkpoint ごとの retry 範囲
- unreadable cluster の局所化有無

### Experiment 3: unreadable 検知時の shard rollback / partial retry

目的:

- unreadable 検知後にそのまま続行するより、当該 shard を rollback して partial retry へ切り替えた方が速いかを測る

依存:

- Experiment 2 の micro-shard / checkpoint 単位
- unreadable 検知条件の定義
- 可能なら実測 unreadable を使用し、再現不足なら session runner 内で recovery branch を強制検証する

出力:

- unreadable 検知から recovery 完了までの追加 wall-clock
- full 継続 vs rollback / partial retry の比較
- retry blast radius と成功率

## 5. RED→GREEN→REFACTOR のテスト / 検証方針

### RED

- まず experiment runner / planner の期待動作を failing case で固定する
- repo 本体に汎用ロジックを切り出す必要がある場合のみ、以下を RED で追加する
  - `tests/backtest.test.js`
    - mid-size manifest から strategy-aware / shard / hybrid plan が生成できる
    - micro-shard checkpoint が期待単位で切られる
    - unreadable 検知時に rollback / partial retry 対象が正しく絞られる
  - `tests/e2e.backtest.test.js`
    - 必要最小限で result shape / partial retry summary を表現できる
- repo 変更なしで済む部分は session runner の dry-run fixture で RED を作る

### GREEN

- 最小限の runner / planner / summarizer で RED を通す
- session artifact runner 中心で 3 実験を通し、comparison artifact を生成する
- repo 既存 backtest フローを壊さないことを優先する

### REFACTOR

- 実験専用ロジックは repo へ持ち込まず session artifact runner に残す
- repo に残す場合も pure function 化した最小単位の helper と tests のみに留める
- durable に残すべき結論だけを research / runbook / command に整理する

## 6. 既存コマンドベースの validation 方針

### baseline validation

```bash
npm test
```

### readiness / health check

```bash
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9225/json/version
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

### warm-up gate

- 各 worker で `tester_available: true` を 3 連続
- `metrics_unreadable = 0`
- `restore_policy: "skip"` 系 result shape 確認

### execution validation

- 実 run は既存 `node src/cli/index.js backtest preset ... --symbol ...` を session runner から呼ぶ
- `10 run` ごと、または micro-shard checkpoint ごとに `status` / `json/version` を再確認
- unreadable 検知時は full rerun を避け、partial retry の比較データを優先取得する

### post-change validation

- repo 本体に変更が入った場合のみ `npm run test:e2e` まで拡張
- docs / JSON のみなら整合性確認と artifact cross-check を行う

## 7. 実装ステップ

- [ ] active plan 非競合を確認し、本 plan の対象を中規模 benchmark 3 実験に限定する
- [ ] 中規模 sample (`30〜40 run`) の workload 候補を決める
- [ ] Experiment 1 用に `sequential / strategy-aware / shard` の同一 manifest 比較条件を固定する
- [ ] warm-up gate と health-check cadence を既存 guidance に合わせて明文化する
- [ ] session artifact runner に mid-size manifest / summary 出力を追加する
- [ ] 必要なら planner / checkpoint / rollback 判定の RED テストを先に追加する
- [ ] Experiment 1 を実施し、comparison baseline を取得する
- [ ] Experiment 1 の結果をもとに hybrid の micro-shard checkpoint 粒度を決める
- [ ] Experiment 2 を実施し、pure strategy-aware と比較する
- [ ] unreadable 検知条件と rollback / partial retry 判定を定義する
- [ ] Experiment 3 を実施し、full 継続との差分を測る
- [ ] 結果を comparison JSON に集約する
- [ ] research doc に結論・限界・次の推奨方針をまとめる
- [ ] session log に実験条件、run 中判断、失敗・retry 経路を残す
- [ ] durable な運用差分がある場合のみ runbook / command.md を最小更新する

## 8. 最終成果物

### docs/research に残すもの

- 中規模 sample の比較結果
- hybrid の効果有無
- unreadable 検知時 rollback / partial retry の効果有無
- 小 sample との差分と、長時間 guidance への含意

### session log に残すもの

- 実行日時
- sample manifest
- warm-up / readiness 記録
- unreadable 発生箇所
- rollback / partial retry 判断ログ
- mode ごとの所感と次回改善点

### comparison artifact に残すもの

- workload 定義
- mode ごとの wall-clock / success / unreadable / retry 指標
- checkpoint 単位の実績
- rollback / partial retry 前後の比較値
- 結論サマリ（どの条件を次回第一候補とするか）
