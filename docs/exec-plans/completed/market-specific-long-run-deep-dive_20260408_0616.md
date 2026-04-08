# 実行計画: market-specific long-run deep dive (20260408_0616)

- ステータス: COMPLETED / FULL RUN COMPLETE
- 種別: research continuation / implementation / long-run execution
- 前提ブランチ: `main`

## Problem

直近の `long-run-cross-market-100x5` campaign は、**100 symbols × 5 strategies = 500 runs** を `2000-01-01 -> latest` で回し、`485 success / 15 unreadable / 0 failure` まで回収できた。

ただし勝ち筋は market で分かれた。

1. **US** は `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early` が最も強い
2. **JP** は `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight` が最も強い
3. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-8pct-theme-breadth-quality-balanced-wide` は overall では弱く、次段 shortlist の主軸から外すのが自然

次ラウンドでは、「US は entry 側の period が効いているのか」「JP は exit 側の period が効いているのか」を**市場別に切り分けて**確認し、market ごとに別 strategy を持つべきか、共通 strategy に寄せるべきかを判断できる状態にする。

## Source of truth

- `docs/research/latest/long-run-cross-market-campaign-handoff_20260408_0320.md`
- `docs/working-memory/session-logs/long-run-cross-market-campaign_20260408_0320.md`
- `results/campaigns/long-run-cross-market-100x5/full/recovered-summary.json`
- `results/campaigns/long-run-cross-market-100x5/full/recovered-results.json`
- `config/backtest/campaigns/long-run-cross-market-100x5.json`
- `config/backtest/universes/long-run-cross-market-100.json`
- `config/backtest/strategy-presets.json`
- `command.md`

## Current findings that motivate the next round

### Overall

- coverage: `485 / 500 = 97.0%`
- by market:
  - US: `245 ok / 5 unreadable`
  - JP: `240 ok / 10 unreadable`
- overall avg net profit top:
  1. preset2 `8501.69`
  2. preset4 `8465.28`
  3. preset1 `8386.17`
- overall profit factor / wins top:
  - preset5 `avg PF 2.307`, wins `39`

### Market-specific signal

#### US

- avg net profit top:
  1. preset2 `7161.70`
  2. preset4 `7044.22`
  3. preset1 `6758.82`
- symbol wins:
  1. preset2 `22`
  2. preset5 `14`
  3. preset1 `12`

#### JP

- avg net profit top:
  1. preset1 `10047.43`
  2. preset5 `9973.56`
  3. preset4 `9945.56`
- avg profit factor top:
  1. preset5 `3.31`
  2. preset3 `1.99`
  3. preset1 `1.97`
- symbol wins:
  1. preset5 `25`
  2. preset2 `11`
  3. preset1 `10`

## Goal

1. **US** では strict family の **entry period** 感応度を long-run で確かめる
2. **JP** では tight family の **exit period** 感応度を long-run で確かめる
3. market 別の勝ち筋を durable docs と raw artifacts に残す
4. unreadable 残件を別 bucket として切り出し、本線の strategy judgment と混同しない

## Proposed approach

次ラウンドは 2 本立てで行う。

1. **US entry sweep**
   - family: regime-60 strict
   - presets:
     1. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
     2. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
     3. `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
   - target universe: US 50 symbols（US equities 40 + US ETF proxies 10）

2. **JP exit sweep**
   - family: regime-55 tight
   - presets:
     1. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
     2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
     3. `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide`
   - target universe: JP 50 symbols（JP equities 40 + JP ETF proxies 10）

想定 full matrix:

- US: `50 symbols × 3 presets = 150 runs`
- JP: `50 symbols × 3 presets = 150 runs`
- total: **300 runs**

## In scope

- existing long-run 100-symbol universe を US 50 / JP 50 に分割した universe config 追加
- US / JP の market-specific campaign config 追加
- 既存 preset を再利用した market-specific long-run deep dive 実行
- smoke / pilot / full の checkpoint / recovery 運用
- recovered summary を正本にした market-specific ranking doc 作成
- `docs/research/latest/` 更新
- session log と raw artifact の保存
- unreadable 残件の別管理メモ化

## Out of scope

- 4 worker 以上への拡張
- intraday / timeframe 変更
- regime / stop / filter / theme の多軸 sweep
- preset3 breadth-quality family の掘り下げ継続
- 既存 campaign runner の大規模再設計
- 15 unreadable の根治修正をこの round の主目的にすること

## Files to create / modify / delete

### Create

