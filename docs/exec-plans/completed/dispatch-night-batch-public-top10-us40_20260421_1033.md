# Night Batch workflow dispatch 実行計画

作成日時: 2026-04-21 10:33 JST

## 目的

- `night-batch-self-hosted` workflow を dispatch 実行する
- 既定設定が `public-top10-us-40x10` を向いていることを確認したうえで、ユーザーが試せる状態まで持っていく
- 実行開始まで確認できたら作業を終了する

## 現状整理

- `config/night_batch/bundle-foreground-reuse-config.json` の `bundle.us_campaign` はすでに `public-top10-us-40x10`
- `night-batch-self-hosted.yml` は `workflow_dispatch` の既定 `config_path` に `config/night_batch/bundle-foreground-reuse-config.json` を使う
- 作業ツリーはクリーン

## 変更・削除・作成するファイル

### 作成

- `docs/exec-plans/completed/dispatch-night-batch-public-top10-us40_20260421_1033.md`

### 変更 / 削除

- なし

## 実装内容と影響範囲

- GitHub Actions 上で `night-batch-self-hosted` workflow を手動起動する
- repo ファイルの追加変更は行わない

## テスト・確認

- `config/night_batch/bundle-foreground-reuse-config.json` の参照 campaign を確認
- GitHub workflow dispatch を実行
- 実行 run が生成されたことを確認

## リスクと注意点

- self-hosted runner 側の空き状況や TradingView 実機状態により、run 開始後の成功可否は変動する
- 今回はユーザー指示どおり、最後まで完走確認は行わない

## 実装ステップ

- [ ] 既定 config が `public-top10-us-40x10` を参照していることを確認する
- [ ] GitHub Actions の `night-batch-self-hosted` workflow を dispatch 実行する
- [ ] run が生成されたことを確認する
- [ ] 計画を `docs/exec-plans/completed/` へ移す
