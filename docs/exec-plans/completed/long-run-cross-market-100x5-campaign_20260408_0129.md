# 実行計画: long-run cross-market 100x5 campaign (20260408_0129)

- ステータス: COMPLETE
- 種別: research / implementation / long-run execution planning
- 前提ブランチ: `main`

## Problem

最新の strongest 系 backtest 結果を起点に、**2000年から最新取得日まで** を対象とした長期 campaign を実施したい。対象は **約 100 symbols × 5 strategies = 500 runs** で、米国株だけでなく日本株と指数系も含めたい。

ただし current stable topology は **dual-worker / 2 worker parallel** までで、fresh 状態や長時間 batch では `metrics_unreadable` / `apply_failed` / symbol history 差異が残る。よって、単発コマンドで 500 run を一気に流すのではなく、**manifest + shard + checkpoint + exact rerun** 前提の campaign として設計する必要がある。

## Feasibility summary

### 結論

- **実現可能**。ただし条件付きで、current repo / TradingView 運用では **段階実行** が必須
- 前提条件:
  1. dual-worker / 2 worker parallel を維持する
  2. `restore_policy: "skip"` と warm-up 成功を確認する
  3. 100 symbols は history / symbol notation / market access を確認した curated manifest にする
  4. 指数は cash index を無理に固定せず、必要に応じて **ETF proxy を優先**する
  5. **2000年→latest の date override は現行 CLI では未露出**なので、runner または CLI 側で期間指定導線を追加する

### 実測ベースの所要時間見積もり

直近 recovered summary の aggregate elapsed から見ると、1 run あたりの実測平均はおおむね **22〜28 秒**。

- round11 alt recovered: `300 runs / 6,611,129 ms` → **22.0 s/run**
- round10 top4 alt recovered: `200 runs / 4,697,795 ms` → **23.5 s/run**
- round11 shortlist recovered: `81 runs / 2,017,683 ms` → **24.9 s/run**
- round11 Mag7 recovered: `105 runs / 2,930,310 ms` → **27.9 s/run**

500 run の campaign を dual-worker 理想並列で単純換算すると:

1. best case: `500 × 22s / 2` → **約 92 分**
2. conservative raw case: `500 × 28s / 2` → **約 117 分**

実運用では warm-up / checkpoint / rerun / drift 対応が乗るため、現実的な wall-clock は:

1. **best**: **2〜3 時間**
2. **likely**: **3〜6 時間**
3. **worst**: **6〜10 時間以上**（fresh drift, JP/index history 差, unreadable cluster, apply_failed 多発）

## Proposed strategy set (initial 5)

直近の cross-universe / phase B shortlist を踏まえ、初回 100x5 campaign の候補は次の 5 本を推奨する。

1. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
2. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
3. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide`
4. `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early`
5. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`

### 理由

- 1〜3 は latest shortlist / cross-universe 上位の本線
- 4〜5 は alt recovered で強かった tight family variation
- strict / tight / breadth の 3 family を残しつつ、tight family を厚めに見る構成

## Proposed universe shape (100 symbols)

初回は **代表性と history の取りやすさ** を優先し、以下の配分を仮置きする。

1. US equities: **40**
2. JP equities: **40**
3. US index / ETF proxies: **10**
4. JP index / ETF proxies: **10**

### Universe rules

- US / JP equities は大型・高流動・長期履歴が比較的安定している銘柄を優先
- 指数は direct index symbol と ETF proxy を両方候補に持つが、**実行 manifest は ETF proxy 優先**
- 2000 年フル history が取れない symbol は
  - 除外
  - あるいは earliest-available を記録して別セグメント扱い
  のどちらかに統一する

## Execution policy

1. current stable topology は **2 worker parallel のみ**
2. **4 parallel はやらない**
3. full campaign 前に **3 連続 warm-up success / unreadable 0** を確認する
4. shard parallel を優先し、checkpoint ごとに exact unreadable rerun を回収する
5. 結果の正本は raw ではなく **recovered summary**

## In scope

- 100-symbol manifest の設計と curated config 化
- 5-strategy shortlist の固定
- smoke / pilot / full を回せる campaign runner の設計
- checkpoint / rerun / recovery policy の実装
- artifact / summary / session log / latest docs 更新
- 長時間 batch の wall-clock / unreadable / apply_failed 観測

