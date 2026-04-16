# Latest research handoff

このディレクトリは、**最新 1 世代** の handoff と要約だけを置く入口です。

## 読む順番

1. repo の入口として `../../../README.md`
2. この `README.md`
3. `next-long-run-us-jp-12x10-handoff_20260414_0009.md`
4. `next-long-run-us-jp-12x10-details_20260414_0009.md`
5. `project-improvement-review.md`
6. `external-agent-pattern-comparison.md`
7. `../strategy/README.md`
8. テーマ投資の判断基準が必要なら `../strategy/theme-momentum-definition.md`
9. 別系列の最新 main summary として `main-backtest-latest-summary.md`
10. 判断経緯が必要なら `../../working-memory/session-logs/`

## `latest` の意味

- **latest handoff generation** は **12x10 registration 世代**
- **latest main backtest summary** は `main-backtest-latest-summary.md` を指し、利用可能な最新 main artifact から再生成される
- 2026-04-15 時点では main summary の入力 artifact は `next-long-run-*-finetune-100x10` の smoke recovered results
- そのため、handoff の latest 世代と main summary の入力 campaign は同一とは限らない

## 現在の latest handoff generation

- latest handoff generation は **12x10 registration 世代**
- campaign ID: `next-long-run-us-12x10` / `next-long-run-jp-12x10`
- universe ID: `next-long-run-us-12` / `next-long-run-jp-12`
- strongest set は `config/backtest/strategy-presets.json` の 30 戦略に圧縮済み
- 過去世代の docs は `../archive/` を参照する

## 運用ルール

- ここには **README + manifest.json に記載された latest 世代 docs** だけを置く
- `manifest.json` の `keep` 配列が latest に残すファイルの正本定義
- `scripts/docs/archive-stale-latest.mjs` が manifest を読み、keep 外の .md を `../archive/` に移す
- 数値の正本は `../../references/backtests/` と `../results/` を参照する
- 戦略・銘柄の人間向け説明は `../strategy/` を参照する
- 手書きの判断基準は `../strategy/theme-momentum-definition.md` の stable path を使う
- dual-worker の historical runbook は `../archive/dual-worker-parallel-backtest-runbook_20260406_0735.md`
