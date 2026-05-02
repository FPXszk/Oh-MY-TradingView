# Exec-plan: run84-failed-strategies-rerun_20260502_1202

作成日時: 2026-05-02 12:02 JST

## 目的

`Night Batch Self Hosted #84` (`run_id=25216630873`, `2026-05-01 22:45 JST` 開始) で `emr-next-50pack-us40` の smoke に失敗した戦略だけを抽出し、failed-only campaign を作成して night batch 設定へ登録し、GitHub Actions workflow を `workflow_dispatch` で実行する。

## 事実確認

- `#84` の workflow conclusion 自体は **success**
- artifact `night-batch-25216630873-1` を取得して確認した
- 対象 campaign は `emr-next-50pack-us40`
- smoke summary は `success=4`, `failure=46`, `total=50`
- smoke の 46 failure は compile error ではなく、`apply_failed=true` / `tester_reason="Skipped: strategy not applied"` で記録されている
- full summary の `failure=230` は、上記 failed preset 群が 40 symbols へ展開された結果なので、再実行対象は full run 単位ではなく **preset 46本**
- failed preset は artifact の `smoke/recovered-results.json` から一意に抽出できる

## 変更・作成対象ファイル

- 作成: `docs/exec-plans/active/run84-failed-strategies-rerun_20260502_1202.md`
- 作成予定: `config/backtest/campaigns/emr-next-50pack-run84-failed-us40-pack.json`
- 作成予定: `config/night_batch/emr-next-50pack-run84-failed-us40-config.json`
- 変更予定: `tests/campaign.test.js`
- 変更予定: `tests/windows-run-night-batch-self-hosted.test.js`
- 作成予定: `docs/sessions/run84-failed-strategies-rerun_20260502.md`

## 実装内容と影響範囲

- `#84` artifact から failed preset 46本を固定リストとして新 campaign 化する
- smoke は既存運用に合わせて `SPY` 1銘柄、full は `public-top10-us-40` の 40銘柄を維持する
- night batch 専用 config を追加し、既定 config は変更しない
- workflow は新 config を指定して `Night Batch Self Hosted` を手動実行する
- 影響範囲は failed-only campaign 定義、night batch config、関連テスト、session 記録、workflow dispatch

## 実装ステップ

- [ ] `#84` artifact から smoke failed preset 46本を抽出し、固定リストを確認する
- [ ] failed-only campaign JSON を追加し、phase / universe / execution 設定を既存 50pack 運用と整合させる
- [ ] night batch 用 config を追加し、failed-only campaign を参照させる
- [ ] campaign / workflow まわりのテストを更新して新 campaign と config の存在を固定する
- [ ] 対象テストを実行して green を確認する
- [ ] session log を残す
- [ ] `gh workflow run night-batch-self-hosted.yml --field config_path=config/night_batch/emr-next-50pack-run84-failed-us40-config.json` を実行する
- [ ] dispatch 後に run ID と起動状態を確認する

## テスト戦略

- RED: 新 campaign / config を参照する既存テストを追加または更新し、未実装状態で失敗させる
- GREEN: campaign / config を追加してテストを通す
- REFACTOR: campaign 名・説明・テスト文言を最小限で整理し、既存 default config を壊していないことを確認する

## 検証コマンド

- `node --test tests/campaign.test.js`
- `node --test tests/windows-run-night-batch-self-hosted.test.js`
- `gh workflow run night-batch-self-hosted.yml --field config_path=config/night_batch/emr-next-50pack-run84-failed-us40-config.json`
- `gh run list --workflow night-batch-self-hosted.yml --limit 3`

## リスクと注意点

- `#84` は workflow success なので、失敗戦略の定義を workflow failure と取り違えないこと
- failed preset の抽出元を full 230 failure run にすると campaign が重複だらけになるため、smoke 46 preset を正本にする
- `apply_failed=true` は compile error ではなく chart apply 側の問題なので、今回のスコープでは preset 修正ではなく再実行対象の切り出しと dispatch に留める
- 既存の active plan 削除差分や `artifacts/night-batch/` 未追跡は今回のコミットに含めない

## スコープ外

- 46 failed preset 自体の Pine ロジック修正
- `emr-next-50pack-us40` 既定 campaign の差し替え
- `#84` の research レポート新規作成

## 確認した failed preset 件数

- smoke failed presets: 46
- smoke successful presets: 4
- failed-only campaign はこの 46 preset だけを含める
