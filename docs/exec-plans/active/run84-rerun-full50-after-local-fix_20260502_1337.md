# Exec-plan: run84-rerun-full50-after-local-fix_20260502_1337

作成日時: 2026-05-02 13:37 JST

## 目的

`Night Batch Self Hosted #84` 由来の 50 本を、ローカル修正後のコードで改めて full まで再実行する。実行中の failed-only rerun (`run_id=25243768798`) は停止し、`#84` で smoke success だった 4 本と local fix 対象 46 本を合わせた 50 本セットで新規 workflow を dispatch する。

## 事実確認

- 実行中 workflow は `run_id=25243768798`、`status=in_progress`
- `#84` (`run_id=25216630873`) の smoke summary は `4 / 50 success`, `46 / 50 failure`
- `#84` smoke success の 4 preset は以下
  - `emr-breakout-winrate-stopout-entry-confirm-volume20x10`
  - `emr-breakout-winrate-stopout-entry-confirm-volume20x15`
  - `emr-breakout-winrate-stopout-stop-until-breakout-high`
  - `emr-breakout-winrate-stopout-stop-until-plus2pct`
- local fix 後の 46 preset は failed-only pack に収録済み
- 既存 campaign `config/backtest/campaigns/emr-next-50pack-us40.json` の `strategy_ids` は、上記 4 本と 46 本を合わせたちょうど 50 本の集合
- よって最小構成では、新規 campaign / config を増やさず既存 `config/night_batch/emr-next-50pack-us40-config.json` を再利用できる

## 変更・作成対象ファイル

- 作成: `docs/exec-plans/active/run84-rerun-full50-after-local-fix_20260502_1337.md`
- 変更予定: `docs/sessions/run84-failed-strategies-rerun_20260502.md`
- 変更候補: なし（campaign / config / tests は再利用前提）

## 実装内容と影響範囲

- 実行中 failed-only rerun を cancel する
- `#84` success 4 本と repaired 46 本の集合が既存 `emr-next-50pack-us40` と一致することをローカルで再確認する
- session log に「full 50 rerun へ切り替えた理由」と canceled run / new run を記録する
- `config/night_batch/emr-next-50pack-us40-config.json` を使って新規 workflow を dispatch する
- 影響範囲は GitHub Actions run 状態と session 記録のみで、コード・設定ファイル自体は原則変更しない

## 実装ステップ

- [ ] `run_id=25243768798` を cancel し、`canceled` へ遷移したことを確認する
- [ ] `#84` smoke success 4 本と failed-only 46 本の和集合が `emr-next-50pack-us40` と一致することを確認する
- [ ] session log に rerun 方針変更、cancel 済み run、新規 dispatch 対象 config を記録する
- [ ] `config/night_batch/emr-next-50pack-us40-config.json` で workflow を dispatch し、新 run ID / 起動状態を確認する
- [ ] 計画完了後、計画を `completed/` へ移動して commit / push する

## テスト戦略

- RED: なし。今回はコード変更ではなく、対象 50 本集合と run 操作の確認が中心
- GREEN: artifact 上の 4 success と failed-only 46 の集合が既存 50 pack に一致することを確認する
- REFACTOR: なし。設定追加を避け、既存 50 pack / config の再利用を優先する

## 検証コマンド

- `gh run view 25243768798 --json databaseId,status,conclusion,url`
- `node -e "<artifact 4 success + failed46 + campaign50 の集合比較>"`
- `gh workflow run night-batch-self-hosted.yml --field config_path=config/night_batch/emr-next-50pack-us40-config.json`
- `gh run list --workflow night-batch-self-hosted.yml --limit 5`

## リスクと注意点

- 実行中 run を止めるため、failed-only rerun の途中成果は継続利用しない前提になる
- 新規 campaign を作らないので、GitHub 上の run 名だけでは「local-fix 後 rerun」と見分けにくい。識別は session log と run ID で行う
- 既存の未関連差分 `docs/exec-plans/active/emr-next-50pack-registration-and-run_20260501_2209.md` 削除と `artifacts/`, `docs/research/current/` 未追跡は今回のコミットに含めない

## スコープ外

- `emr-next-50pack-us40` の campaign / config 内容変更
- local smoke の追加コード修正
- failed-only pack の追加再検証
