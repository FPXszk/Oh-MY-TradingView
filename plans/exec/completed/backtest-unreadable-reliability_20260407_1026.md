# 実行計画: latest 復元導線整備と unreadable 再試行コスト削減 (20260407_1026)

- ステータス: COMPLETED
- フェーズ: COMPLETED
- 前提ブランチ: `main`

## 前回何をしていたか

- dual-worker / 2 worker parallel は、`restore_policy: "skip"`・Strategy Tester の `指標` タブ活性化・warm-up 後の warmed state で安定化していた
- latest 導線は `docs/research/latest/README.md`、`top4-backtest-handoff_20260407_0529.md`、`top4-backtest-results_20260407_0529.md`、`top4-period-slicing-handoff_20260407_1641.md`、`top4-period-slicing-results_20260407_1641.md` に集約されつつあった
- recovered summary を正規結果として扱う運用は固まりつつある一方、fresh / cold start と長時間 workload では `metrics_unreadable` と rerun コストが残課題だった
- `src/core/backtest.js` の tester metrics 読み取りは `TESTER_READ_RETRIES=5` と `TESTER_READ_DELAY=2500` の固定 retry で、失敗分類に応じた打ち切りや縮退判定が弱い

## Problem

前回の最新バックテスト結果取得では、`unreadable` 系の発生後に再取得ややり直しへ時間が流れやすく、wall-clock が伸びていた。  
現状は warmed dual-worker の成功条件は見えているが、**長時間 batch で unreadable をどう扱えば無駄な待機と再実行を減らせるか** が repo の実装・テスト・ドキュメントでまだ十分に揃っていない。

直近の live verification を反映すると、状態は次の通り。

- cold single
  - worker1: `success` / `tester_available: true` / `20.82s`
  - worker2: `apply_failed: true` / `17.33s`
- warmed single rerun
  - worker1: `success` / `10.06s`
  - worker2: `success` / `10.11s`
- warmed parallel
  - worker1: `success` / `30.68s`
  - worker2: `metrics_unreadable` / `35.55s`
- additional parallel
  - worker1: `metrics_unreadable` / `35.47s`

このままだと、

1. 「前回どこまでやっていたか」の復元に時間がかかる
2. `panel_not_visible` / `no_strategy_applied` / `metrics_unreadable` を一律に近い扱いで待ってしまう
3. `fallback_metrics` があるケースでも、再試行判断を最適化しにくい
4. checkpoint を再開境界として使う方針が code / docs で明確に接続されていない

という問題が続く。

加えて現在は、`panel_not_visible` / `no_strategy_applied` 側の無駄待機削減はすでに入っている一方で、**実機の wall-clock を支配しているのは `metrics_unreadable` 側の 30〜35 秒級の滞留** だと分かった。  
その後、`metrics_unreadable` 専用 retry budget 短縮により **35.51s 平均 → 28.05s（-7.46s / 約21.0%）** まで短縮できた。  
したがって次の改善対象は、**retry の追加短縮よりも `metrics_unreadable` 時の rerun 回避**、すなわち **strategy-aware fallback がある経路だけ degraded success を返し、それ以外は rerun 条件を明示する** 方向へ明確に絞る。

## Goal

- latest docs から 5 分以内に「前回何をしていたか」を復元できる状態にする
- tester read failure を category-aware に扱い、無駄な待機時間を減らす
- `fallback_metrics` があるケースと本当に再試行が必要なケースを分ける
- unreadable の再実行を full rerun ではなく checkpoint ベースで扱える前提を整える
- warmed single rerun の約 10 秒 success を壊さず、warmed parallel で `metrics_unreadable` に入った場合の 30〜35 秒級滞留を短縮する
- 実機で cold single / warmed single / warmed parallel を再計測し、改善前後の wall-clock と failure category を比較できる状態にする

## Source of truth

### latest / handoff

- `docs/research/latest/README.md`
- `docs/research/latest/top4-backtest-handoff_20260407_0529.md`
- `docs/research/latest/top4-backtest-results_20260407_0529.md`
- `docs/research/latest/top4-period-slicing-handoff_20260407_1641.md`
- `docs/research/latest/top4-period-slicing-results_20260407_1641.md`

### session logs / completed plans

