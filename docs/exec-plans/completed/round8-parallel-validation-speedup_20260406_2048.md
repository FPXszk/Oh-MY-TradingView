# 実行計画: round8 並列再検証と速度比較レポート (20260406_2048)

- ステータス: ACTIVE
- 既存 active plan:
  - `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md`
  - reachability / warmed parallel の安定条件整理が対象であり、今回の plan は **round8 を実際に再実行して並列効果を定量比較する** 作業なので重複しない
- 直前までの確認済み文脈:
  - `command.md` 125-148 と `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md` に dual-worker 並列 backtest の既知正常手順と安定条件がある
  - `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md` では warmed parallel distinct preset backtest が 3 ラウンド連続 success
  - `docs/working-memory/session-logs/round8-theme-trend_20260405_2219.md` では round8 実行順が **Mag7 84 run → alt 120 run** の直列だった
  - 過去比較に使える raw snapshot は `docs/references/backtests/round8-theme-mag7_20260405.json` と `docs/references/backtests/round8-theme-alt_20260405.json`
  - 過去 session で使った `round8-batch-runner.mjs` は repo に無い可能性が高く、必要なら **session workspace artifact** として再作成する

## 1. 問題設定と到達目標

### 問題設定

round8 は過去に **Mag7 84 run** と **alt 120 run** を直列実行して結果を残しているが、現在は dual-worker warmed state の並列 backtest 安定条件が整理済みであり、同じ round8 系 workload を **実際に並列で再現** できる可能性がある。

今回必要なのは、単に parallel command が通ることの確認ではなく、以下を 1 つの検証としてつなげること。

1. セッションログから直前までの安定条件を復元する
2. round8 workload を worker1 / worker2 に分担して **実機で並列実行**する
3. 並列時はサブエージェントも **並列起動**し、Mag7 と alt を分担させる
4. 過去 round8 raw JSON の `runtime_ms` 集計と、今回の parallel 実測 elapsed を比較し、**どれだけ速くなったか** を報告する

### 到達目標

- warmed dual-worker topology 上で round8 相当の Mag7 / alt batch を並列完走できる
- Mag7 側・alt 側それぞれの rerun raw / summary artifact を新規保存できる
- round8 過去 raw JSON の `runtime_ms` から **直列基準時間** を集計できる
- 今回の parallel 実行で **end-to-end elapsed** と **worker 別 runtime 合計** を採取できる
- 「直列基準 대비 parallel 実測」の speedup 倍率 / 短縮率を docs と session log に残せる

## 2. scope / out-of-scope

### scope

- session log / runbook / command.md から round8 再検証に必要な前提を復元する
- dual-worker warmed state の事前確認（reachability / status / individual warm-up）
- round8 Mag7 / alt workload の parallel rerun
- sub-agent を並列起動して Mag7 と alt を分担実行するオーケストレーション
- 過去 raw JSON `runtime_ms` の集計と、今回の elapsed / runtime 集計
- rerun artifact / research doc / session log / 必要最小限の runbook / command 導線更新

### out-of-scope

- backtest ロジック自体の新規機能追加や大幅改修
- 新しい builder family / preset の追加
- 公開 CLI / MCP の仕様拡張
- dual-worker 構成そのものの再設計
- fresh cold start 安定化の本格追試
- round8 の strategy ranking 自体を作り直すこと
- round8 と無関係な docs 整理や refactor

## 3. 参照・更新・新規作成するファイル一覧

### 参照

- `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md`
- `command.md`
- `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`
- `docs/working-memory/session-logs/round8-theme-trend_20260405_2219.md`
- `docs/references/backtests/round8-theme-mag7_20260405.json`
- `docs/references/backtests/round8-theme-mag7_20260405.summary.json`
- `docs/references/backtests/round8-theme-alt_20260405.json`
- `docs/references/backtests/round8-theme-alt_20260405.summary.json`
- `docs/research/theme-backtest-results-round8_2015_2025.md`
- `docs/research/theme-backtest-results-round8-alt_2015_2025.md`
- `config/backtest/strategy-presets.json`
- `src/core/backtest.js`
- `src/cli/commands/backtest.js`
- `tests/backtest.test.js`
- `tests/e2e.backtest.test.js`
- `package.json`

### 更新候補