## Out of scope

- 4 worker 以上への拡張
- intraday timeframe campaign
- 自動売買 / live execution
- strategy family の大規模追加探索
- direct index symbol が不安定な場合の無理な採用

## Files to create / modify / delete

### Create

- `config/backtest/campaigns/long-run-cross-market-100x5.json`
- `scripts/backtest/run-long-campaign.mjs`
- `scripts/backtest/recover-long-campaign.mjs`
- `tests/backtest-campaign-runner.test.js`
- `docs/research/latest/long-run-cross-market-campaign-handoff_20260408_0129.md`

### Modify

- `docs/command.md`
- `src/cli/commands/backtest.js`
- `src/core/backtest.js`
- `docs/research/latest/README.md`
- `docs/working-memory/session-logs/` の該当 session log

### Move during COMMIT step

- `docs/exec-plans/active/long-run-cross-market-100x5-campaign_20260408_0129.md`
  → `docs/exec-plans/completed/long-run-cross-market-100x5-campaign_20260408_0129.md`

### Delete

- なし

## 実装ステップ

- [x] latest strongest 結果から 5 strategy shortlist を固定する
- [x] US / JP / index-or-ETF proxy を混ぜた 100-symbol manifest を作る
- [x] 2000年→latest を扱える date override 導線を CLI / runner に追加する
- [x] 2000年起点に必要 history を満たす symbol だけを残す validation 方針を決める
- [x] smoke subset（10 symbols × 5 strategies = 50 runs）を回せる runner / config を作る
- [x] shard / checkpoint / exact unreadable rerun を runner に組み込む
- [x] pilot subset（25 symbols × 5 strategies = 125 runs）で wall-clock と recovery cost を測る
- [x] full 100x5 campaign を dual-worker shard parallel で回す
- [x] recovered summary を正規結果として集計する
- [x] latest docs / session log / command guide を更新する

## TDD 方針（RED / GREEN / REFACTOR）

### RED

- `tests/backtest-campaign-runner.test.js` に先に失敗テストを書く
  - campaign config が 5 strategies / 100 symbols / checkpoint policy を正しく読む
  - shard 生成が market mix を崩しすぎない
  - checkpoint resume が exact rerun queue を壊さない
  - invalid symbol / duplicate symbol / unsupported preset を早期に弾く
  - date range override が config / CLI / runner 間で壊れない

### GREEN

- 最小 runner で smoke subset を回せる状態まで持っていく
- 既存 `tv backtest preset` 経路を再利用し、独自ロジックは manifest / shard / recovery orchestration に限る

### REFACTOR

- raw artifact / recovered artifact / summary 作成の責務を整理する
- symbol manifest と runtime state を分離する
- long-run replay / recovery を小さな module に分解する

## Validation commands

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
npm test
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 npm run test:all
node scripts/backtest/run-long-campaign.mjs --phase smoke
node scripts/backtest/run-long-campaign.mjs --phase pilot
node scripts/backtest/run-long-campaign.mjs --phase full
```

## Risks

- **history coverage drift**: 日本株や index 系で 2000 年起点を満たさない symbol が混ざる
- **date range gap**: 現行 CLI の既定期間だけでは 2000年→latest を表現できず、追加導線が必要
- **notation drift**: US / JP / index / ETF で TradingView symbol notation が揺れる
- **unreadable clustering**: 長時間 batch で `metrics_unreadable` が shard に偏る
- **apply_failed spikes**: universes によって strategy attach/readability が悪化する
- **overnight instability**: warm-up 成功後でも TradingView state が崩れる
- **index execution ambiguity**: cash index と ETF proxy で結果意味論が変わる
- **operator cost**: full campaign を 1 回で回し切れず、checkpoint 再開が必要になる可能性が高い

## Notes

- 現時点では、**full 100x5 をいきなり本番投入するより smoke→pilot→full の 3 段で進める** のが最も安全
- 特に JP / index 系は symbol manifest を先に固めないと、wall-clock より前に data coverage で崩れる可能性がある
- 2026-04-08 時点の live progress:
  - smoke: `47 success / 3 unreadable / 0 failure / 50 total`
  - pilot: `110 success / 15 unreadable / 0 failure / 125 total`
  - full: `485 success / 15 unreadable / 0 failure / 500 total`
