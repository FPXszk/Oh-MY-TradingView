# Exec-plan: local-smoke-fix-run84-fail46_20260502_1300

作成日時: 2026-05-02 13:00 JST

## 目的

`Night Batch Self Hosted #84` (`run_id=25216630873`, `2026-05-01 22:45 JST`) の smoke で failure 扱いになった 46 preset を、workflow ではなくローカルで先に再現確認する。local smoke で落ちる原因を修正し、手元で smoke が通ったことを確認してから failed-only workflow を再dispatch する。

## 事実確認

- `#84` の smoke summary は `success=4`, `failure=46`, `unreadable=0`, `total=50`
- 46 failure は `apply_failed=true` / `tester_reason="Skipped: strategy not applied"` で記録されている
- 少なくとも 1 つの失敗 preset (`emr-next-vol20x05`) は `compile_detail.study_added=true` まで進んでおり、compile error ではなく apply/verify 段の failure
- 成功 preset (`emr-breakout-winrate-stopout-entry-confirm-volume20x10`) と失敗 preset の Pine 冒頭構造は近く、原因が generated Pine 群全体か `src/core/backtest.js` の attach verification かは local smoke で切り分けが必要
- 直前 rerun `25243158644` は workflow 確認先行になっているため、以後は local smoke 根拠を先に取る

## 変更・作成対象ファイル

- 作成: `docs/exec-plans/active/local-smoke-fix-run84-fail46_20260502_1300.md`
- 変更予定: `docs/sessions/run84-failed-strategies-rerun_20260502.md`
- 変更候補: `src/core/backtest.js`
- 変更候補: `scripts/generate-emr-next-50pack.py`
- 変更候補: `docs/references/pine/emr-next-50pack-us40/*.pine`
- 変更候補: `config/backtest/strategy-catalog.json`
- 変更候補: `config/backtest/strategy-presets.json`
- 変更候補: `config/backtest/campaigns/emr-next-50pack-run84-failed-us40-pack.json`
- 変更候補: `config/night_batch/emr-next-50pack-run84-failed-us40-config.json`
- 変更候補: `tests/backtest.test.js`
- 変更候補: `tests/campaign.test.js`
- 変更候補: `tests/windows-run-night-batch-self-hosted.test.js`

## 実装内容と影響範囲

- failed-only campaign (`emr-next-50pack-run84-failed-us40-pack`) をローカル smoke 実行し、`artifacts/campaigns/.../smoke/recovered-summary.json` を正本として success / failure を確認する
- 失敗原因が apply/verify ロジックなら `src/core/backtest.js` を最小修正し、generated Pine 側なら generator を優先して修正し、必要な生成物だけ更新する
- 修正後に local smoke を再実行して、少なくとも「workflow に流す前提の smoke fail が解消した」と言える状態まで持っていく
- その後で failed-only config を指定して workflow を dispatch し、run ID を確認する
- 影響範囲は local smoke 実行結果、backtest apply/verify ロジックまたは generated Pine 群、関連テスト、session 記録、rerun workflow

## 実装ステップ

- [ ] in-progress の workflow rerun が残っていれば停止状態を確認する
- [ ] `node scripts/backtest/run-finetune-bundle.mjs --phases smoke --us-campaign emr-next-50pack-run84-failed-us40-pack` をローカルで実行し、46 preset の fresh smoke summary を取得する
- [ ] local smoke の失敗内訳を読み、原因が共通か複数系統かを切り分ける
- [ ] root cause に応じて `src/core/backtest.js` または generator / Pine 生成物を最小修正する
- [ ] 必要なテストを追加・更新し、対象テストを green にする
- [ ] local smoke を再実行し、failed preset が解消したかを artifact で確認する
- [ ] session log に local smoke の結果と修正内容を記録する
- [ ] 計画完了後、計画を `completed/` へ移動して commit / push する
- [ ] failed-only config で workflow を dispatch し、新 run ID / 起動状態を確認する

## テスト戦略

- RED: local smoke で fresh failure を再現し、必要なら `tests/backtest.test.js` に apply/verify failure の再現ケースを追加する
- GREEN: root cause を最小修正してテストを通し、local smoke summary の failure 件数を下げる
- REFACTOR: 文言や generator 出力を整理するが、run84 failed-only campaign の対象 46 preset 自体は変えない

## 検証コマンド

- `node --test tests/backtest.test.js`
- `node --test tests/campaign.test.js`
- `node --test tests/windows-run-night-batch-self-hosted.test.js`
- `node scripts/backtest/run-finetune-bundle.mjs --phases smoke --us-campaign emr-next-50pack-run84-failed-us40-pack`
- `gh workflow run night-batch-self-hosted.yml --field config_path=config/night_batch/emr-next-50pack-run84-failed-us40-config.json`

## リスクと注意点

- local smoke は実機 TradingView / CDP 状態に依存するため、workflow と同じ 9223 経路で再現しないと比較が崩れる
- apply/verify failure が環境依存なら、Pine を直しても解消しない可能性がある
- generator を触る場合は 46 本全体に波及するため、最小修正と fresh smoke 再確認が必須
- 既存の未関連差分 `docs/exec-plans/active/emr-next-50pack-registration-and-run_20260501_2209.md` 削除と `artifacts/night-batch/` 未追跡は今回のコミットに含めない

## スコープ外

- emr-next 50pack 全体の ranking / research レポート更新
- failed-only campaign 以外の workflow rerun
- self-hosted runner OS 設定の恒久改善