- `docs/research/theme-backtest-results-round8_2015_2025.md`
- `docs/research/theme-backtest-results-round8-alt_2015_2025.md`
- `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`（round8 workload での known-good を追記する場合のみ）
- `command.md`（round8 並列検証コマンドを durable に残す価値がある場合のみ）
- `docs/DOCUMENTATION_SYSTEM.md`（新しい durable artifact の導線が必要な場合のみ）

### 新規作成

- `docs/working-memory/session-logs/round8-parallel-validation_YYYYMMDD_HHMM.md`
- `docs/references/backtests/round8-theme-mag7-parallel_YYYYMMDD.json`
- `docs/references/backtests/round8-theme-mag7-parallel_YYYYMMDD.summary.json`
- `docs/references/backtests/round8-theme-alt-parallel_YYYYMMDD.json`
- `docs/references/backtests/round8-theme-alt-parallel_YYYYMMDD.summary.json`
- `docs/references/backtests/round8-parallel-speed-comparison_YYYYMMDD.json`（過去集計 / 今回集計 / speedup を 1 つにまとめる場合）

### repo 外の session workspace artifact（必要時のみ、repo 変更と分離）

- `~/.copilot/session-state/round8-parallel-mag7-runner_YYYYMMDD_HHMM.mjs`
- `~/.copilot/session-state/round8-parallel-alt-runner_YYYYMMDD_HHMM.mjs`
- `~/.copilot/session-state/round8-runtime-compare_YYYYMMDD_HHMM.mjs`

> これらは **session workspace の一時スクリプト** とし、repo に commit しない。repo 内に durable runner を追加するのは、既存 CLI だけでは round8 rerun を再現できない明確な blocker が出た場合に限る。

## 4. 実施方針

### 4.1 過去時間を raw JSON の `runtime_ms` からどう集計するか

過去の直列 round8 は `round8-theme-mag7_20260405.json` と `round8-theme-alt_20260405.json` に run 単位の `runtime_ms` が入っているため、比較の基準値は raw JSON から機械集計する。

集計方針は次の 3 層に分ける。

1. **セグメント別集計**
   - Mag7: `count`, `sum(runtime_ms)`, `avg`, `median`, `p95`, `max`
   - alt: `count`, `sum(runtime_ms)`, `avg`, `median`, `p95`, `max`
2. **過去直列基準時間**
   - `baseline_sequential_ms = sum(mag7.runtime_ms) + sum(alt.runtime_ms)`
   - これは過去 session の **Mag7 → alt** 直列実行を近似する主比較値とする
3. **理論並列下限の参考値**
   - `theoretical_parallel_floor_ms = max(sum(mag7.runtime_ms), sum(alt.runtime_ms))`
   - 実測 parallel elapsed がこの値にどれだけ近づいたかを補助指標として見る

速度報告では最低限次を出す。

- `baseline_sequential_ms`
- `current_parallel_elapsed_ms`
- `speedup = baseline_sequential_ms / current_parallel_elapsed_ms`
- `reduction_pct = 1 - current_parallel_elapsed_ms / baseline_sequential_ms`

加えて、Mag7 / alt の rerun 側でも `runtime_ms` 合計を出し、
「速くなった理由が純粋な並列化なのか、run 単体の時間差なのか」を切り分ける。

### 4.2 新しい parallel 検証をどう再現するか

round8 rerun は、過去と同じ strategy / symbol / universe 構成を維持しつつ、実行 topology だけを **直列 → dual-worker parallel** に変える。

方針は以下。

1. **過去の round8 workload を復元**する
   - Mag7 側: 過去 raw / summary と research doc から 12 strategy × 7 symbol = 84 run を復元
   - alt 側: 過去 raw / summary と research doc から 6 strategy × 2 universe × 各 symbol 群 = 120 run を復元
2. **worker を固定割当**する
   - worker1 (`TV_CDP_PORT=9223`) = Mag7 担当
   - worker2 (`TV_CDP_PORT=9225`) = alt 担当
3. **同時スタート可能な runner** を用意する
   - repo 内 runner が無ければ session workspace artifact を使う
   - 各 runner は `start_ts`, `end_ts`, `elapsed_ms`, 各 run の `runtime_ms`, success/failure を記録する
4. **coordinator が壁時計時間を測る**
   - 2 本の sub-agent / runner をほぼ同時に開始
   - 両方の完了時刻を回収し、parallel 実測 elapsed を確定する

### 4.3 並列時にサブエージェントを並列起動して Mag7 と alt を分担する方針

実装フェーズでは、作業を 3 役に分ける。