- `docs/working-memory/session-logs/dual-worker-parallel-backtest-handoff_20260406_0735.md`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`
- `docs/exec-plans/completed/top4-backtest-latest-handoff-and-dual-worker-continuation_20260407_0437.md`
- `docs/exec-plans/completed/round8-parallel-optimization-followup_20260406_2209.md`

### implementation / tests

- `src/core/backtest.js`
- `tests/backtest.test.js`
- `tests/e2e.backtest.test.js`
- `package.json`
- `docs/command.md`

## 既存 active plan との関係

既存 active plan `docs/exec-plans/active/wsl-dual-worker-reachability_20260406_0305.md` は WSL↔Windows 到達性 / portproxy 切り分けが対象であり、本 plan は **latest 復元導線・tester 読み取り失敗短縮・unreadable 再実行方針** が対象のため非競合。

## 優先順位つき改善案

1. **latest 復元導線の一本化**
   - latest README に「今どこまで終わったか / known-good / 未解決 / 次の入口」を固定する
   - completed plan / session log / latest result の辿り順を 1 本化する
2. **tester read の category-aware retry**
   - `panel_not_visible` / `no_strategy_applied` / `metrics_unreadable` を同一 retry policy で扱わない
   - 非回復系は早期終了し、回復余地がある failure のみ追加待機する
3. **`fallback_metrics` の縮退成功扱い整理**
   - `fallback_metrics` を返せるケースを docs / tests / result shape で明確化する
   - 再試行対象を「正規 tester metrics が必要なケース」に限定する
4. **checkpoint ベース再開方針の durable 化**
   - `unreadable 1 回で即 rollback` を避け、checkpoint を観測・再開境界として扱う前提を整理する
5. **warm-up / health gate の明文化**
   - 長時間 batch 前後の readiness 条件を latest / command に寄せる

## 実機結果を踏まえた次の改善案（優先順位付き）

1. **最優先: strategy-aware fallback の適用範囲明確化**
   - `metrics_unreadable` 後でも fallback を返してよいのは、strategy-aware な local fallback を持つ経路に限定する
   - generic な chart bars fallback を preset に流用しない
2. **`metrics_unreadable` の result を degraded success まで段階化**
   - `tester_available: false` でも `fallback_metrics` があるケースを、再実行一択にしない
   - `metrics_unreadable` と共存できる縮退成功の contract を作る
3. **rerun 条件の限定**
   - `panel_not_visible` は correctness 優先で現状維持
   - rerun 対象は `metrics_unreadable` かつ fallback 不可のケースへ寄せる
4. **実機デバッグの観測粒度統一**
   - cold single / warmed single / warmed parallel / additional parallel を毎回同じコマンド列で再現する
   - 失敗時は `metrics_unreadable` までの経過秒数と fallback 有無を記録する
5. **checkpoint と rerun 対象化の接続**
   - long-running batch では degraded success と rerun 対象を分け、checkpoint 境界でのみ rerun する

## 変更・作成・確認対象ファイル

### 参照

- `docs/research/latest/README.md`
- `docs/research/latest/top4-backtest-handoff_20260407_0529.md`
- `docs/research/latest/top4-backtest-results_20260407_0529.md`
- `docs/research/latest/top4-period-slicing-handoff_20260407_1641.md`
- `docs/research/latest/top4-period-slicing-results_20260407_1641.md`
- `docs/working-memory/session-logs/dual-worker-parallel-backtest-handoff_20260406_0735.md`
- `docs/working-memory/session-logs/tradingview-parallel-backtest-stabilization_20260406_0802.md`
- `docs/exec-plans/completed/top4-backtest-latest-handoff-and-dual-worker-continuation_20260407_0437.md`
- `docs/exec-plans/completed/round8-parallel-optimization-followup_20260406_2209.md`
- `docs/command.md`
- `src/core/backtest.js`
- `tests/backtest.test.js`
- `tests/e2e.backtest.test.js`
- `package.json`

### 変更候補

- `docs/research/latest/README.md`
- `docs/research/latest/backtest-reliability-handoff_20260407_1026.md`
- `docs/command.md`
- `src/core/backtest.js`
- `tests/backtest.test.js`
- `tests/e2e.backtest.test.js`
- `docs/working-memory/session-logs/backtest-unreadable-reliability_20260407_1026.md`

### 新規作成候補

- `docs/research/latest/backtest-reliability-handoff_20260407_1026.md`
- `docs/working-memory/session-logs/backtest-unreadable-reliability_20260407_1026.md`

### 削除

- なし

## 実装内容と影響範囲

### 1. latest 復元導線整備

latest README と handoff doc に、前回やっていた内容・現在の known-good・未解決・次の入口を固定する。

- 影響範囲: docs / operator handoff

### 2. tester read retry 見直し

`src/core/backtest.js` の tester metrics 読み取りを failure category ごとに扱い分ける。

- 影響範囲: backtest result shape、待機時間、unreadable 判定

### 2a. 次の 1 手: `metrics_unreadable` 専用 retry budget

最初の追加改善はこれに絞る。

- `panel_not_visible` の短い grace retry は維持
- `no_strategy_applied` の早期終了は維持
- `metrics_unreadable` のみ、より短く明示的な retry budget へ切り出す

理由は、**最小差分で wall-clock を直接下げやすく、すでに改善済みの分岐を壊さずに進められるため**。

### 2b. 次のフェーズ: `metrics_unreadable` の rerun 回避

`metrics_unreadable` の failure-side 短縮は確認できたため、次は **失敗を減らすのではなく rerun 必要件数を減らす** フェーズへ移る。

- `fallback_metrics` を返せるのは strategy-aware fallback がある経路に限定する
- `tester_available: false` でも fallback があるケースの contract を docs / tests / result shape で揃える
- rerun 対象は `fallback_metrics` を作れないケースへ限定する

理由は、**追加の retry 短縮よりも long-running batch の再試行コスト削減に直結し、今回の実測改善（約21%短縮）と競合しないため**。

### 3. fallback / degraded result の扱い整理

`fallback_metrics` があるケースを一律 rerun 対象にせず、縮退成功として扱える条件を明文化する。

- 影響範囲: result 解釈、再試行判断、research artifact の集計基準

### 3a. 次フェーズの主実装: strategy-aware fallback + degraded success

最初に実装する価値が高いのはこれ。

- `metrics_unreadable` 失敗時の fallback 付与は strategy-aware fallback がある経路に限定する
- `fallback_metrics` がある failure result を、再実行必須ケースと分離する
- downstream が誤解しないよう `tester_reason_category` と fallback 情報の併記ルールを固定する

理由は、**追加の wait 削減より rerun 回避のほうが全体所要時間への寄与が大きいから**。

### 4. checkpoint ベース再開方針の接続

code 側の result / docs 側の運用を揃え、checkpoint を観測・再開境界として扱う前提を整理する。

- 影響範囲: 長時間 batch の rerun 範囲、handoff、運用手順

## In scope

- latest docs からの前回状態復元改善
- tester read retry / unreadable handling の改善設計と必要最小限の実装
- `src/core/backtest.js` の result / retry policy 見直し
- unit / e2e test 追加・更新
- checkpoint を観測・再開境界として扱う運用整理

## Out of scope

- WSL / portproxy 復旧そのもの
- 4 worker / 4 並列 topology 実装
- 汎用 batch runner の大規模作り直し
- naive な unreadable 即 rollback partial retry の採用
- 無関係な docs の全面改稿

## TDD 方針（RED -> GREEN -> REFACTOR）

### RED

- `tests/backtest.test.js` に failure category 別 retry policy の failing test を追加する
- `tests/backtest.test.js` に `fallback_metrics` があるケースの result 解釈テストを追加する
- `tests/e2e.backtest.test.js` に `tester_reason_category` / `fallback_metrics` / restore shape の期待を追加する
- 特に `metrics_unreadable` が `panel_not_visible` / `no_strategy_applied` と異なる retry budget で扱われる failing test を先に固定する

### GREEN

- `src/core/backtest.js` に最小差分で category-aware retry / fallback handling を実装する
- latest / command docs に運用判断基準を追記する
- 最初の実装は `metrics_unreadable` 専用 retry budget の短縮に限定する

### 次フェーズの RED / GREEN

#### RED

- `tests/backtest.test.js` に、`metrics_unreadable` かつ fallback 可能なケースの result shape test を追加する
- `tests/backtest.test.js` に、fallback 付与の有無で rerun 要否が分かれる前提の test を追加する
- `tests/e2e.backtest.test.js` に degraded result shape の期待を追加する

#### GREEN

- `src/core/backtest.js` で fallback 付与ロジックと適用範囲を整理する
- `metrics_unreadable` + `fallback_metrics` の contract を result shape に反映する
- latest / command / session log に rerun 条件を追記する

### REFACTOR

- retry / result 組み立ての重複を整理する
- latest / session log / command の責務を整理し、正本を明確にする
- 変更箇所の分岐を tests で埋め、coverage 80% 以上の意図に沿うようにする
- 次フェーズの degraded success 実装を載せやすいよう、retry decision helper の責務を小さく保つ

## 検証コマンド

### repo tests

```bash
npm test
npm run test:e2e
npm run test:all
```

### worker readiness

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
```

