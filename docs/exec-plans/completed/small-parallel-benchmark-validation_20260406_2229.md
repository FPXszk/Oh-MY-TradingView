# 実行計画: 小規模バックテストでの sequential vs parallel 実測比較 (20260406_2229)

## 問題

直前に深掘りした parallel optimization の仮説について、いきなり full rerun を行わず、**小さめの実バックテスト workload** で先に妥当性を検証する。  
目的は、同一 workload を以下 3 条件で比較し、**「parallel は本当に速くなるか」** を確認すること。

1. **baseline:** sequential
2. **recommended parallel:** strategy-aware split + runtime-aware 2-way balance
3. **secondary parallel:** shard split

速度だけでなく、以下も同時に観測対象とする。

- `tester_available`
- `metrics_unreadable`
- health check 成否
- retry 発生有無と retry 範囲
- restart 発生有無（budget 内か）

## 参照・前提

- `command.md` 7c
- `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/research/round8-parallel-optimization-analysis_20260406_1307.md`
- `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md`

上記 active plan は dual-worker 前提の健全性確認を扱っているが、今回の benchmark / split 比較とは直接競合しない。

## 変更・作成候補ファイル

### 作成候補

- `docs/exec-plans/active/small-parallel-benchmark-validation_20260406_2229.md`
- `config/backtest/parallel-benchmark-sample.json`
- `docs/research/parallel-benchmark-<timestamp>.md`
- `docs/working-memory/session-logs/parallel-benchmark-<timestamp>.md`

### 変更候補

- `src/cli/commands/backtest.js`
- `src/core/backtest.js`
- `src/core/research-backtest.js`
- `tests/backtest.test.js`
- `tests/e2e.backtest.test.js`
- `command.md`
- `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`

## スコープ

### In Scope

- 小規模 benchmark 用 workload の定義
- 同一 workload に対する 3 比較条件の実装
- strategy-aware split と shard split の比較可能化
- wall-clock / retry / health / unreadable の比較サマリ出力
- 既存 dual-worker 運用条件に沿った benchmark 実行

### Out of Scope

- full round8 workload の再実行
- dual-worker topology の再設計
- visible + visible の再検証
- 大規模 queue / checkpoint 基盤の本格実装
- parallel 高速化の根本原因の完全解明
- 無関係な CLI / docs / backtest 機能の整理

## benchmark 設計

### 比較対象

- **Sequential**
  - 1 worker で同一 workload を順次実行
- **Recommended parallel**
  - strategy 単位で chunk 化
  - 過去 runtime または seed 重みで greedy 2-way balance
- **Secondary parallel**
  - 同一 workload を小さめ shard に分割して 2 worker queue で処理
  - 本番 30〜40 run の完全再現ではなく、**小規模 benchmark として成立する縮小版**で比較

### 小さい workload の方針

- まずは **12〜20 run 程度**を目安にする
- 既存 preset と既存 universe から組める範囲で構成する
- 短時間で 3 条件を回せるサイズを優先する

### 観測項目

- total wall-clock
- per-worker 件数
- 予測 runtime バランスと実測差
- `tester_available` 成否
- `metrics_unreadable` 件数
- health check 実施回数 / 成否
- retry 回数 / retry 対象 run 数
- restart 回数
- success / partial retry success / failed の内訳

## テスト・検証方針

### RED

- `tests/backtest.test.js` に失敗テストを追加
  - 同一 workload から sequential / strategy-aware / shard split の各 plan が生成できる
  - strategy-aware split が runtime 差を縮める
  - shard split が retry 単位を小さく保つ
  - benchmark summary が wall-clock / unreadable / retry / restart を集計できる
- 必要に応じて `tests/e2e.backtest.test.js` に失敗テストを追加
  - benchmark 実行結果が比較可能な構造で返る
  - readiness 崩れ時に partial retry 系の結果が表現できる

### GREEN

- 最小限の benchmark planner / runner / summarizer を実装
- 同一 workload の 3 条件比較を可能にする
- 10 run ごとの health check、restart budget、partial retry 優先を組み込む
- 既存 backtest 実行を壊さない

### REFACTOR

- split 生成と結果集計を pure function 化
- CLI 層と core 層の責務分離
- benchmark 用 config / result shape を整理
- 比較表・研究メモ出力を最小限で整える

## 検証コマンド

### 事前 readiness

- `curl -sS http://<host>:9223/json/version`
- `curl -sS http://<host>:9225/json/version`
- `TV_CDP_HOST=<host> TV_CDP_PORT=9223 node src/cli/index.js status`
- `TV_CDP_HOST=<host> TV_CDP_PORT=9225 node src/cli/index.js status`

### warm-up gate

- 各 worker で `tester_available: true` を 3 連続確認
- `metrics_unreadable = 0` を確認
- `restore_policy: "skip"` 系 result shape を確認

### repo validation

- `npm test`
- `npm run test:e2e`

### benchmark validation

- sequential 実行
- recommended parallel 実行
- secondary parallel 実行
- 各条件で **10 run ごと** に `status` / `json/version` を確認
- failure 時は full rerun ではなく partial retry を優先
- restart は 1 parallel session あたり最大 1 回

## リスク

- 小さすぎる workload だと warm-up ノイズが支配的になる
- runtime seed が粗いと strategy-aware split の比較精度が落ちる
- topology 前提が崩れると benchmark 以前に測定不能になる
- benchmark 実装が既存 backtest フローへ副作用を持つ可能性がある

## 実装ステップ

- [ ] active plan との非競合を明記し、今回 plan の対象を small benchmark comparison に限定する
- [ ] 小規模 workload（12〜20 run 目安）を定義する
- [ ] 比較対象を sequential / recommended parallel / secondary parallel の 3 条件に固定する
- [ ] strategy-aware split の runtime-aware 2-way balance 仕様を決める
- [ ] shard split の小規模 benchmark 向け shard 単位を決める
- [ ] `tests/backtest.test.js` に planner / summary の RED テストを追加する
- [ ] 必要なら `tests/e2e.backtest.test.js` に benchmark フローの RED テストを追加する
- [ ] benchmark planner / runner / summarizer を最小構成で実装する
- [ ] CLI から benchmark 実行できる入口を追加する
- [ ] 10 run cadence の health check、restart budget、partial retry 優先を実装に反映する
- [ ] `npm test` と `npm run test:e2e` で検証する
- [ ] readiness gate を満たした状態で 3 条件を同一 workload で実測する
- [ ] wall-clock / unreadable / retry / restart / health check 成否を比較表にまとめる
- [ ] 結果を research doc に残し、full rerun 前の推奨方針を明文化する

## 期待成果

- 小規模 workload で再現可能な benchmark 実行経路
- sequential / recommended parallel / secondary parallel の比較表
- 「recommended parallel は本当に速いか」の判断材料
- 「shard split は速度差以上に retry 性で有利か」の判断材料
- full rerun 前に採用すべき split 方針の明確化
