# 実行計画: next long-run market-matched 200 (20260409_0115)

- ステータス: IMPLEMENTING / USER-APPROVED SINGLE-WORKER FALLBACK
- 前提ブランチ: `main`
- 種別: live backtest execution / config expansion / docs update

## Problem / approach

最新の market-specific long-run deep dive 結果を踏まえ、次ラウンドでは **日付レンジを変えず**（`2000-01-01 -> latest`、実装上は `to=2099-12-31`）に、**US 100 + JP 100 = 合計 200 symbols** を対象に backtest を実行する。

今回の推奨方針は、cross-market で 1 本化するのではなく **market-matched 2 campaign 構成** にすること。

1. US: 3 strategies × 100 symbols
2. JP: 3 strategies × 100 symbols

これにより、最新結果が示した「US と JP で勝ち筋が異なる」という知見を維持したまま、6 strategy 上限内で次ラウンドを実施できる。

ただし大規模 run の前に、必ず **worker1 / worker2 の readiness 確認** と **distinct parallel smoke** を行う。  
初回計画時点では **worker2 に login / onboarding / welcome recovery が必要と判定された場合、その時点で実行を停止し、ユーザー入力待ちに入る。worker1 単独へ自動フォールバックしない** 方針だった。

その後の live 検証で、

1. worker2 は visible Session1 への載せ替えに成功
2. `welcome` は解消し individual warm-up は success
3. しかし distinct parallel smoke では **worker2 が 2 回連続で `metrics_unreadable`**

となったため、**ユーザー承認のもとで worker1-only 完遂モードに切り替えて実行する**。

## Source of truth