1. **coordinator（本体）**
   - 事前状態確認
   - 過去 runtime 集計
   - sub-agent 2 本の起動と完了待ち
   - 結果の統合、speedup 算出、docs 更新
2. **Mag7 sub-agent**
   - worker1 固定
   - Mag7 84 run を実行
   - raw / summary artifact を保存
   - run ごとの失敗や tester 欠測を session log 向けに整理
3. **alt sub-agent**
   - worker2 固定
   - alt 120 run を実行
   - raw / summary artifact を保存
   - run ごとの失敗や tester 欠測を session log 向けに整理

重要なのは、**サブエージェント自体を parallel に起動する**ことと、
双方が同じ output file を触らないように完全に分離すること。

- Mag7 agent は Mag7 系 artifact のみ書く
- alt agent は alt 系 artifact のみ書く
- coordinator だけが speed comparison artifact / research doc / session log をまとめる

### 4.4 warm-up と安定条件の確認手順

parallel rerun 前に、`command.md` / stabilized log / runbook で確認済みの安定条件を **毎回チェックリスト化して通す**。

確認順は次の通り。

1. **dual-worker reachability**
   - `json/version` または `status` で worker1 / worker2 両方の到達性を確認
2. **topology 確認**
   - 推奨構成が `worker1: Session0 hidden`, `worker2: Session1 visible` のままであることを崩さない
3. **individual warm-up**
   - worker1 で round8 系 preset 1 本を individual success
   - worker2 で round8 系 preset 1 本を individual success
4. **result shape 確認**
   - `success: true`
   - `tester_available: true`
   - `restore_policy: "skip"`
   - `restore_success: true`
   - `restore_skipped: true`
5. **parallel 開始条件**
   - 上記の warm-up が両 worker で通ったら初めて batch parallel を開始
   - どちらかで `metrics_unreadable` / `no_strategy_applied` / `editor_open_failed` が出た場合は batch 開始を止めて再 warm-up / 状態回復へ戻る

warm-up に使う preset は round8 系から選び、軽量で既知成功率の高いものを優先する。

## 5. RED→GREEN→REFACTOR のテスト / 検証方針

このタスクは主に実機検証だが、TDD の考え方を検証工程へ写して進める。

### RED

- `npm test` を実行し、repo 側の既存 unit baseline を先に固定する
- `status` / `json/version` / individual warm-up を回し、parallel 実行前の不足条件があれば **失敗として明示** する
- repo 内に `round8-batch-runner.mjs` が無いことを確認し、再現に session workspace artifact が必要ならその必要性を RED として確定する
- まだ parallel rerun artifact / speed comparison report が存在しない状態を確認する

### GREEN

- session workspace runner または既存 CLI の組み合わせで round8 Mag7 / alt を parallel 完走させる
- 各 worker で raw / summary artifact を新規生成する
- 過去 baseline 集計と今回 elapsed を統合し、speedup を算出する
- session log / research doc へ「何が速くなったか」「何は比較対象外か」を明文化する

### REFACTOR

- 実行中に分かった操作順序を runbook / command.md に最小限だけ反映する
- 集計ロジックや runner で重複した session artifact があれば 1 つに整理する
- repo 本体のコード変更が不要なら **docs と artifact の整理のみ** で止める

### 既存テスト / status 確認の使い方

- unit baseline: `npm test`
- 必要時の追加確認: `npm run test:e2e`（環境負荷が大きいため、repo 本体コードを触った場合または backtest 経路の回帰確認が必要な場合に限定）
- 実機 readiness: `node src/cli/index.js status` と preset backtest warm-up

## 6. 検証コマンド

### baseline / repo 健全性

```bash
npm test
```

### dual-worker reachability

```bash
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9225/json/version
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

### warm-up（individual success の確認）

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier --symbol META
```

### 過去 runtime_ms 集計

```bash
node <session-workspace>/round8-runtime-compare_YYYYMMDD_HHMM.mjs --past-only
```

### parallel rerun（sub-agent / runner 側で並列起動）

```bash
node <session-workspace>/round8-parallel-mag7-runner_YYYYMMDD_HHMM.mjs
node <session-workspace>/round8-parallel-alt-runner_YYYYMMDD_HHMM.mjs
```

### 実測比較の最終集計

