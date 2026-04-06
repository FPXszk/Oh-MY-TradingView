# 実行計画: round8 並列分割・安定化・高速化調査 (20260406_2209)

- ステータス: ACTIVE
- 種別: 調査 / docs 更新中心
- 前提:
  - 直前検証では round8 全体の二重実行ではなく、`worker1=Mag7 84 run` / `worker2=alt 120 run` に分割して並列化した
  - 実測は `baseline 50.06 min` に対し `current parallel wall-clock 52.76 min` で speedup 未達
  - 一方で `current aggregate runtime 81.46 min` に対して `parallel wall-clock 52.76 min` なので、同条件内での並列化効果自体は存在した
  - 主因候補は `worker2` の途中断と retry、1 run あたり runtime 膨張、`tester_available` 低下

## 1. 問題設定と到達目標

### 問題設定

直前の round8 parallel validation により、dual-worker 並列実行そのものは成立したが、**end-to-end wall-clock では過去 baseline を上回れなかった**。  
したがって次に必要なのは、単なる「もう一度回す」ことではなく、

1. **どの分割粒度なら wall-clock を縮めやすいか**
2. **どの安定化施策が retry / runtime 膨張 / tester_available 低下を抑えられるか**
3. **速度改善余地がどこにあり、追加実測の優先順位をどう置くべきか**

を、既存 artifact と必要最小限の確認で整理して durable なドキュメントへ落とすことである。

### 到達目標

- 既存 round8 artifact / session log から、**速度未達の支配要因**を分解して説明できる
- shard 戦略候補を比較し、**次回実装・再実測の第一候補**を 1〜2 案に絞れる
- 安定性改善候補を、**即試すべき運用改善** と **追加設計が要る改善** に分けて整理できる
- 速度改善候補を、**期待効果 / 実装コスト / 必要実測** の観点で優先順位付けできる
- 調査結果を session log と durable な docs に残し、既存 active plan と重複しない follow-up 方針を明文化できる

## 2. scope / out-of-scope

### scope

- `round8-parallel-validation_20260406_1252.md` と speed comparison JSON の再読
- run 粒度ごとの shard 戦略候補の整理と比較
- 安定性改善候補の整理
- 速度改善候補の整理
- 必要最小限の追加分析
  - 既存 JSON からの runtime 分布 / run 偏り / tester_available 差分確認
  - 必要なら単発 status / warm-up / 少数 sample run のみ
- 調査結果の docs 化
- 新規 session log の作成

### out-of-scope

- repo 本体の backtest ロジック改修
- full 204 run の再実行を前提にした再検証
- 新規 CLI / MCP 機能追加
- dual-worker 構成そのものの作り直し
- `wsl-dual-worker-reachability` 系の proxy 復旧作業の再実施
- round8 の strategy ranking や strategy 選定ロジックの再評価

## 3. 既存 active plan との関係

- `docs/exec-plans/active/round8-parallel-validation-speedup_20260406_2048.md`
  - こちらは **round8 workload を実際に parallel rerun して speedup を測る計画**だった
  - 今回 plan は、その実測結果を受けた **事後分析 / 次回改善案の整理 / docs 化** が対象
  - 原則として full rerun の再実施は扱わず、必要な場合も sample 確認までに限定する
- `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md`
  - こちらは **WSL↔Windows の到達性 / portproxy / proxy layer** が対象
  - 今回 plan は reachability を前提条件として消費するだけで、復旧作業そのものは扱わない

> つまり本 plan は、既存 active plan の成果物を入力にして **分割設計・安定化・高速化の意思決定材料を作る** ものであり、作業範囲は重複しない。

## 4. 参照・更新・新規作成ファイル一覧

### 参照

