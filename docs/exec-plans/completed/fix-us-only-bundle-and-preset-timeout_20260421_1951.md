# US-only bundle / preset timeout 修正計画

作成日時: 2026-04-21 19:51 JST

## 目的

以下の 3 点を修正・整理する。

1. `bundle-foreground-reuse-config.json` が US-only でも、実行時に JP campaign が暗黙混入する不具合を止める  
2. `public-top10-us-40x10` のような長時間 campaign で、1 本の preset 実行ハングが workflow 全体を長時間 `in_progress` のまま固める問題を止める  
3. stale 化した run `24710297901` を停止済みであることを確認し、修正版で再実行できる状態まで整理する

## 現時点の確認結果

- run `24710297901` は cancel を送信済み
- `checkpoint-365` は 400 runs 中の進捗を意味し、少なくともそこまでは進行していた
- `scripts/backtest/run-long-campaign.mjs` の `runPresetCli()` は `execFile()` に timeout がなく、1 run ハングで campaign 全体が止まりうる
- `scripts/backtest/run-finetune-bundle.mjs` は `--jp-campaign` に `next-long-run-jp-finetune-100x10` をデフォルト設定しており、US-only config でも JP が暗黙混入する
- 既存テストには
  - `tests/night-batch.test.js` に「US-only config で JP を混ぜない」意図のテストがある
  - `tests/windows-run-night-batch-self-hosted.test.js` に config shape のテストがある
- 実機 dry-run では、US-only 指定でも `run-finetune-bundle.mjs` が `Running next-long-run-jp-finetune-100x10` を出力したため、不具合を再現できている

## 変更・確認対象ファイル

### 変更予定

- `scripts/backtest/run-finetune-bundle.mjs`
- `scripts/backtest/run-long-campaign.mjs`
- `src/core/campaign.js`
- `tests/night-batch.test.js`
- `tests/campaign.test.js`
- 必要なら `tests/windows-run-night-batch-self-hosted.test.js`
- 必要なら `config/backtest/campaigns/current/public-top10-us-40x10.json`
- 必要なら `docs/reports/night-batch-self-hosted-run18.md`

### 確認対象

- `python/night_batch.py`
- `config/night_batch/bundle-foreground-reuse-config.json`
- `.github/workflows/night-batch-self-hosted.yml`

## 実装内容と影響範囲

- `run-finetune-bundle.mjs`
  - `--us-campaign` / `--jp-campaign` の既定値を見直す
  - 値を明示的に渡した市場だけ queue に入るようにする
  - US-only config では JP campaign を一切起動しないことを保証する
- `run-long-campaign.mjs`
  - 各 preset 実行に timeout を導入する
  - timeout 時は失敗結果として返し、checkpoint / failure budget / rerun 制御に乗せる
  - 1 run のハングで workflow 全体が 8 時間張り付く構造を解消する
- config / validation
  - 必要なら execution に `per_run_timeout_ms` または同等フィールドを追加する
  - validation と既存 campaign 互換を確認する
- 運用
  - run `24710297901` が cancel 完了したことを確認する
  - 修正版を再実行する前提条件を整理する

## 実装ステップ

- [ ] RED: `tests/night-batch.test.js` に、US-only bundle 実行で JP campaign が暗黙追加されない failing test を追加または既存テストを failure 再現付きで補強する
- [ ] RED: `tests/campaign.test.js` に、preset 実行 timeout が failure として扱われ checkpoint / summary に反映される failing test を追加する
- [ ] GREEN: `scripts/backtest/run-finetune-bundle.mjs` を修正し、未指定市場を暗黙追加しないようにする
- [ ] GREEN: `scripts/backtest/run-long-campaign.mjs` に per-run timeout を追加し、timeout 結果を既存 result 形へ載せる
- [ ] GREEN: 必要なら `src/core/campaign.js` の validation と campaign config を更新する
- [ ] REFACTOR: timeout error message / result payload / stderr 表現を整理し、運用時に hang と通常 failure を見分けやすくする
- [ ] 検証: 対象テストを実行して green を確認する
- [ ] REVIEW: US-only bundle, rerun, failure budget, checkpoint 保存の整合を見直す
- [ ] run `24710297901` の cancel 状態を確認し、必要なら run 18 を stale として記録する
- [ ] 再実行用の最小手順を整理してユーザーへ報告する

## テスト戦略

- RED
  - US-only bundle config でも JP default が混ざる現行不具合を failing test で固定する
  - run-long-campaign 内の 1 run ハングを timeout failure に落とす期待を failing test で固定する
- GREEN
  - 最小差分で実装修正し、既存の bundle / campaign 挙動を壊さずに通す
- REFACTOR
  - timeout error と blocked preset の可観測性を整理する

## 検証コマンド候補

- `node --test tests/night-batch.test.js`
- `node --test tests/campaign.test.js`
- `node scripts/backtest/run-finetune-bundle.mjs --host 127.0.0.1 --ports 9223 --phases smoke --us-campaign public-top10-us-40x10 --dry-run`
- `gh run view 24710297901`

## リスクと注意点

- timeout を短くしすぎると正常に遅い public strategy まで false failure 化する
- timeout を追加すると failure budget 消費の速度が変わるため、`max_consecutive_failures` との相互作用を確認する必要がある
- `python/night_batch.py` と `run-finetune-bundle.mjs` の両方に既定値があるため、片側だけ直しても再発する可能性がある
- run cancel は GitHub 上で反映に時間差がある可能性がある

## スコープ外

- 今回は新しい strategy や universe の追加は行わない
- theme momentum 3-pack の実装継続は含めない
- 自動再実行 workflow の追加は行わない