1. `docs/research/market-specific-long-run-deep-dive-results_20260408_1857.md`
2. `docs/research/market-specific-long-run-deep-dive-handoff_20260408_1857.md`
3. `docs/research/archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
4. `docs/command.md`
5. `config/backtest/campaigns/long-run-us-entry-sweep-50x3.json`
6. `config/backtest/campaigns/long-run-jp-exit-sweep-50x3.json`
7. `config/backtest/universes/long-run-us-50.json`
8. `config/backtest/universes/long-run-jp-50.json`
9. `scripts/backtest/run-long-campaign.mjs`
10. `tests/campaign.test.js`

## Goal

1. US 100 symbols 用 universe を追加する
2. JP 100 symbols 用 universe を追加する
3. market-matched な 2 campaign（US 100x3 / JP 100x3）を追加する
4. dual-worker readiness と parallel smoke を先に確認する
5. readiness を通過した場合のみ smoke / pilot / full を実施する
6. 実行後に latest handoff / results / session log / raw artifacts を更新する

## Strategy selection proposal

### US candidates（3）

1. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
2. `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
3. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`

### JP candidates（3）

1. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
3. `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide`

### Recommendation

- 採用方針は **US 3 + JP 3 の market-matched 6 strategies**
- **非推奨**: 6 strategies を両市場へ cross-apply すること
- 理由:
  - 最新 results / handoff が market-specific winner を支持している
  - 既存 config / docs / runner の流れに自然に接続できる
  - 比較結果の解釈が崩れにくい

## In scope

- worker1 / worker2 readiness gate の確認
- dual-worker distinct parallel smoke の事前確認
- `long-run-us-100.json` / `long-run-jp-100.json` の作成
- `long-run-us-entry-sweep-100x3.json` / `long-run-jp-exit-sweep-100x3.json` の作成
- `tests/campaign.test.js` の拡張
- worker1-only fallback での smoke / pilot / full 実行
- 実行後の docs / artifacts 更新

## Out of scope

- date range の変更
- strategy 数を 6 超に増やすこと
- 4 worker 並列
- backtest core ロジックの大幅変更
- worker2 の認証自動化
- dual-worker 不安定時に worker2 を本線へ戻す追加切り分け
- `main` 以外のブランチへ切り替えること

## Files to create / modify / move

### Create

- `config/backtest/universes/long-run-us-100.json`
- `config/backtest/universes/long-run-jp-100.json`
- `config/backtest/campaigns/long-run-us-entry-sweep-100x3.json`
- `config/backtest/campaigns/long-run-jp-exit-sweep-100x3.json`
- `docs/research/latest/next-long-run-market-matched-200-handoff_YYYYMMDD_HHMM.md`
- `docs/research/latest/next-long-run-market-matched-200-results_YYYYMMDD_HHMM.md`
- `docs/working-memory/session-logs/next-long-run-market-matched-200_YYYYMMDD_HHMM.md`
- `docs/references/backtests/<campaign-id>-smoke-recovered_YYYYMMDD_HHMM.json`
- `docs/references/backtests/<campaign-id>-smoke-recovered_YYYYMMDD_HHMM.summary.json`
- `docs/references/backtests/<campaign-id>-pilot-recovered_YYYYMMDD_HHMM.json`
- `docs/references/backtests/<campaign-id>-pilot-recovered_YYYYMMDD_HHMM.summary.json`
- `docs/references/backtests/<campaign-id>-full-recovered_YYYYMMDD_HHMM.json`
- `docs/references/backtests/<campaign-id>-full-recovered_YYYYMMDD_HHMM.summary.json`

### Modify

- `tests/campaign.test.js`
- `docs/command.md`

### Move during COMMIT step

- `docs/exec-plans/active/next-long-run-market-matched-200_20260409_0115.md`
  -> `docs/exec-plans/completed/next-long-run-market-matched-200_20260409_0115.md`

## Universe / campaign design

### Universe design

- `long-run-us-100.json`
  - 既存 `long-run-us-50.json` の 50 symbols を先頭に保持する
  - 後半に US 追加 50 symbols を append し、比較継続性を保つ
- `long-run-jp-100.json`
  - 既存 `long-run-jp-50.json` の 50 symbols を先頭に保持する
  - 後半に JP 追加 50 symbols を append する

### Campaign design

- `long-run-us-entry-sweep-100x3.json`
  - universe: `long-run-us-100`
  - preset_ids: US 3 candidates
  - phases: smoke `10`, pilot `25`, full `100`
  - date_override: `{ "from": "2000-01-01", "to": "2099-12-31" }`
  - execution.worker_ports: `[9223, 9225]`
- `long-run-jp-exit-sweep-100x3.json`
  - universe: `long-run-jp-100`
  - preset_ids: JP 3 candidates
  - phases: smoke `10`, pilot `25`, full `100`
  - date_override: `{ "from": "2000-01-01", "to": "2099-12-31" }`
  - execution.worker_ports: `[9223, 9225]`

### Expected matrix sizes

- US full: `100 * 3 = 300`
- JP full: `100 * 3 = 300`
- total full: `600 runs`

## Readiness / parallel test plan

### Gate 1: reachability

- worker1 / worker2 の `json/version` が応答する
- worker1 / worker2 の `status` が `success: true` / `api_available: true` を返す

### Gate 2: onboarding / welcome detection

- worker2 の `json/list` を確認する
- `dialog-window ... type=welcome` や onboarding 残存があれば **即停止**
- **この場合はユーザーの手動 login / onboarding 完了待ち**

### Gate 3: individual warm-up

- worker1 単独 backtest 1 本 success
- worker2 単独 backtest 1 本 success

### Gate 4: distinct parallel smoke

- worker1 / worker2 で **異なる preset / symbol** を同時実行する
- 両方 success の場合のみ campaign 実行へ進む
- unreadable / tester failure / Pine Editor failure が出たら full run へ進まず停止する

### Gate 4 outcome

- worker1: success
- worker2: `metrics_unreadable` が 2 回連続で再現
- 結論: dual-worker gate は今回の環境では不合格
- ユーザー承認済み fallback: **worker1 single-worker execution**

## Phased execution plan

### Phase 0: config / test validation

- universe / campaign テスト追加
- dry-run で matrix / worker / shard を確認

### Phase 1: live readiness

- worker 起動 / reachability / status / welcome 検出
- individual warm-up
- distinct parallel smoke
- dual-worker 不合格時は worker1-only 実行へ切り替える

### Phase 2: smoke

- US smoke 実行
- JP smoke 実行
- recovered artifacts を確認

### Phase 3: pilot

- US pilot 実行
- JP pilot 実行
- checkpoint / recovered-results を確認

### Phase 4: full

- US full 実行
- JP full 実行

### Phase 5: documentation / handoff

- latest results 作成
- latest handoff 作成
- session log 作成
- raw artifacts / summary artifacts を固定化

## Validation commands

```bash
node --test tests/campaign.test.js
npm test
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-100x3 --phase smoke --dry-run
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-100x3 --phase smoke --dry-run
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-100x3 --phase pilot --dry-run
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-100x3 --phase pilot --dry-run
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9225/json/version
curl -sS http://172.31.144.1:9225/json/list
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest preset donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early --symbol AAPL --date-from 2000-01-01 --date-to 2099-12-31
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js backtest preset donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight --symbol TSE:7203 --date-from 2000-01-01 --date-to 2099-12-31
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-100x3 --phase smoke --host 172.31.144.1 --ports 9223,9225
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-100x3 --phase smoke --host 172.31.144.1 --ports 9223,9225
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-100x3 --phase pilot --host 172.31.144.1 --ports 9223,9225
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-100x3 --phase pilot --host 172.31.144.1 --ports 9223,9225
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-100x3 --phase full --host 172.31.144.1 --ports 9223,9225
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-100x3 --phase full --host 172.31.144.1 --ports 9223,9225
```

## Test strategy (RED / GREEN / REFACTOR)

### RED

- `tests/campaign.test.js` に失敗テストを先に追加する
  - `long-run-us-100` / `long-run-jp-100` が valid
  - `long-run-us-entry-sweep-100x3` / `long-run-jp-exit-sweep-100x3` が valid
  - `loadCampaign()` で symbol 数 / strategy 数 / matrix 数が期待通り
  - phase sizing が `10 / 25 / 100`
  - US campaign は全 symbol が `market=US`
  - JP campaign は全 symbol が `market=JP`

### GREEN

- universe / campaign JSON を最小差分で追加する
- dry-run が通る状態にする
- readiness と smoke を通す

### REFACTOR

- `tests/campaign.test.js` の helper 重複を整理する
- 必要なら orchestration を script 化する
- docs を最小限で整理する

## Risks

1. **worker2 parallel readability risk**
   - visible 起動と individual warm-up は通っても、parallel で `metrics_unreadable` が再現する
   - 今回は worker1-only へ切り替えて回避する
2. long single-worker wall-clock
   - 600 runs を直列で回すため、checkpoint / recovered artifact を必ず残す
3. docs generation drift
   - new latest 作成時に previous / old の移動を同じ commit で揃える
3. unreadable / Pine Editor / tester instability
   - full 前に smoke / pilot で十分確認する
4. symbol expansion risk
   - 100 化で runtime と retry 範囲が広がる
5. market concentration risk
   - US は AAPL、JP は `TSE:8002` 依存の可能性が残る

## Implementation steps

- [ ] source of truth を最新 deep dive docs に固定する
- [ ] `tests/campaign.test.js` に RED テストを追加する
- [ ] `config/backtest/universes/long-run-us-100.json` を作成する
- [ ] `config/backtest/universes/long-run-jp-100.json` を作成する
- [ ] `config/backtest/campaigns/long-run-us-entry-sweep-100x3.json` を作成する
- [ ] `config/backtest/campaigns/long-run-jp-exit-sweep-100x3.json` を作成する
- [ ] `node --test tests/campaign.test.js` を通す
- [ ] `npm test` を通す
- [ ] `--dry-run` で US / JP campaign の matrix と shard を確認する
- [ ] worker1 / worker2 の `json/version` 到達性を確認する
- [ ] worker1 / worker2 の `status` を確認する
- [ ] worker2 の `json/list` で welcome / onboarding の残存有無を確認する
- [ ] **welcome / onboarding があれば実行を停止し、ユーザー入力待ちに入る**
- [ ] worker1 の individual warm-up backtest を通す
- [ ] worker2 の individual warm-up backtest を通す
- [ ] distinct parallel smoke を通す
- [ ] US smoke を実行する
- [ ] JP smoke を実行する
- [ ] US pilot を実行する
- [ ] JP pilot を実行する
- [ ] US full を実行する
- [ ] JP full を実行する
- [ ] `docs/references/backtests/` に artifacts を固定する
- [ ] `docs/research/latest/` の results / handoff を更新する
- [ ] `docs/working-memory/session-logs/` に session log を残す
- [ ] COMMIT step で plan を completed へ移動する

## Notes

- known-good topology は **dual-worker / 2 worker parallel** まで
- pane/tab support は parallel backtest の代替ではない
- 今回は worker2 が login を求めたら、実行を止めてユーザー入力待ちに入る
