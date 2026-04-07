# 実行計画: round11 期間スライス優先・シンボル/ユニバース差分検証 (20260407_0729)

- ステータス: DRAFT
- 種別: research continuation
- 前提ブランチ: `main`

## Problem

round10 は完了しており、直近の durable docs では次に深掘りすべき主軸が以下 3 戦略に収束している。

1. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
3. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`

次ラウンドでは、これら 3 本の勝ち筋が **期間の切り方** と **symbol / universe の差分**に対してどの程度安定かを、因果を崩さず検証する必要がある。今回の優先順位は以下の通り。

1. **期間スライス（period slicing）を最優先で検証する**
2. その後に **シンボル/ユニバース差分** を検証する

また、実行ポリシーは既存の known-good 範囲に厳密に従う。

- **dual-worker**
- **shard parallel**
- **exact unreadable pair rerun**
- **recovered summary 採用**

**4並列は今回も対象外であり、明示的に未検証・未妥当化のままとする。**

## Source of truth

### 直近結果・handoff

- `docs/research/latest/README.md`
- `docs/research/latest/top4-backtest-handoff_20260407_0529.md`
- `docs/research/latest/top4-backtest-results_20260407_0529.md`

### round10 durable results

- `docs/research/theme-backtest-results-round10_2015_2025.md`
- `docs/research/theme-backtest-results-round10-alt_2015_2025.md`

### 並列運用の正本

- `command.md`
- `docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`

### 参照 artifact

- `docs/references/backtests/round10-top4-mag7-shard-parallel_20260407_0524.json`
- `docs/references/backtests/round10-top4-mag7-shard-parallel_20260407_0524.summary.json`
- `docs/references/backtests/round10-top4-mag7-shard-parallel-recovered_20260407_0524.json`
- `docs/references/backtests/round10-top4-mag7-shard-parallel-recovered_20260407_0524.summary.json`
- `docs/references/backtests/round10-top4-alt-shard-parallel_20260407_0620.json`
- `docs/references/backtests/round10-top4-alt-shard-parallel_20260407_0620.summary.json`
- `docs/references/backtests/round10-top4-alt-shard-parallel-recovered_20260407_0620.json`
- `docs/references/backtests/round10-top4-alt-shard-parallel-recovered_20260407_0620.summary.json`

### 実行経路・preset 正本

- `config/backtest/strategy-presets.json`
- `src/cli/index.js`
- `src/cli/commands/backtest.js`
- `src/core/backtest.js`
- `src/core/research-backtest.js`

## Goals

1. 上記 3 戦略について、**period だけを動かした時の感応度**を比較可能な形で残す
2. period slicing の結果から、**phase B に進める勝ち筋**を bounded に選別する
3. shortlisted strategy について、**既存シンボル/既存ユニバース内での差分**を比較する
4. latest docs / research docs / session log / raw artifacts を round11 として durable に残す
5. dual-worker / shard parallel / exact unreadable pair rerun / recovered summary の運用を逸脱しない
6. **4並列を試さない・書き換えない・正当化しない**

## In scope

- 上位 3 戦略の **period slicing**
- period slicing は **Donchian の 2 period のみ変更**し、他ノブは固定
- phase A の結果から **最大 3 本まで** phase B に進める
- phase B は **既存の symbol / universe セット**に限定して差分確認する
- raw / recovered artifact 作成
- latest docs 更新
- round11 research doc 作成
- session log 作成

## Out of scope

- 4並列の実装、検証、運用化
- worker3 / worker4 / 新 port 構成
- dual-worker topology の再設計
- period と regime / stop / filter / theme を同時に広く動かす探索
- 新しい汎用 runner の常設実装
- 新 universe 定義そのものの拡張
- unrelated docs / code の整理

## Phase A: period slicing

各 anchor について、**他パラメータ固定**で次の period slice のみを比較する。

- baseline: `55-20`
- entry short: `50-20`
- entry long: `60-20`
- exit short: `55-18`
- exit long: `55-22`

対象 anchor:

1. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
3. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`

想定総数:

- 3 anchor × 5 slices = **15 presets**
- この round では **同時二軸変更（例: 50-18, 60-22）は行わない**

### Phase A の評価ルール

- raw summary は採用しない
- unreadable は **exact unreadable pair rerun** で回収する
- 最終判断は **recovered summary** を正本とする
- readability も併記し、 unreadable を無視して採用しない

## Phase B: symbol / universe substitution

Phase A の recovered summary を見て、**最大 3 本**を phase B に進める。

選び方:

- 原則は **anchor ごとに最良 1 本**
- anchor 周辺が崩れた場合は baseline anchor を残してもよい
- 3 本を超える横展開はしない

比較対象:

- `Mag7`
- `sp500-top10-point-in-time`
- `mega-cap-ex-nvda`

この round では **既存 universe の再利用に限定**し、追加 universe の新設は行わない。

## Files to create / modify / delete

### 新規作成

