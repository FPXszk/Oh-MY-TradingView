# 実行計画: current docs guidance closeout と round9 strong7 shard-parallel 深掘り (20260407_0125)

- ステータス: COMPLETED
- 種別: docs closeout / research implementation plan
- 前提ブランチ: `main`

## Problem

現時点で、直前の docs guidance 更新が未コミットのまま残っており、そのままでは round9 の実装・実行・文書化に入る境界が曖昧である。

同時に、round8 の結果を踏まえて次の round9 では、**Mag7 の見た目の強さではなく cross-universe での残り方を優先**しつつ、duplicate / alias を整理したうえで strong 7 を再定義し、最新 guidance に従って **shard parallel を標準実行方式**として深掘りを進める必要がある。

この plan の目的は次の 2 段階を一貫した実行順で固定すること。

1. まず current docs guidance 変更を正しく close / commit / push する
2. 続けて round9 を strong 7 ベースで実装・実行・文書化し、結果を commit / push する

## Approach

今回の作業は **2 フェーズ**で進める。

### Phase A: current docs guidance closeout

- `parallel-backtest-guidance-integration-review_20260407_0035.md` の対象だった未コミット変更をレビューし、必要最小限の整合性調整を行う
- durable source of truth を `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md` に固定する
- `docs/command.md` を quick reference として同期する
- 直前 task の active plan を `completed/` へ移し、docs guidance の変更だけを独立コミットして push する

### Phase B: round9 strong7 shard-parallel deepening

- round8 の strong top 群から **cross-universe robustness 優先**で strong 7 を定義する
- duplicate / alias を排除したうえで、7 本の anchor とその近傍改善 preset を round9 として追加する
- RED -> GREEN -> REFACTOR で preset catalog / generator / docs を拡張する
- 実行は `shard parallel` を標準とし、`Mag7 vs alt` の固定 2 分割には戻さない
- Mag7 -> alt rerun -> result write-up -> final commit / push の順で進める

## Relationship to existing active plans / non-conflict

- `docs/exec-plans/active/parallel-backtest-guidance-integration-review_20260407_0035.md`
  - 今回の **Phase A で close 対象**
  - この commit で `docs/exec-plans/completed/parallel-backtest-guidance-integration-review_20260407_0035.md` へ移動してよい
- `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md`
  - proxy / reachability の別テーマであり、今回の docs closeout / round9 research とは非競合
  - active のまま維持する
- 本 plan は、docs guidance closeout の後に round9 実装へ進むための新規 active plan として扱う

## Source of truth

### durable guidance

- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`

### quick reference

- `docs/command.md`

### round8 evidence

- `docs/research/theme-backtest-results-round8_2015_2025.md`
- `docs/research/theme-backtest-results-round8-alt_2015_2025.md`
- `docs/research/theme-strategy-shortlist-round8_2015_2025.md`

## round9 strong 7 の選定方針

### 選定ルール

1. **cross-universe で残った枝を優先**
   - Mag7 首位だけではなく、alt で崩れなかったかを重視する
2. **duplicate / alias を先に除外**
   - `breadth-balanced` は `breadth-earlier` と Mag7 同値
   - `breadth-quality-early` は `breadth-early-guarded` と executable duplicate
3. **family coverage を維持**
   - breadth / quality / deep-pullback を最低 1 本ずつ残す
4. **7 本目は control 枠**
   - round8 の tuned winner 群だけで閉じず、round7 base を 1 本戻して overfit を監視する

### round9 strong 7（anchor ids）

| # | id | 採用理由 |
|---|---|---|
| 1 | `donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier` | round8 で breadth 本線の代表。duplicate 整理後も枝の中心として残す価値が高い |
| 2 | `donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced` | Mag7 上位かつ alt でも本線候補。quality 枝の最有力 tuned 版 |
| 3 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight` | alt 側の強さが明確。deep-pullback 枝の round9 主軸 |
| 4 | `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-6pct-theme-quality-strict-guarded` | quality strict の DD 改善代表。balanced と対になる |
| 5 | `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-6pct-theme-breadth-quality-strict` | breadth と quality の中間解。cross-universe での残り方確認が必要 |
| 6 | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-early-guarded` | executable duplicate 整理後に breadth stop 付与代表として残す |
| 7 | `donchian-55-20-spy-filter-rsi14-regime-60-theme-quality-strict` | round7 base 再投入の control 枠。balanced / guarded が base 改善なのかを round9 で検証するために採用 |

### 明示的に外す候補

- `donchian-55-20-rsp-filter-rsi14-regime-50-theme-breadth-balanced`
  - `breadth-earlier` と Mag7 同値で、round9 の strong 7 には重複度が高い
- `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-6pct-theme-breadth-quality-early`
  - `breadth-early-guarded` と executable duplicate
- acceleration 系
  - round8 時点では補完枠であり、round9 の strong 7 本線からは外す

## round9 で追加 / 変更する preset 方針

### 既存 preset の扱い

- strong 7 の anchor preset は **既存 id をそのまま control / baseline として再利用**する
- 既存 preset のロジック変更は行わず、必要なら tag / metadata の追記だけに留める
- round9 の改善は **新規 preset 追加**で表現し、既存 round7 / round8 の再現性を壊さない

### round9 で追加する新規 preset（1 anchor につき 1 近傍）

| anchor | round9 追加候補 id | 狙い |
|---|---|---|
| breadth-earlier | `donchian-55-20-rsp-filter-rsi14-regime-40-hard-stop-6pct-theme-breadth-earlier-guarded` | earliest 系に最小限の guard を足し、alt DD を改善できるか確認 |
| quality-strict-balanced | `donchian-55-20-spy-filter-rsi14-regime-50-hard-stop-6pct-theme-quality-strict-balanced-guarded` | balanced に軽い guard を足して、Mag7 優位を維持したまま alt を改善できるか確認 |
| deep-pullback-tight | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict` | stop 8% は維持しつつ entry を strict 側へ寄せ、deep-pullback の本質が緩い regime 依存かを検証 |
| quality-strict-guarded | `donchian-55-20-spy-filter-rsi14-regime-60-hard-stop-8pct-theme-quality-strict-guarded-wide` | guarded strict の stop を広げ、guard の早切りが強すぎるかを確認 |
| breadth-quality-strict | `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide` | round7 base と round8 strict の中間として、balanced + wide stop の残り方を見る |
| breadth-early-guarded | `donchian-55-20-rsp-filter-rsi14-regime-45-hard-stop-8pct-theme-breadth-early-guarded-wide` | early guard の stop 幅を緩めて過剰防御を点検 |
| quality-strict (base control) | `donchian-55-20-spy-filter-rsi14-regime-45-theme-quality-strict-relaxed` | round7 base の純粋な entry 緩和限界を調べ、balanced 系との違いを比較する |

### preset 設計上の制約

- builder family は既存の `donchian_breakout` 内に留める
- duplicate / alias は round8 より厳格に管理し、**executable duplicate が出た案は round9 へ入れない**
- `implementation_stage = round9` で追加する preset は **7 new variants**
- 実行セット全体は **7 anchors + 7 new variants = 14 preset** を上限目安とする
- round9 実装中に canonicalization 上の重複が見つかった場合は、preset を増やすより **削る** 方を優先する

## Files to modify / move / create

### Phase A で変更・移動

