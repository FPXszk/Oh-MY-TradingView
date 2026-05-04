# Smoke Metrics Gate Hardening 計画

## 目的

Night Batch Smoke / smoke-prod の成功判定を、従来の「コンパイル・CLI 実行成功」中心から「Strategy Tester の数値 metrics 取得成功」まで引き上げる。今回のように Pine は compile/apply 成功でも、runtime error により Strategy Tester metrics が `metrics_unreadable` になるケースを smoke の時点で必ず失敗させる。

## 前提

- 既存の result model では `compile_detail.success=true` かつ `result.success=true` でも、`tester_available=false` / `tester_reason_category=metrics_unreadable` になり得る。
- smoke 専用 workflow は `.github/workflows/night-batch-smoke.yml`。
- smoke-prod は `python/night_batch.py smoke-prod --smoke-only` から `scripts/backtest/run-finetune-bundle.mjs --phases smoke` を実行する。
- `run-long-campaign.mjs` は smoke phase の `recovered-results.json` / `strategy-ranking.json` を出力する。

## 変更・作成・削除するファイル

- 変更: `scripts/backtest/run-finetune-bundle.mjs`
  - smoke phase 完了後に campaign artifact を読み、全 smoke run が有効 metrics を持つか検証する gate を追加する。
  - `metrics_unreadable` / `panel_not_visible` / `no_strategy_applied` / metrics 欠損 / runtime error らしい tester text を smoke 失敗にする。
- 変更: `tests/night-batch.test.js`
  - smoke metrics gate が metrics 欠損を失敗扱いするテストを追加する。
  - smoke metrics gate が全 run metrics ありのケースを成功扱いするテストを追加する。
- 変更: `tests/campaign.test.js` または新規テスト不要の場合は既存テストのみ
  - 必要に応じて `summarizeResults` / metrics 判定との整合を確認する。
- 変更しない: `.github/workflows/night-batch-smoke.yml`
  - workflow の実行入口は既に smoke-only になっているため、まずは呼び出し先の gate を強化する。
- 削除: なし

## 影響範囲

- smoke phase の終了コードが厳しくなる。
- production/full phase のランキング・集計ロジックには直接変更しない。
- smoke-only workflow と smoke-prod の smoke gate の両方に効く。
- 既存の compile 成功確認は残し、その後に metrics gate を追加する。

## 実装ステップ

- [ ] smoke artifact の読み取り箇所を特定する
  - 確認: `run-long-campaign.mjs` が出力する `artifacts/campaigns/{campaign}/{phase}/recovered-results.json` のパスを `run-finetune-bundle.mjs` から決定できる。
- [ ] smoke metrics gate を追加する
  - 確認: phase が `smoke` のときだけ、各 campaign の `recovered-results.json` を読み、全 run で `result.metrics` が存在し、主要数値が有限であることを要求する。
- [ ] smoke 失敗時のエラーメッセージを高シグナルにする
  - 確認: presetId / symbol / reason category / tester_reason / metrics 欠損件数を stderr に出す。
- [ ] smoke 時点で見るべき追加項目を実装または明記する
  - 確認: `compile_detail.success`、`apply_failed=false`、`tester_available=true`、`metrics` 主要項目あり、`closed_trades` 取得可、`tester_reason_category` が空であることを smoke gate の基準にする。
- [ ] RED テストを追加する
  - 確認: fake smoke artifact に `metrics_unreadable` を含めたとき、`smoke-prod` または `run-finetune-bundle.mjs --phases smoke` が非0終了になる。
- [ ] GREEN 実装を通す
  - 確認: fake smoke artifact が全 run metrics ありなら exit 0 のまま。
- [ ] 既存テストを実行する
  - 確認: `node --test tests/night-batch.test.js tests/campaign.test.js` を実行する。必要なら対象テストに絞って原因を切り分ける。
- [ ] 変更内容をレビューする
  - 確認: production/full に不要な副作用がないこと、smoke failure が過剰に曖昧でないことを確認する。
- [ ] plan を completed に移動してコミット・プッシュする
  - 確認: Conventional Commit 形式で main に push する。

## Smoke 時点で追加して見るべき項目

- **必須 metrics 取得**: `net_profit` / `profit_factor` / `max_drawdown` / `percent_profitable` / `closed_trades` のキーが存在すること。
- **runtime error の間接検知**: `tester_reason_category=metrics_unreadable`、`tester_available=false`、metrics 欠損をすべて失敗にする。
- **apply 成功確認**: `apply_failed` が true の run を smoke 失敗にする。
- **fallback metrics の扱い**: smoke では `fallback_metrics` だけの degraded success を成功扱いしない。TradingView Strategy Tester から直接 metrics が読めることを要求する。
- **対象範囲の妥当性**: smoke phase の matrix が空でないこと、実行件数が 0 でないことを失敗にする。

## テスト戦略

### RED

- fake `recovered-results.json` に `success=true` / `compile_detail.success=true` / `tester_available=false` / `tester_reason_category=metrics_unreadable` を含め、smoke が失敗することを確認する。

### GREEN

- fake `recovered-results.json` に全 run の `tester_available=true` と主要 metrics を入れ、smoke が成功することを確認する。

### REFACTOR

- gate 判定を小さな純関数に分離できる場合のみ分離する。過剰な抽象化は避ける。

## リスク・注意点

- 既存の smoke fixture が「CLI が成功すれば成功」としている場合、テスト fixture の artifact 生成を追加する必要がある。
- 一部キャンペーンで fallback metrics を許容している場合でも、smoke では許容しない方針にする。これは今回の事故再発防止を優先するため。
- runtime error の画面文言自体は artifact に残らない可能性があるため、まずは metrics 欠損を失敗扱いすることで確実に検知する。
- active plan は `repo-structure-align-and-archive-rules_20260424_2015.md` と `run-night-batch_20260429_2344.md` のみで、今回の smoke gate 強化とは直接競合しない。

## 成功基準

- smoke phase で compile/apply 成功でも metrics が読めなければ workflow が失敗する。
- smoke phase の失敗理由に、どの preset / symbol が metrics 欠損だったかが出る。
- 既存テストまたは追加テストで、metrics 欠損の smoke 失敗と metrics ありの smoke 成功が検証されている。
- 変更が main にコミット・プッシュされている。