- `config/backtest/universes/long-run-us-50.json`
- `config/backtest/universes/long-run-jp-50.json`
- `config/backtest/campaigns/long-run-us-entry-sweep-50x3.json`
- `config/backtest/campaigns/long-run-jp-exit-sweep-50x3.json`
- `docs/research/latest/market-specific-long-run-deep-dive-handoff_YYYYMMDD_HHMM.md`
- `docs/research/latest/market-specific-long-run-deep-dive-results_YYYYMMDD_HHMM.md`
- `docs/working-memory/session-logs/market-specific-long-run-deep-dive_YYYYMMDD_HHMM.md`
- `docs/references/backtests/long-run-us-entry-sweep-50x3-smoke-recovered_YYYYMMDD_HHMM.json`
- `docs/references/backtests/long-run-us-entry-sweep-50x3-smoke-recovered_YYYYMMDD_HHMM.summary.json`
- `docs/references/backtests/long-run-us-entry-sweep-50x3-pilot-recovered_YYYYMMDD_HHMM.json`
- `docs/references/backtests/long-run-us-entry-sweep-50x3-pilot-recovered_YYYYMMDD_HHMM.summary.json`
- `docs/references/backtests/long-run-us-entry-sweep-50x3-full-recovered_YYYYMMDD_HHMM.json`
- `docs/references/backtests/long-run-us-entry-sweep-50x3-full-recovered_YYYYMMDD_HHMM.summary.json`
- `docs/references/backtests/long-run-jp-exit-sweep-50x3-smoke-recovered_YYYYMMDD_HHMM.json`
- `docs/references/backtests/long-run-jp-exit-sweep-50x3-smoke-recovered_YYYYMMDD_HHMM.summary.json`
- `docs/references/backtests/long-run-jp-exit-sweep-50x3-pilot-recovered_YYYYMMDD_HHMM.json`
- `docs/references/backtests/long-run-jp-exit-sweep-50x3-pilot-recovered_YYYYMMDD_HHMM.summary.json`
- `docs/references/backtests/long-run-jp-exit-sweep-50x3-full-recovered_YYYYMMDD_HHMM.json`
- `docs/references/backtests/long-run-jp-exit-sweep-50x3-full-recovered_YYYYMMDD_HHMM.summary.json`

### Modify

- `docs/research/latest/README.md`
- `command.md`
- `tests/campaign.test.js`

### Move during COMMIT step

- `docs/exec-plans/active/market-specific-long-run-deep-dive_20260408_0616.md`
  → `docs/exec-plans/completed/market-specific-long-run-deep-dive_20260408_0616.md`

### Delete

- なし

## 実装ステップ

- [x] recovered results から US / JP の market-specific summary を再計算し、今回の deep dive の評価軸を固定する
- [x] `long-run-cross-market-100` から US 50 / JP 50 を切り出した universe config を作る
- [x] US entry sweep / JP exit sweep の campaign config を作る
- [x] config validation を先にテストで固定する
- [x] smoke phase を両 campaign で実行し、runner / artifact path / recovery 動線を確認する
- [x] pilot phase を実行し、unreadable clustering と wall-clock を観測する
- [x] full phase を実行し、recovered summary を正本として集計する
- [x] market-specific ranking と key symbols を docs 化する
- [x] latest handoff / results / session log / raw artifacts を整理する
- [x] plan を completed へ移す
- [ ] commit / push する

## Test strategy (RED / GREEN / REFACTOR)

### RED

- `tests/campaign.test.js` に先に失敗テストを書く
  - US 50 / JP 50 universe が期待件数・market/bucket を満たす
  - 新 campaign config が `2000-01-01 -> latest` と 3 preset matrix を正しく定義する
  - smoke / pilot / full の symbol_count が deep dive 想定に一致する

### GREEN

- universe / campaign config を最小差分で追加し、既存 campaign runner をそのまま使ってテストを通す
- 新規 core code は極力増やさず、既存 execution path を再利用する

### REFACTOR

- long-run cross-market 本体との重複記述を減らす
- docs では「overall results」と「market-specific deep dive」を明確に分ける
- unreadable 管理メモを本線結果と別セクションに整理する

## Validation commands

```bash
node --test tests/campaign.test.js
npm test
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-50x3 --phase smoke --host 172.31.144.1 --ports 9223
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-50x3 --phase smoke --host 172.31.144.1 --ports 9223
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-50x3 --phase pilot --host 172.31.144.1 --ports 9223
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-50x3 --phase pilot --host 172.31.144.1 --ports 9223
node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-50x3 --phase full --host 172.31.144.1 --ports 9223
node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-50x3 --phase full --host 172.31.144.1 --ports 9223
```

## Risks

- US / JP を 50-symbol に切り出すと、mixed-order smoke/pilot より unreadable の偏りが強く出る可能性がある
- ETF proxy を含めることで equities と index proxy の勝ち筋が混ざる
- existing preset names は揃っているが、campaign config 側の phase 設計次第で symbol_count の期待とズレる可能性がある
- residual unreadable 15 件と新 round の unreadable が混ざると比較が汚れる
- long-run 実行は wall-clock が長く、resume 前提の運用になる可能性が高い

## Notes

- 前回結果からは、**US は preset2 family、JP は preset5 / preset1 family** に集中するのが最も説明力が高い
- deep dive の主眼は「より強い 1 本を決める」だけでなく、**market 別に別 family を採用すべきか**を判断すること
- 実装は config / docs / execution 中心で済む見込みで、core code 変更は原則避ける
- live execution はその後回復し、worker1 single-worker で smoke `60/60`、pilot `150/150`、full `300/300` を回収できた
- worker2 は CDP reachable だが welcome / onboarding が残り、本 round では execution-ready に戻らなかった
