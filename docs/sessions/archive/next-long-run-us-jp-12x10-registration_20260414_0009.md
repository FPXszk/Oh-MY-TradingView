# Session log: next-long-run-us-jp-12x10-registration_20260414_0009

## 目的

fine-tune 100x10 完走結果から上位 10 戦略を選定し、US / JP 各 12 銘柄（3 カテゴリ × 4 銘柄）の focused campaign として repo に登録する。

## 判断経緯

1. fine-tune 100x10 の US full / JP full 完走（各 1000/1000 success）を確認
2. 成績比較から上位 10 戦略を選定
   - 本線 tight group (4), strict control group (3), exit/stop variation group (3)
   - US / JP 共通の 10 preset IDs で統一
3. 銘柄選定は 3 カテゴリ方針に基づく
   - winners: 強トレンド代表 4 銘柄
   - mature-range: レンジ/成熟期 4 銘柄
   - defense-test: 防御的/低成長 4 銘柄
4. 期間は fine-tune と同一（2000-01-01 〜 2099-12-31）で比較可能性を維持

## 参照した既存リソース

| resource | 参照目的 |
|----------|----------|
| `config/backtest/campaigns/next-long-run-us-finetune-100x10.json` | 既存 campaign shape の踏襲 |
| `config/backtest/campaigns/next-long-run-jp-finetune-100x10.json` | 既存 campaign shape の踏襲 |
| `config/backtest/universes/long-run-us-100.json` | universe JSON format の参照 |
| `config/backtest/universes/long-run-jp-100.json` | universe JSON format の参照 |
| `docs/research/latest/README.md` | 世代管理ルールの確認 |
| `docs/research/next-long-run-finetune-complete-handoff_20260413_1623.md` | 前世代 handoff の確認 |
| `docs/research/next-long-run-finetune-complete-results_20260413_1623.md` | 前世代 results の確認 |
| `docs/working-memory/session-logs/next-strategy-candidates-docs-registration_20260411_1843.md` | session log format の参照 |
| `docs/working-memory/session-logs/latest-backtest-results-consolidation_20260413_1623.md` | 前回の世代更新手順 |

## Active plan 衝突確認

以下の active plan と file overlap がないことを確認：
- `document-self-hosted-runner-foreground-autostart_20260412_0006.md` — runner docs（無衝突）
- `investigate-night-batch-self-hosted-queued_20260410_2307.md` — workflow 調査（無衝突）
- `rerun-night-batch-after-run-cmd_20260410_1714.md` — rerun docs（無衝突）
- `run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md` — dispatch docs（無衝突）

## 10 戦略 preset IDs

1. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
2. `donchian-55-20-rsp-filter-rsi14-regime-48-hard-stop-8pct-theme-deep-pullback-tight-early`
3. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-10pct-theme-deep-pullback`
4. `donchian-55-20-rsp-filter-rsi14-regime-50-hard-stop-10pct-theme-deep-pullback-earlier`
5. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict`
6. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`
7. `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
8. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
9. `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide`
10. `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow`

## US 12 銘柄

- winners: NVDA, AAPL, META, MSFT
- mature-range: DIS, QCOM, CAT, XOM
- defense-test: INTC, VZ, PFE, T

## JP 12 銘柄

- winners: TSE:7203, TSE:8002, TSE:5802, TSE:8058
- mature-range: TSE:9984, TSE:6857, TSE:9107, TSE:6506
- defense-test: TSE:7201, TSE:4503, TSE:9432, TSE:7751

## 期間

- from: 2000-01-01
- to: 2099-12-31

## 次回実行対象

| type | ID |
|------|----|
| US campaign | `next-long-run-us-12x10` |
| JP campaign | `next-long-run-jp-12x10` |
| US universe | `next-long-run-us-12` |
| JP universe | `next-long-run-jp-12` |

## Phase 設計の判断

12 銘柄では従来の `symbol_count` のみだと先頭スライスでカテゴリ偏りが生じる。
`phases.<phase>.symbols` を使い、smoke / pilot で 3 カテゴリ全カバーを保証した。

- smoke: 3 銘柄（各カテゴリ 1 銘柄）→ 30 run
- pilot: 6 銘柄（各カテゴリ 2 銘柄）→ 60 run
- full: 12 銘柄（全銘柄）→ 120 run

## Push スコープ

- config/backtest/universes/next-long-run-us-12.json
- config/backtest/universes/next-long-run-jp-12.json
- config/backtest/campaigns/next-long-run-us-12x10.json
- config/backtest/campaigns/next-long-run-jp-12x10.json
- tests/campaign.test.js
- docs/research/latest/README.md
- docs/research/latest/next-long-run-us-jp-12x10-handoff_20260414_0009.md
- docs/research/latest/next-long-run-us-jp-12x10-details_20260414_0009.md
- docs/research/next-long-run-finetune-complete-handoff_20260413_1623.md（移動先）
- docs/research/next-long-run-finetune-complete-results_20260413_1623.md（移動先）
- docs/working-memory/session-logs/next-long-run-us-jp-12x10-registration_20260414_0009.md

## 実装時の注意点

- `config/backtest/strategy-presets.json` は変更しない
- `docs/research/results/` 配下の artifact は commit しない
- runner / workflow / docs/command.md には触れない
