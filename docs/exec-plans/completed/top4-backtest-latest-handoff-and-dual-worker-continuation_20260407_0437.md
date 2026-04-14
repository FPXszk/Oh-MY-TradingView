# 実行計画: top4 バックテスト継続・latest 導線整備・dual-worker 運用固定化 (20260407_0437)

- ステータス: COMPLETED
- 種別: research continuation / docs sync / execution plan
- 前提ブランチ: `main`

## Problem

`docs/tmp/round9-answer_20260407_0431.md` で、次に深掘るべき上位4戦略は次の4本に絞られている。

1. `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed`
2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
3. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
4. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`

一方で、次の不足が残っている。

- 「今どこまでやっていたか」を一目で復元できる latest 導線がない
- `docs/research/latest/` が存在せず、最新結果の置き場が固定されていない
- `docs/DOCUMENTATION_SYSTEM.md` から round9 / latest への導線が不足している
- current stable parallel policy は docs にあるが、top4 継続研究の入口としてまとまっていない
- 4並列はユーザー関心があるが、現時点の durable doc は dual-worker / 2並列までしか保証していない
- 最後に session log、exec-plan 整理、commit、push まで一貫して終える必要がある

## Source of truth

### 戦略選定

- `docs/tmp/round9-answer_20260407_0431.md`
- `docs/research/theme-strategy-shortlist-round9_2015_2025.md`
- `docs/research/theme-backtest-results-round9_2015_2025.md`
- `docs/research/theme-backtest-results-round9-alt_2015_2025.md`

### 並列運用

- `docs/command.md`
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`
- `docs/research/round8-parallel-optimization-analysis_20260406_1307.md`

### raw artifact

- `docs/references/backtests/round9-theme-mag7-shard-parallel_20260407_1132.json`
- `docs/references/backtests/round9-theme-mag7-shard-parallel-recovered_20260407_1145.json`
- `docs/references/backtests/round9-theme-alt-shard-parallel_20260407_0325.json`
- `docs/references/backtests/round9-theme-alt-shard-parallel-recovered_20260407_0344.json`

### 実行経路

- `src/cli/commands/backtest.js`
- `src/core/backtest.js`
- `src/core/research-backtest.js`

## 既存 active plan との関係

- `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md` は reachability 調査用であり、本件の top4 継続研究・latest 導線整備とは非競合

## 4並列の扱い

### 結論

今回は **調査・記録に留め、実装・実運用の主スコープには含めない**。

### 理由

1. durable docs で stable topology として確認できるのは dual-worker / 2並列のみ
2. same-session visible + visible ですら parallel 時に `metrics_unreadable` が出ており、2 worker の visible 化すら未安定
3. worker3 / worker4、追加 portproxy、health gate、warm-up cadence の repo 根拠がない
4. 既存の shard parallel / exact unreadable rerun / recovered summary 運用は 2 worker 前提で整理されている

### 今回やること

- latest handoff または session log に「4並列は未検証・別計画候補」と明記する
- 現行標準を dual-worker / shard parallel / exact unreadable rerun に固定する

### Out of scope

- 4 worker topology の実装
- 4 endpoint の起動と疎通確認の自動化
- 4並列 batch runner の実装

## 変更・作成・確認対象ファイル

### 確認対象

- `docs/tmp/round9-answer_20260407_0431.md`
- `docs/command.md`
- `docs/DOCUMENTATION_SYSTEM.md`
- `README.md`
- `docs/research/theme-strategy-shortlist-round9_2015_2025.md`
- `docs/research/theme-backtest-results-round9_2015_2025.md`
- `docs/research/theme-backtest-results-round9-alt_2015_2025.md`
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/working-memory/session-logs/dual-worker-parallel-backtest-handoff_20260406_0735.md`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`
- `config/backtest/strategy-presets.json`
- `tests/preset-validation.test.js`
- `tests/backtest.test.js`
- `src/cli/commands/backtest.js`
- `src/core/backtest.js`
- `src/core/research-backtest.js`

### 変更候補

