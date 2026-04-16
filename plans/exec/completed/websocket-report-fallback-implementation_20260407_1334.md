# 実行計画: websocket report fallback 段階導入 (20260407_1334)

- ステータス: COMPLETED
- 種別: implementation / validation / docs sync
- 前提ブランチ: `main`

## Problem

現状の主経路は `src/core/backtest.js` の internal API read（`readTesterMetricsFromInternalApi()`）＋ DOM read ＋ retry で成立しているが、`metrics_unreadable` 系では `reportData` / `performance` の存在が見えても internal error により不安定で、代表 preset の実機では **WebSocket `du` frame 内の report payload が primary metrics と完全一致**した。さらに `metrics_unreadable` run でも同等の report metrics が frame 側に見えている。

一方で network source は brittle であり、frame format 変更、購読タイミングずれ、session 混線、stale frame 誤採用の危険がある。加えて `tradesData` / `equityData` は今回の tested presets では未確認であり、generic fallback を preset に流用するのは unsafe のため引き続き禁止する。

そのため第1段階では、**existing primary path を維持したまま**、WebSocket report source を **`metrics_unreadable` 向けの安全 fallback** として段階導入する。既存 result shape は壊さず、primary 成功時は従来経路を常に優先する。

また、現時点で `docs/exec-plans/active/*.md` に既存 active plan は無く、本計画は active plan 競合を起こさない前提で進める。

## Source of truth

- 実装主対象: `src/core/backtest.js`
- 既存 primary path:
  - `readTesterMetricsFromInternalApi()`
  - `readTesterMetricsFromDom()`
  - `readTesterMetricsWithRetries()`
- 既存 result contract:
  - `buildResult()`
  - `attachFallbackMetrics()`
- 維持必須の result shape / semantics:
  - `metrics`
  - `tester_reason_category`
  - `fallback_source`
  - `fallback_metrics`
  - `degraded_result`
  - `rerun_recommended`
- 既存テスト:
  - `tests/backtest.test.js`
  - `tests/e2e.backtest.test.js`
- 最新 docs 起点:
  - `docs/research/latest/README.md`
  - `docs/research/latest/backtest-reliability-handoff_20260407_1026.md`
  - `docs/working-memory/session-logs/backtest-unreadable-reliability_20260407_1026.md`
- 確認済み事実:
  - worker 再起動後、`9223` / `9225` は復旧済み
  - representative preset 実機で WebSocket `du` frame の report metrics は primary metrics と完全一致
  - `metrics_unreadable` run でも WebSocket frame 側に report metrics 相当が見えた
  - direct strategy source read は `reportData` / `performance` の存在は見えるが internal error で不安定
  - `tradesData` / `equityData` は今回未観測
  - preset 向け generic fallback は unsafe のため禁止継続

## In scope

- WebSocket `du` frame / report payload を読む helper の追加
- frame parsing と session correlation の最小安全実装
- 第1段階として **primary path を壊さず** `metrics_unreadable` 時のみ使う fallback の導入
- 既存 result shape を維持したまま fallback 情報を反映
- RED / GREEN / REFACTOR に沿った unit・integration・E2E テスト追加
- `docs/research/latest` と session log の更新
- exec-plan の `completed` への移動
- commit / push までの作業

## Out of scope

- WebSocket source の primary path 昇格
- `tradesData` / `equityData` 前提の拡張
- generic fallback の preset 再利用
- 既存 result JSON shape の変更
- 無関係な backtest reliability 改善
- 新規 test runner / coverage tool 導入

## Files to create / modify / delete

### Create

- `src/core/backtest-report-websocket.js`
- `docs/research/latest/backtest-websocket-report-fallback_20260407_1334.md`

### Modify

- `src/core/backtest.js`
- `tests/backtest.test.js`
- `tests/e2e.backtest.test.js`
- `docs/research/latest/README.md`
- `docs/research/latest/backtest-reliability-handoff_20260407_1026.md`
- `docs/working-memory/session-logs/backtest-unreadable-reliability_20260407_1026.md`

### Move during COMMIT step

- `docs/exec-plans/active/websocket-report-fallback-implementation_20260407_1334.md`
  → `docs/exec-plans/completed/websocket-report-fallback-implementation_20260407_1334.md`

### Delete

- なし

## 実装ステップ