- `docs/working-memory/session-logs/round8-parallel-validation_20260406_1252.md`
- `docs/references/backtests/round8-parallel-speed-comparison_20260406_1145.json`
- `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `command.md`
- `docs/exec-plans/active/round8-parallel-validation-speedup_20260406_2048.md`
- `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md`
- `docs/references/backtests/round8-theme-mag7_20260405.json`
- `docs/references/backtests/round8-theme-alt_20260405.json`
- `docs/references/backtests/round8-theme-mag7-parallel_20260406_1145.json`
- `docs/references/backtests/round8-theme-alt-parallel_20260406_1145.json`

### 更新候補

- `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`
  - shard 設計 / 長時間安定化 / readiness 条件として durable 化すべき内容がある場合のみ
- `command.md`
  - operator 向けの恒久的な手順差分がある場合のみ
- `docs/research/theme-backtest-results-round8_2015_2025.md`
  - round8 実行条件メモとして speed / stability 補足を入れる価値がある場合のみ
- `docs/research/theme-backtest-results-round8-alt_2015_2025.md`
  - alt 側の retry / runtime 膨張を round8 実行条件として補足する価値がある場合のみ

### 新規作成

- `docs/research/round8-parallel-optimization-analysis_YYYYMMDD_HHMM.md`
  - shard 戦略比較、安定性改善候補、速度改善候補、追加検証提案をまとめる durable doc
- `docs/working-memory/session-logs/round8-parallel-optimization-followup_YYYYMMDD_HHMM.md`
  - 今回セッションの観測、判断、追加コマンド、結論を残す session log

### session workspace artifact（必要時のみ、repo 非コミット）

- `~/.copilot/session-state/round8-parallel-analysis_YYYYMMDD_HHMM.mjs`
  - 既存 JSON から runtime 分布 / shard 候補別の偏りを比較する一時集計用

> repo コード変更は前提にしない。分析スクリプトが必要でも session workspace artifact に限定する。

## 5. 調査方針

### 5.1 run 粒度の shard 戦略候補

候補は次の順で比較する。

1. **現状方式: workload 固定分割**
   - `worker1=Mag7 84 run`
   - `worker2=alt 120 run`
   - 比較基準として残す
2. **204 run の均等分割**
   - run 数だけで `102 / 102` に揃える
   - 長所: 実装が比較的単純
   - 短所: runtime の重い run が偏ると wall-clock は揃わない
3. **strategy 単位分割**
   - strategy ごとに worker を固定割当
   - 長所: manifest が簡潔で retry しやすい
   - 短所: strategy により symbol 数や runtime 分布が偏る可能性がある
4. **symbol 単位分割**
   - symbol ごとに worker を固定割当
   - 長所: 同一 symbol の局所的な不安定性を隔離しやすい
   - 短所: alt の universe 構造と噛み合わない可能性がある
5. **universe 単位分割**
   - `Mag7 / sp500-top10-point-in-time / mega-cap-ex-nvda` など universe ごとに分ける
   - 長所: 論理的に理解しやすい
   - 短所: run 数・runtime が不均衡になりやすい
6. **historical runtime ベースの重み付き分割**
   - 過去 `runtime_ms` を重みとして 2 worker の合計予測時間が近くなるように組む
   - 長所: wall-clock 最適化の本命候補
   - 短所: manifest 生成が少し複雑
7. **hybrid 分割**
   - 大枠は universe / strategy で分けつつ、重い run だけ別 worker に逃がす
   - 長所: 運用理解と負荷均等化の両立ができる
   - 短所: ルール設計が曖昧だと保守しにくい

調査では少なくとも以下を比較する。

- run_count の偏り
- 過去 runtime sum の偏り
- current parallel runtime sum の偏り
- retry が起きた場合の回復しやすさ
- progress checkpoint の切りやすさ

### 5.2 安定性改善候補

優先的に検討するのは以下。

1. **worker2 長時間安定性**
   - 長尺 batch 前の warm-up 本数
   - 定期 health check
   - 長時間での `tester_available` 低下検知
2. **warm-up 改善**
   - 各 worker の単発 warm-up を 1 回でなく複数条件で判定するか
   - warm-up success 後に batch 開始までの待機 / 状態固定が要るか
3. **retry policy**
   - 全 retry ではなく partial retry を標準化する
   - retry 回数上限と restart budget を決める
4. **health check**
   - batch 中の一定 run ごとの `status` / result shape 監視
   - `tester_available` 低下率が閾値を超えたら停止するか
5. **progress checkpoint**
   - shard manifest ごとの完了記録
   - 失敗 run の再試行を再起動後に正確に再開できる形へする
6. **preflight readiness 判定**
   - `status.success` だけでなく
   - `tester_available`, `restore_policy`, `restore_success`, `restore_skipped`
   - sample backtest result
   を満たしてから batch 開始する

### 5.3 速度改善候補

優先調査対象は次の通り。

1. **負荷均等化**
   - run 数ではなく historical runtime に基づいて分ける
2. **遅い run の隔離**
   - p95 / max 近傍の run を片側に偏らせない
3. **partial retry**
   - 全体 rerun を避け、失敗 run のみ再投入する
4. **事前 readiness 判定**
   - unstable worker を batch に入れない
5. **aggregator 改善**
   - 集計待ちの手戻りを減らすため、run 終了時に checkpoint を積む
6. **順序最適化**
   - 重い run を先頭に寄せるか、逆に軽い run で warm 状態を作ってから重い run に入るかを比較する
7. **tester_available 低下の直接要因調査**
   - 速度低下の多くが metrics unreadable / unreadable recovery 待ちに起因するなら、安定性改善が最大の速度改善になる

### 5.4 どこまで実測し、どこから設計 / 調査に留めるか

今回 plan では、原則として **既存 artifact からの分析を主軸**にする。

- **実施する可能性がある実測**
  - `npm test`
  - `status`
  - 各 worker の単発 warm-up
  - 1〜数本の sample run
- **今回 plan で前提にしない実測**
  - full 204 run rerun
  - shard 戦略ごとの大規模 A/B 測定
  - repo 本体コードを伴う実装検証

つまり、**次の実装・再実測の優先順位を決めるための調査と設計** までを今回の完了ラインとする。

## 6. RED→GREEN→REFACTOR のテスト / 検証方針

今回は主に調査と docs 更新だが、既存コマンドを使って検証の質を担保する。

### RED

- 既存 docs / JSON を再読し、現状の説明が「なぜ遅かったか」を十分に答え切れていない箇所を明確にする
- 既存 active plan と重複しないことを確認する
- 必要なら `npm test` と `status` で baseline を再確認し、環境前提が崩れていないかを見る

### GREEN

- shard 戦略比較、安定性改善候補、速度改善候補を docs に整理する
- 追加 sample 確認を行った場合は、その結果を session log に残す
- 次回の実装・再実測に使える validation command と完了条件を定義する

### REFACTOR

- 重複する観測を runbook / research doc / session log の役割で整理する
- durable に残すべき事項だけを runbook / command.md に寄せ、セッション限定の判断は session log に閉じる
- 分析補助スクリプトを使った場合は repo に残さず session workspace のみに留める

### 既存コマンドの使い方

- baseline test: `npm test`
- 状態確認: `node src/cli/index.js status`
- 必要時の backtest readiness 確認: `node src/cli/index.js backtest preset ...`
- JSON 分析: `node -e` または session workspace artifact

## 7. 検証コマンド

### repo baseline

```bash
npm test
```

### worker readiness

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

### 必要時の単発 warm-up

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier --symbol META
```