- `config/backtest/strategy-presets.json`
- `tests/preset-validation.test.js`
- `tests/backtest.test.js`
- `docs/DOCUMENTATION_SYSTEM.md`
- `README.md`（必要時のみ）
- `docs/command.md`（不足注記がある場合のみ）
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`（4並列が未検証である明示が不足する場合のみ）

### 新規作成

- `docs/research/latest/`
- `docs/research/latest/README.md`
- `docs/research/latest/top4-backtest-handoff_YYYYMMDD_HHMM.md`
- `docs/research/latest/top4-backtest-results_YYYYMMDD_HHMM.md`
- `docs/references/backtests/top4-*_YYYYMMDD_HHMM.json`
- `docs/references/backtests/top4-*_YYYYMMDD_HHMM.summary.json`
- `docs/working-memory/session-logs/top4-backtest-continuation_YYYYMMDD_HHMM.md`

### 完了時に移動

- `docs/exec-plans/active/top4-backtest-latest-handoff-and-dual-worker-continuation_20260407_0437.md`
- `docs/exec-plans/completed/top4-backtest-latest-handoff-and-dual-worker-continuation_20260407_0437.md`

## 実装内容と影響範囲

### 1. latest 導線の新設

`docs/research/latest/` を作成し、current handoff と latest result の入口を固定する。

- `README.md`: まず何を読むか、top4、round9 durable docs、raw artifact、session log への導線
- `top4-backtest-handoff_YYYYMMDD_HHMM.md`: 何をしていたか、上位4戦略、現行運用方針、次の batch の狙い、4並列の扱い
- `top4-backtest-results_YYYYMMDD_HHMM.md`: 今回の最新結果要約、raw / recovered の使い分け、readability を含む採用判断

### 2. top4 継続研究の実行枠を固定

- 実行単位は top4 中心の近傍改善
- 並列方針は dual-worker / shard parallel
- long-running split は shard parallel を第一候補、strategy-aware parallel を fallback
- warm-up gate、10 run ごとの health check、`restore_policy: "skip"`、Strategy Tester `指標` タブ活性化を厳守
- unreadable は exact pair rerun
- 最終評価は recovered summary と readability count を併用

### 3. 必要時のみ preset / test を更新

新しい top4 近傍 variant を回す場合のみ、repo 側の変更は次に限定する。

- `config/backtest/strategy-presets.json` に新規 preset 追加
- `tests/preset-validation.test.js` に期待値追加
- `tests/backtest.test.js` に representative assertion 追加

CLI / core の新規サブコマンド追加は原則行わず、既存 `tv backtest preset <preset-id>` に収める。

### 4. 文書整合

- `docs/DOCUMENTATION_SYSTEM.md` に `docs/research/latest/` 導線を追加
- round9 / latest / session log の参照順を補強
- 必要時のみ `README.md`、`docs/command.md`、runbook に不足注記を最小追加

### 5. 完了物

- latest 結果 doc
- raw / summary artifact
- session log
- exec-plan completed への移動
- Conventional Commit による commit / push

## In scope

- top4 の current state 復元
- `docs/research/latest/` 新設
- top4 継続 backtest の実施
- 必要最小限の preset / test 更新
- 最新 raw / summary / recovered interpretation の保存
- `docs/DOCUMENTATION_SYSTEM.md` を中心とした docs sync
- session log、plan 移動、commit、push

## Out of scope

- 4並列の実装・実運用化
- worker3 / worker4 の起動設計
- dual-worker topology の再設計
- generic research batch runner の repo 常設実装
- unrelated docs の全面改稿

## TDD 方針（RED -> GREEN -> REFACTOR）

### RED

top4 近傍改善で新規 preset が必要な場合、先に失敗テストを書く。

- `tests/preset-validation.test.js`
  - preset id 存在
  - tag / implementation_stage / theme metadata 整合
  - executable duplicate なし
- `tests/backtest.test.js`
  - generator 出力に regime / stop / overlay が反映されること

### GREEN

- `config/backtest/strategy-presets.json` に最小差分で preset 追加
- 必要最小限の generator 互換修正のみで RED を通す
- 実機 backtest は既存 CLI / research path で実行する

### REFACTOR

- duplicate / alias 整理
- latest 命名と責務の統一
- `DOCUMENTATION_SYSTEM.md` と latest handoff の重複削減

## 既存テスト・検証コマンド

### repo テスト

```bash
node --test tests/preset-validation.test.js tests/backtest.test.js
npm test
```

### worker readiness

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9225/json/version
```