- [ ] `metrics_unreadable` 後の差し込み点を確認し、WebSocket fallback を primary 成功時に使わない構成を固定する
- [ ] `src/core/backtest-report-websocket.js` を追加し、`du` frame から report payload 候補を抽出する pure helper を実装する
- [ ] 必須キー不足・不正 shape・parse 不可 frame を無害に捨てる validation を実装する
- [ ] session / run correlation 条件を実装し、stale frame や別 run の frame を誤採用しないようにする
- [ ] 既存 `metrics` shape に揃える normalizer を実装する
- [ ] `src/core/backtest.js` で primary path 成功時は従来結果をそのまま返し、WebSocket source は参照しないようにする
- [ ] `metrics_unreadable` 時のみ WebSocket fallback を使い、成功時は `fallback_source` / `fallback_metrics` / `degraded_result` / `rerun_recommended` を既存 contract に沿って反映する
- [ ] generic fallback が preset 経路で再利用されないガードを維持する
- [ ] `tests/backtest.test.js` に parsing / correlation / fallback 条件の unit test を追加する
- [ ] `tests/backtest.test.js` に primary success 優先・shape 維持・unsafe fallback 禁止の integration 寄りテストを追加する
- [ ] `tests/e2e.backtest.test.js` に live 想定の安全 fallback テストを追加する
- [ ] 実機で primary success と unreadable case を確認し、WebSocket fallback の一致度と安全性を検証する
- [ ] `docs/research/latest/backtest-websocket-report-fallback_20260407_1334.md` を作成し、導入理由と制限事項を記録する
- [ ] `docs/research/latest/README.md` に新規 entry を追加する
- [ ] `docs/research/latest/backtest-reliability-handoff_20260407_1026.md` に次フェーズとして WebSocket report fallback の位置づけを追記する
- [ ] `docs/working-memory/session-logs/backtest-unreadable-reliability_20260407_1026.md` に実装内容・実機検証結果・未解決リスクを追記する
- [ ] exec-plan を `docs/exec-plans/completed/` へ移動する
- [ ] Conventional Commit で commit し、push する

## TDD 方針（RED / GREEN / REFACTOR）

### RED

- `tests/backtest.test.js` に先に失敗テストを追加する
  - internal API read が失敗して `metrics_unreadable` になったとき、session 一致する WebSocket `du` frame の report payload から metrics 相当を復元できる
  - primary metrics が取得できたとき、同一 run に WebSocket frame があっても **primary path が優先**される
  - session 不一致 frame は無視される
  - 不完全 payload / parse 不能 frame は無視される
  - WebSocket fallback を使っても existing result shape が変化しない
  - generic fallback は preset 経路で使われない
- `tests/e2e.backtest.test.js` に失敗テストを追加する
  - `metrics_unreadable` 相当ケースで安全 fallback が効く
  - primary 成功ケースでは fallback source が採用されない
- 追加 helper の主要分岐を重点的にテストし、対象 helper の主要分岐カバレッジを **80%以上相当**まで持っていく

### GREEN

- 最小限の helper と呼び出し分岐だけで RED を通す
- 初回導入は **`metrics_unreadable` 限定**を原則とし、primary path は置換しない
- `tradesData` / `equityData` は未観測のため対象外のままにする
- result builder の既存意味論を維持したまま `fallback_*` を反映する

### REFACTOR

- WebSocket parsing 詳細を `backtest.js` から helper へ寄せて責務を分離する
- brittle な network source のガード条件を読みやすく整理する
- テスト fixture / mock frame を整理して重複を減らす
- primary / fallback / degraded semantics がコード上で追いやすい構造に整える

## Validation commands

```bash
npm test
npm run test:e2e
npm run test:all
```

## Risks

- **network source の brittle さ**: WebSocket frame format や nesting が変わると parsing が壊れる。必須キー validation と fail-safe が必要
- **session correlation 不備**: stale frame や別 run の frame を誤採用すると誤 metrics を返す。run 単位の相関条件を厳格化する必要がある
- **timing / ordering**: frame 取得タイミング次第で取りこぼしや race が起こり得る。初期段階は primary 置換ではなく fallback 限定に留める
- **shape regression**: source が増えることで result contract が崩れる危険がある。existing shape 固定をテストで守る
- **false confidence**: representative preset では有力だが、検証範囲は限定的で `tradesData` / `equityData` は未確認
- **unsafe fallback reuse**: preset へ generic fallback を再流用すると誤判定を再導入するため、禁止継続をコードとテストで担保する
- **documentation drift**: `docs/research/latest` と session log を更新しないと次回 handoff の正本が崩れる

## Outcome

- framed WebSocket payload decode と `du` extraction helper は実装済み
- `metrics_unreadable` 時の `websocket_report` fallback wiring は NVDA MA / preset の両経路へ追加済み
- unit / e2e / full suite は通過
- ただし 2026-04-07 の再起動後 live verification では report-bearing `du` frame を再現できず、`websocket_report` fallback は未発火だった
- したがって、今回の live では speedup は未確認。確実に維持できた成果は retry budget 短縮による failure-side 約 7.46s 短縮まで