### 既存 JSON の差分確認

```bash
node -e "const fs=require('fs');const a=JSON.parse(fs.readFileSync('docs/references/backtests/round8-theme-mag7_20260405.json','utf8'));const b=JSON.parse(fs.readFileSync('docs/references/backtests/round8-theme-mag7-parallel_20260406_1145.json','utf8'));console.log(a.length,b.length)"
node -e "const fs=require('fs');const a=JSON.parse(fs.readFileSync('docs/references/backtests/round8-theme-alt_20260405.json','utf8'));const b=JSON.parse(fs.readFileSync('docs/references/backtests/round8-theme-alt-parallel_20260406_1145.json','utf8'));console.log(a.length,b.length)"
```

### 必要時の session workspace 集計

```bash
node ~/.copilot/session-state/round8-parallel-analysis_YYYYMMDD_HHMM.mjs
```

> 追加実測は必要最小限に留め、full rerun はこの plan の完了条件に含めない。

## 8. リスク

1. **分析だけでは因果が断定できない**
   - 既存 artifact だけでは worker2 途中断の根因まで断定できない可能性がある
2. **実測を増やしすぎると調査 scope を逸脱する**
   - 今回は改善案整理が目的であり、大規模 rerun は別計画に分ける必要がある
3. **run 粒度比較が複雑化する**
   - shard 候補を増やしすぎると結論が散るため、最終的には 1〜2 案へ絞る必要がある