### representative backtest

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA
```

### live wall-clock verification

```bash
time TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA
time TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA
(
  time TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 \
  node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA
) &
(
  time TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 \
  node src/cli/index.js backtest preset rsi-mean-reversion --symbol NVDA
) &
wait
```

## リスク

1. retry を短くしすぎると、回復可能な `metrics_unreadable` を早く打ち切る恐れがある
2. result shape の調整が downstream summary / latest docs とずれる恐れがある
3. `fallback_metrics` の格上げ条件が甘いと、品質の低い結果を混ぜる恐れがある
4. checkpoint 設計が曖昧だと partial retry が再び full rerun 同等の複雑さになる
5. latest 導線を増やしすぎると正本が分かりにくくなる

## 実装ステップ

### Phase 1: 文脈復元導線の固定化

- [x] latest README、latest handoff/result、completed plan、主要 session log を再読し、`現状 / known-good / 未解決 / 次の入口` を 1 枚に要約する
- [x] `docs/research/latest/backtest-reliability-handoff_20260407_1026.md` を追加し、前回何をしていたかを最短で復元できる状態にする
- [x] `docs/research/latest/README.md` に読む順番と canonical artifact を明記する

### Phase 2: unreadable 時間浪費の RED を作る

- [x] `tests/backtest.test.js` に `panel_not_visible` / `no_strategy_applied` / `metrics_unreadable` を同一 retry で扱わない前提の failing test を追加する
- [x] `tests/backtest.test.js` に `fallback_metrics` があるケースの failing test を追加する
- [x] `tests/e2e.backtest.test.js` に degraded result shape の期待を追加する

### Phase 3: 最小コード改善で GREEN にする

- [x] `src/core/backtest.js` で tester read retry を category-aware に分岐する
- [x] `metrics_unreadable` だけを追加再試行対象に寄せ、`panel_not_visible` / `no_strategy_applied` は早期終了できる形を検討する
- [x] `fallback_metrics` を返す条件と、再試行対象に残す条件を result shape 上で分離する

### Phase 3a: `metrics_unreadable` の短縮に集中する

- [x] `tests/backtest.test.js` に `metrics_unreadable` 専用 retry budget の RED を追加する
- [x] `src/core/backtest.js` で `metrics_unreadable` の retry 回数 / 待機時間を最小差分で短縮する
- [x] single rerun の約 10 秒 success を壊していないことを実機で確認する
- [x] warmed parallel での `metrics_unreadable` 滞留時間を再計測し、改善前後を比較する

### Phase 3b: strategy-aware fallback + degraded success

- [x] `tests/backtest.test.js` に `metrics_unreadable` + `fallback_metrics` の contract を固定する RED を追加する
- [x] `tests/e2e.backtest.test.js` に degraded result shape の期待を追加する
- [x] `src/core/backtest.js` で fallback 付与ロジックと適用範囲を整理する
- [x] rerun 対象を `metrics_unreadable` かつ fallback 不可ケースへ限定する
- [x] cold / warmed / parallel の live run で fallback 有無と rerun 要否を記録する

### Phase 4: checkpoint / 再開方針の durable 化

- [x] `docs/command.md` と latest handoff に checkpoint の役割を `観測・再開境界` として明記する
- [x] naive rollback 非推奨を維持しつつ、限定再実行の判断条件を整理する

### Phase 5: 総合検証

- [x] `npm test` → `npm run test:e2e` → `npm run test:all` の順で確認する
- [x] dual-worker status / representative backtest で運用前提を確認する
- [x] session log に観測と採用理由を残す

## Completion criteria

- latest docs から「前回何をしていたか」を短時間で復元できる
- `src/core/backtest.js` の tester read policy が fixed retry 一辺倒ではなくなっている
- `fallback_metrics` の扱いが docs / tests / result shape で整合している
- unreadable 再実行方針が checkpoint ベースで説明できる
- 既存 active plan と重複しない範囲が明文化されている
- `metrics_unreadable` で fallback が作れるケースと rerun 必須ケースを区別して扱える