- `docs/command.md`
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/exec-plans/active/parallel-backtest-guidance-integration-review_20260407_0035.md`
- `docs/exec-plans/completed/parallel-backtest-guidance-integration-review_20260407_0035.md`
- `docs/exec-plans/completed/mid-parallel-benchmark-hybrid-partial-retry_20260406_2330.md`
- `docs/references/backtests/mid-parallel-benchmark-comparison_20260406_2330.json`
- `docs/research/mid-parallel-benchmark-analysis_20260406_2330.md`
- `docs/working-memory/session-logs/mid-parallel-benchmark-hybrid-partial-retry_20260406_2330.md`

### round9 実装で変更

- `config/backtest/strategy-presets.json`
- `tests/preset-validation.test.js`
- `tests/backtest.test.js`

### round9 で新規作成

- `docs/research/theme-strategy-shortlist-round9_2015_2025.md`
- `docs/research/theme-backtest-results-round9_2015_2025.md`
- `docs/research/theme-backtest-results-round9-alt_2015_2025.md`
- `docs/research/theme-signal-observation-round9_2015_2025.md`
- `docs/references/backtests/round9-theme-mag7-shard-parallel_YYYYMMDD_HHMM.json`
- `docs/references/backtests/round9-theme-mag7-shard-parallel_YYYYMMDD_HHMM.summary.json`
- `docs/references/backtests/round9-theme-alt-shard-parallel_YYYYMMDD_HHMM.json`
- `docs/references/backtests/round9-theme-alt-shard-parallel_YYYYMMDD_HHMM.summary.json`
- `docs/working-memory/session-logs/round9-strong7-shard-parallel_YYYYMMDD_HHMM.md`

### round9 完了時に移動

- `docs/exec-plans/active/round9-strong7-shard-parallel-deepening_20260407_0125.md`
- `docs/exec-plans/completed/round9-strong7-shard-parallel-deepening_20260407_0125.md`

## Scope

- current docs guidance 変更の close / commit / push
- round9 strong 7 の明示的定義
- round9 preset 追加
- round9 の Mag7 / alt 実行
- result JSON / summary / research docs / session log の作成
- shard parallel を前提にした実行・検証フローの固定
- round9 の commit / push

## Out of scope

- `wsl-dual-worker-reachability` の再調査
- worker topology の再設計
- 新しい parallel mode の実装
- naive partial retry の改良実装
- round1〜round8 の既存 preset ロジック変更
- acceleration family の本線復帰

## RED -> GREEN -> REFACTOR の test strategy

### RED

`tests/preset-validation.test.js` と `tests/backtest.test.js` に先に round9 期待値を追加し、失敗を確認する。

追加する RED の中心:

- round9 preset 数 (`7` 想定) の検証
- 全 round9 preset に `round9` tag が付いていること
- round9 expected ids がすべて catalog に存在すること
- round9 の theme metadata / taxonomy tag が想定通りであること
- round9 に executable duplicate が混入していないこと
- representative preset について generator 出力が想定の regime / stop を含むこと

### GREEN

- `config/backtest/strategy-presets.json` に round9 preset を追加する
- metadata / tags / implementation_stage / theme_axis / theme_notes を揃える
- 必要最小限の generator / validation 対応だけを行い、RED を通す

### REFACTOR

- round9 の duplicate 判定を round8 より明確化する
- round7 / round8 / round9 の test 構造を揃える
- round9 docs の shortlist / results / alt results / signal observation の naming と役割を round7 / round8 に合わせる

## shard parallel 前提の実行・検証方針

### 実行原則

- durable guidance は `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- 第一候補は **shard parallel**
- `Mag7 / alt` の固定 2 分割には戻さない
- `unreadable 1回` 即 rollback の naive partial retry は使わない

### 実行前 gate

各 worker で以下を満たしてから batch に入る。

1. `status.success: true`
2. `tester_available: true` を 3 連続確認
3. `restore_policy: "skip"` 系 result shape を確認
4. warm-up として representative preset の単発 success を通す

### shard 方針

- round9 14 preset を **細粒度 shard** に割り、worker1 / worker2 に交互配置する
- Mag7 は full set 実行後にランキングを確認し、alt rerun は **strong 7 anchors + 改善候補の上位代表**に絞る
- health check は **10 run ごと**
- readiness 崩れ時は **当該 shard 単位**で止め、full rerun は避ける
- partial retry は shard 境界で限定的に行うが、single unreadable を即 rollback trigger にしない

### 検証観点

- Mag7 の順位変動
- alt での順位維持 / 崩れ方
- round8 strong 7 のうち、tuned 版が base / control を本当に上回るか
- breadth / quality / deep-pullback のどの枝が cross-universe で最も安定か

## Validation commands

### docs guidance closeout

```bash
git --no-pager status --short
git --no-pager diff -- docs/command.md docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md
npm test
```

### round9 実装テスト

```bash
node --test tests/preset-validation.test.js tests/backtest.test.js
npm test
```

### worker health check

```bash
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9225/json/version
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

### representative smoke backtest

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-55-20-rsp-filter-rsi14-regime-40-theme-breadth-earlier --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset donchian-55-20-spy-filter-rsi14-regime-55-theme-quality-strict-balanced --symbol AAPL
```

## Risks

- round9 の新規 variant が executable duplicate になる可能性
- quality 系の tuned variant が Mag7 局所最適化に寄り、alt で崩れる可能性
- breadth 系の stop 調整が本質的改善ではなく、単なるノイズになる可能性
- shard 粒度が粗すぎると retry 範囲が広がる
- docs guidance closeout と round9 を 1 commit に混ぜると境界が曖昧になる
- round9 実行途中で worker health が崩れた場合、結果 JSON の解釈を誤る可能性

## Completion criteria

- current docs guidance の未コミット変更が独立 commit / push されている
- `parallel-backtest-guidance-integration-review_20260407_0035.md` が completed に移されている
- round9 strong 7 が duplicate / alias 整理込みで docs に固定されている
- round9 preset が catalog と tests に反映されている
- round9 Mag7 / alt の JSON と summary が保存されている
- round9 results docs / signal observation / session log が作成されている
- round9 実行方式が shard parallel で一貫している
- round9 の commit / push が完了している