4. **durable doc と session log の役割混在**
   - 一時的な観測まで runbook に入れると保守負荷が上がる
5. **worker readiness の前提変動**
   - 調査時点で環境が変わっていると、直前 session の知見がそのまま再現しないことがある

## 9. 完了条件

- 速度未達の主因を、少なくとも
  - 分割偏り
  - worker2 安定性
  - runtime 膨張
  - `tester_available` 低下
  の観点で整理できている
- shard 戦略候補について、比較表または同等の構造で
  - 期待効果
  - 実装 / 運用コスト
  - retry しやすさ
  - 次回の第一候補
  が示されている
- 安定性改善候補について、即試すべき項目と追加設計が要る項目が分かれている
- 速度改善候補について、追加で実測すべきものと設計で先に決められるものが分かれている
- `docs/research/round8-parallel-optimization-analysis_YYYYMMDD_HHMM.md` に調査結果が記載されている
- `docs/working-memory/session-logs/round8-parallel-optimization-followup_YYYYMMDD_HHMM.md` に今回セッションの記録が残っている
- 必要なら runbook / command.md に durable な差分だけが最小反映されている

## 10. チェックボックス形式の実装ステップ

- [ ] 既存 active plan 2 本を再読し、今回 plan の非重複範囲を確定する
- [ ] `round8-parallel-validation_20260406_1252.md` と speed comparison JSON を再読し、問題仮説を列挙する
- [ ] past/current artifact から run_count、runtime 分布、`tester_available` 差分を整理する
- [ ] shard 戦略候補（均等分割 / strategy 単位 / symbol 単位 / universe 単位 / runtime 重み付き / hybrid）を比較表にする
- [ ] 現状の `Mag7 84 / alt 120` 固定分割が不利だった点と、有利だった点を整理する
- [ ] worker2 長時間安定性、warm-up、retry policy、health check、progress checkpoint の改善候補を整理する
- [ ] 負荷均等化、遅い run の隔離、partial retry、readiness 判定、aggregator 改善の速度改善候補を整理する
- [ ] どこまでを既存 artifact 分析で済ませ、どこからを次回追加実測へ回すかを線引きする
- [ ] 必要なら `npm test` を実行して repo baseline を再確認する
- [ ] 必要なら `status` と単発 warm-up で worker readiness をスポット確認する
- [ ] durable doc `docs/research/round8-parallel-optimization-analysis_YYYYMMDD_HHMM.md` を作成する
- [ ] session log `docs/working-memory/session-logs/round8-parallel-optimization-followup_YYYYMMDD_HHMM.md` を作成する
- [ ] durable に残す価値がある手順差分だけを runbook / command.md の更新候補として切り出す
- [ ] 次回の実装 / 再実測で試す第一候補案を 1〜2 件に絞って明記する

## 11. pre-implementation completeness checklist

- [x] Files listed
- [x] Scope bounded
- [x] Test strategy stated
- [x] Validation commands identified
- [x] Risks noted
- [x] No overlap with existing plans