```bash
node <session-workspace>/round8-runtime-compare_YYYYMMDD_HHMM.mjs --past docs/references/backtests/round8-theme-mag7_20260405.json --past-alt docs/references/backtests/round8-theme-alt_20260405.json --current-mag7 docs/references/backtests/round8-theme-mag7-parallel_YYYYMMDD.json --current-alt docs/references/backtests/round8-theme-alt-parallel_YYYYMMDD.json
```

### 条件付き回帰確認

```bash
npm run test:e2e
npm run test:all
```

> `test:e2e` / `test:all` は repo 本体コード変更が入った場合、または round8 rerun 中に backtest 実装の回帰が疑われる場合に限る。

## 7. リスク

1. **runner 不在リスク**
   - 過去 round8 の batch runner が repo に無く、session workspace で再構築が必要になる
2. **warmed state 依存リスク**
   - individual は成功しても、warm-up 不十分だと parallel batch 序盤で `metrics_unreadable` が再発する可能性がある
3. **比較の公平性リスク**
   - 過去は `runtime_ms` 合計、今回は parallel の壁時計時間という異なる指標になるため、何を比較したかを明示しないと誤読される
4. **worker 間の負荷偏り**
   - Mag7 84 run と alt 120 run は run 数が非対称で、parallel elapsed が alt 側に強く支配される可能性がある
5. **artifact 競合リスク**
   - 並列 agent が同じファイルへ書くと結果が壊れるため、出力先を完全分離する必要がある
6. **環境依存リスク**
   - Windows session / visible state / TradingView UI 状態の揺れで再現性が崩れる可能性がある
7. **不要な repo 変更の混入**
   - 実機検証が主目的なので、runner convenience のためだけに durable code を増やさないようにする必要がある

## 8. 完了条件

- round8 の過去直列基準時間が raw JSON `runtime_ms` から集計済みである
- worker1 / worker2 の reachability / status / individual warm-up が成功し、安定条件を満たしたと記録できる
- Mag7 / alt の parallel rerun raw / summary artifact が新規保存されている
- sub-agent を parallel 起動して round8 workload を分担実行した記録が残っている
- `current_parallel_elapsed_ms`, `speedup`, `reduction_pct` を算出できている
- session log に「実行条件」「失敗有無」「所要時間比較」「過去比で何倍/何%速いか」が記載されている
- 必要なら research doc / runbook / command.md に durable な差分だけが反映されている
- repo 本体コードを変更した場合のみ、該当 test / e2e が通っている

## 9. チェックボックス形式の実装ステップ

- [ ] `command.md`、runbook、stabilization log、round8 session log を再読し、parallel rerun の前提条件を固定する
- [ ] 既存 active plan との非重複を確認し、この plan の対象を round8 parallel rerun + speed comparison に限定する
- [ ] 過去 round8 raw JSON から Mag7 / alt の `runtime_ms` 集計値（sum / avg / median / p95 / max）を取得する
- [ ] `baseline_sequential_ms` と `theoretical_parallel_floor_ms` を算出する
- [ ] repo 内に durable な round8 batch runner が無いことを確認し、必要なら session workspace artifact 方針を確定する
- [ ] `npm test` を実行して repo の unit baseline を確認する
- [ ] worker1 / worker2 の `json/version` と `status` を確認する
- [ ] worker1 で round8 系 preset の individual warm-up を成功させる
- [ ] worker2 で round8 系 preset の individual warm-up を成功させる
- [ ] warm-up result が `tester_available: true` / `restore_policy: "skip"` / `restore_success: true` / `restore_skipped: true` を満たすことを確認する
- [ ] Mag7 用 sub-agent / runner と alt 用 sub-agent / runner を **並列起動** できる形に準備する
- [ ] Mag7 sub-agent に worker1 固定で 84 run を担当させる
- [ ] alt sub-agent に worker2 固定で 120 run を担当させる
- [ ] coordinator で parallel 実測 `elapsed_ms` を記録する
- [ ] Mag7 parallel rerun raw / summary artifact を保存する
- [ ] alt parallel rerun raw / summary artifact を保存する
- [ ] 過去 baseline と今回 parallel 実測を統合し、speedup / reduction を算出する
- [ ] session log に実行順、warm-up 条件、失敗/再試行、elapsed、speedup を記録する
- [ ] 必要に応じて round8 research doc に rerun timing comparison セクションを追記する
- [ ] durable に残す価値がある操作順だけ runbook / command.md に最小追記する
- [ ] repo 本体コード変更が入った場合のみ、`npm run test:e2e` / `npm run test:all` を実施する