## Steps

### Phase A: current docs guidance closeout

- [ ] 未コミットの docs guidance 変更を再確認し、`runbook` を durable source of truth、`docs/command.md` を quick reference として整列する
- [ ] `parallel-backtest-guidance-integration-review_20260407_0035.md` の対象範囲が完了していることを確認する
- [ ] `docs/exec-plans/active/parallel-backtest-guidance-integration-review_20260407_0035.md` を `completed/` へ移動する
- [ ] `npm test` で既存整合性を確認する
- [ ] docs guidance 変更だけを commit して push する

### Phase B-1: round9 preset planning / TDD

- [ ] round8 evidence を読み直し、cross-universe 優先の strong 7 を docs に固定する
- [ ] `breadth-balanced` / `breadth-quality-early` を round9 strong 7 から除外する根拠を明文化する
- [ ] round9 新規 variant 7 本の id / role / family coverage を確定する
- [ ] `tests/preset-validation.test.js` に round9 の RED を追加する
- [ ] `tests/backtest.test.js` に representative round9 generator RED を追加する

### Phase B-2: round9 implementation

- [ ] `config/backtest/strategy-presets.json` に round9 preset を追加する
- [ ] 必要最小限の metadata / taxonomy / tags を揃える
- [ ] round9 duplicate がないことを確認する
- [ ] RED を GREEN にする
- [ ] test 構造を整理して REFACTOR する

### Phase B-3: round9 execution

- [ ] worker1 / worker2 の health gate を確認する
- [ ] shard parallel で round9 Mag7 batch を実行する
- [ ] 10 run ごとに health check を入れる
- [ ] 必要時のみ shard 境界で限定 partial retry を行う
- [ ] Mag7 結果から alt rerun 対象を確定する
- [ ] shard parallel で alt batch を実行する

### Phase B-4: documentation / closeout

- [ ] round9 の raw JSON / summary JSON を保存する
- [ ] `theme-strategy-shortlist-round9_2015_2025.md` を作成する
- [ ] `theme-backtest-results-round9_2015_2025.md` を作成する
- [ ] `theme-backtest-results-round9-alt_2015_2025.md` を作成する
- [ ] `theme-signal-observation-round9_2015_2025.md` を作成する
- [ ] `docs/working-memory/session-logs/round9-strong7-shard-parallel_YYYYMMDD_HHMM.md` を作成する
- [ ] 本 plan を `completed/` へ移動する
- [ ] round9 一式を commit して push する

## Commit / push 方針

### Commit 1: docs guidance closeout（独立させる）

**目的:** current docs guidance 変更を round9 から分離して確定する

想定メッセージ:

```text
docs: close parallel guidance integration review
```

含めるもの:

- `docs/command.md`
- `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
- `docs/research/mid-parallel-benchmark-analysis_20260406_2330.md`
- `docs/references/backtests/mid-parallel-benchmark-comparison_20260406_2330.json`
- `docs/working-memory/session-logs/mid-parallel-benchmark-hybrid-partial-retry_20260406_2330.md`
- `docs/exec-plans/completed/mid-parallel-benchmark-hybrid-partial-retry_20260406_2330.md`
- `docs/exec-plans/active/parallel-backtest-guidance-integration-review_20260407_0035.md` -> `completed/`

### Commit 2: round9 implementation + execution + docs

**目的:** round9 strong 7 の実装・実行・文書化を 1 まとまりで確定する

想定メッセージ:

```text
feat: add round9 strong7 shard-parallel research
```

含めるもの:

- `config/backtest/strategy-presets.json`
- `tests/preset-validation.test.js`
- `tests/backtest.test.js`
- round9 research docs
- round9 backtest JSON / summary
- round9 session log
- 本 plan の `active/` -> `completed/` 移動

### 分割方針の判断

- **docs guidance と round9 は分けて commit / push する**
- 理由:
  - current docs guidance closeout は直前 task の clean close として独立価値がある
  - round9 は preset / tests / execution artifacts を含み、差分の性質が大きく異なる
  - 障害時に rollback / review / blame がしやすい

## Notes for reviewers

- round9 の 7 本目は「新しい勝ち筋」ではなく **control 枠**である
- round9 の主眼は variant を増やすことではなく、**cross-universe で残る改善だけを採用すること**
- shard parallel は speed だけでなく retry 範囲の限定にも効くため、実行標準として固定する
- duplicate / alias は round8 で見えた問題なので、round9 では早い段階で pruning する