### representative warm-up

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed --symbol AAPL
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight --symbol AAPL
```

### docs 整合確認

```bash
git --no-pager diff -- docs/DOCUMENTATION_SYSTEM.md README.md docs/command.md docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md
git --no-pager diff -- docs/research/latest docs/research docs/working-memory/session-logs
git --no-pager status --short
```

## リスクと確認事項

1. generic batch runner が repo 外の session artifact runner 前提であること
2. top4 近傍改善が duplicate になる可能性があること
3. `quality-strict` や `breadth-quality-balanced-wide` を unreadable を無視して過大採用しないこと
4. runbook / command と latest doc の役割が混ざらないようにすること
5. 4並列は話題先行にせず、未検証として切り離すこと
6. dual-worker health が崩れた場合に warm-up gate と 10 run cadence を飛ばさないこと

## 実装ステップ

### Phase 0: 文脈復元と境界固定

- [ ] `docs/tmp/round9-answer_20260407_0431.md`、round9 research docs、session logs を読み、上位4戦略と現行 policy を再確認する
- [ ] `docs/command.md` と runbook を読み、stable topology が dual-worker / 2並列であることを固定する
- [ ] backtest 実行経路（`src/cli/commands/backtest.js`, `src/core/backtest.js`, `src/core/research-backtest.js`）を確認する
- [ ] active exec-plan 非競合を確認する

### Phase 1: latest 導線の設計

- [ ] `docs/research/latest/` の責務を current handoff + latest result 入口に限定する
- [ ] `docs/research/latest/README.md` の構成を決める
- [ ] handoff / results doc の章立てを決める
- [ ] `docs/DOCUMENTATION_SYSTEM.md` の導線更新箇所を決める

### Phase 2: top4 近傍改善の TDD（必要時のみ）

- [ ] 上位4戦略について「そのまま再実行」と「新規 variant 追加」を切り分ける
- [ ] `tests/preset-validation.test.js` に RED を追加する
- [ ] `tests/backtest.test.js` に RED を追加する
- [ ] targeted test を失敗させる
- [ ] `config/backtest/strategy-presets.json` を最小差分で更新する
- [ ] targeted test を通す
- [ ] `npm test` を通す

### Phase 3: dual-worker 実行準備

- [ ] worker1 / worker2 の `status` / `json/version` を確認する
- [ ] warm-up を行い、`tester_available: true` 3連続を確認する
- [ ] `restore_policy: "skip"` / `restore_success: true` / `restore_skipped: true` を確認する
- [ ] batch を shard 単位に割り、2 worker に配置する
- [ ] health check cadence を 10 run ごとに固定する

### Phase 4: top4 継続 backtest 実行

- [ ] shard parallel を第一候補として batch を実行する
- [ ] raw merge / summary を生成する
- [ ] unreadable pair を exact pair rerun で回収する
- [ ] recovered summary を正規結果として採用する
- [ ] readability count を含めて top4 の順位変化を整理する
- [ ] 4並列は未着手・未検証として handoff に残す

### Phase 5: docs と latest 更新

- [ ] `docs/research/latest/README.md` を作成する
- [ ] `docs/research/latest/top4-backtest-handoff_YYYYMMDD_HHMM.md` を作成する
- [ ] `docs/research/latest/top4-backtest-results_YYYYMMDD_HHMM.md` を作成する
- [ ] raw / summary artifact を `docs/references/backtests/` に保存する
- [ ] `docs/DOCUMENTATION_SYSTEM.md` を更新する
- [ ] 必要時のみ `README.md`、`docs/command.md`、runbook を最小更新する

### Phase 6: session log と完了処理

- [ ] `docs/working-memory/session-logs/top4-backtest-continuation_YYYYMMDD_HHMM.md` を作成する
- [ ] top4、dual-worker policy、4並列は別計画である旨を残す
- [ ] diff と status で整合を確認する
- [ ] exec-plan を `completed/` に移す
- [ ] Conventional Commit で commit する
- [ ] push する

## Completion criteria

- `docs/research/latest/` が存在し、current handoff と latest result の入口になっている
- 上位4戦略と現行並列運用方針を latest handoff から辿れる
- 最新 backtest raw / summary / recovered interpretation が repo に保存されている
- `docs/DOCUMENTATION_SYSTEM.md` が latest / round9 / session log への導線を持つ
- current stable policy が dual-worker / shard parallel のまま維持されている
- 4並列は未検証・別計画として明確に整理されている
- session log、exec-plan 移動、commit、push まで完了している