- `docs/exec-plans/active/round11-period-slicing-symbol-universe-substitution_20260407_0729.md`
- `docs/research/theme-backtest-results-round11_2015_2025.md`
- `docs/research/theme-backtest-results-round11-alt_2015_2025.md`
- `docs/research/latest/top4-period-slicing-handoff_YYYYMMDD_HHMM.md`
- `docs/research/latest/top4-period-slicing-results_YYYYMMDD_HHMM.md`
- `docs/working-memory/session-logs/round11-period-slicing-symbol-universe-substitution_YYYYMMDD_HHMM.md`
- `docs/references/backtests/round11-period-slicing-mag7-shard-parallel_YYYYMMDD_HHMM.json`
- `docs/references/backtests/round11-period-slicing-mag7-shard-parallel_YYYYMMDD_HHMM.summary.json`
- `docs/references/backtests/round11-period-slicing-mag7-shard-parallel-recovered_YYYYMMDD_HHMM.json`
- `docs/references/backtests/round11-period-slicing-mag7-shard-parallel-recovered_YYYYMMDD_HHMM.summary.json`
- `docs/references/backtests/round11-period-slicing-alt-shard-parallel_YYYYMMDD_HHMM.json`
- `docs/references/backtests/round11-period-slicing-alt-shard-parallel_YYYYMMDD_HHMM.summary.json`
- `docs/references/backtests/round11-period-slicing-alt-shard-parallel-recovered_YYYYMMDD_HHMM.json`
- `docs/references/backtests/round11-period-slicing-alt-shard-parallel-recovered_YYYYMMDD_HHMM.summary.json`
- `docs/references/backtests/round11-universe-substitution-shard-parallel_YYYYMMDD_HHMM.json`
- `docs/references/backtests/round11-universe-substitution-shard-parallel_YYYYMMDD_HHMM.summary.json`
- `docs/references/backtests/round11-universe-substitution-shard-parallel-recovered_YYYYMMDD_HHMM.json`
- `docs/references/backtests/round11-universe-substitution-shard-parallel-recovered_YYYYMMDD_HHMM.summary.json`

### 変更

- `config/backtest/strategy-presets.json`
- `tests/preset-validation.test.js`
- `tests/backtest.test.js`
- `docs/research/latest/README.md`

### 削除

- なし

## Test strategy (RED / GREEN / REFACTOR)

### RED

- `tests/preset-validation.test.js` で新規 period-slice preset が未登録のため失敗する状態を先に作る
- `tests/backtest.test.js` で対象 preset の source 生成に期待 period が反映されることを先に失敗で固定する

### GREEN

- `config/backtest/strategy-presets.json` に最小差分で preset を追加する
- 既存 generator / preset 読み取り整合でテストを通す
- dual-worker / shard parallel / exact unreadable pair rerun / recovered summary の運用で research を完了する

### REFACTOR

- duplicate preset 定義があれば整理する
- round11 docs と latest docs の役割重複を減らす
- 「period だけ変えた比較」と「universe を変えた比較」が混ざらないよう整理する

## Validation commands

### テスト

```bash
node --test tests/preset-validation.test.js tests/backtest.test.js
npm test
```

### dual-worker readiness

```bash
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9225/json/version
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

### representative warm-up

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict --symbol AAPL
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight --symbol META
```

## Risks

1. unreadable が cluster した場合、raw summary では誤読しやすい
2. period と universe を同時に広く動かすと因果が崩れるため、今回の順序は **period first** を厳守する
3. `breadth-quality-balanced-wide` は alt 側で強く、`deep-pullback-*` は cross-universe で安定しているため、評価軸を混ぜない
4. 期間変更が既存 preset と重複する可能性があるため、preset 重複確認が必要
5. exact unreadable pair rerun を省略すると round11 比較の再現性が壊れる
6. **4並列は out of scope かつ未検証**であり、実験的にも含めない

## Checklist

- [ ] round10 latest docs / research docs / artifacts を読み、3 anchor と採用ルールを再確認する
- [ ] セッション `plan.md` に phase A / phase B の作業メモ枠を作る
- [ ] SQL `todos` に phase A, phase B, docs, artifacts, session-log のタスクを登録する
- [ ] `config/backtest/strategy-presets.json` に 3 anchor × 4 period-slice presets を追加する
- [ ] `tests/preset-validation.test.js` に新規 preset 検証を追加する
- [ ] `tests/backtest.test.js` に representative period 反映テストを追加する
- [ ] RED を確認し、その後 GREEN まで最小差分で通す
- [ ] dual-worker readiness と warm-up を確認する
- [ ] Phase A を **dual-worker / shard parallel / exact unreadable pair rerun / recovered summary** で実行する
- [ ] `docs/research/theme-backtest-results-round11_2015_2025.md` と `docs/research/theme-backtest-results-round11-alt_2015_2025.md` に phase A の結果をまとめる
- [ ] anchor ごとに最良 1 本を原則として、phase B 対象を最大 3 本に絞る
- [ ] Phase B を既存 symbol / existing universe に限定して実行する
- [ ] phase B artifact と recovered summary を保存する
- [ ] `docs/research/latest/top4-period-slicing-handoff_YYYYMMDD_HHMM.md` と `docs/research/latest/top4-period-slicing-results_YYYYMMDD_HHMM.md` を作成する
- [ ] `docs/research/latest/README.md` を最新 round11 への導線に更新する
- [ ] `docs/working-memory/session-logs/round11-period-slicing-symbol-universe-substitution_YYYYMMDD_HHMM.md` に実行ログと判断理由を残す
- [ ] 4並列が未検証・今回対象外であることを latest docs と session log に明記する
- [ ] 変更差分・docs・artifacts の整合を確認し、次の REVIEW/COMMIT に渡せる状態にする
