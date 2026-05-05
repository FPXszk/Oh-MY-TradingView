# Night Batch Self Hosted run94 result capture plan

## Goal

Night Batch Self Hosted run 94 の GitHub Actions artifact を取得し、`docs/research/TEMPLATE.md` に従って前回バックテスト結果を要約する。最後に結果をコミットし、リモートへプッシュする。

## Scope

### 作成するファイル
- `docs/research/night-batch-self-hosted-run94_20260505.md`

### 変更するファイル
- `docs/research/manifest.json`
- `docs/exec-plans/active/backtest-results-capture-run94_20260505_1037.md`
  - 実装完了時に `docs/exec-plans/completed/` へ移動する。

### 削除するファイル
- なし

## Implementation

- GitHub Actions の `Night Batch Self Hosted` run 94 を特定する。
- `night-batch-results` artifact をダウンロードして展開する。
- `strategy-ranking.json` と `recovered-results.json` を読み取る。
- `strategy-ranking.json` の rows から composite score を計算する。
  - `rank(net_profit, desc) + rank(profit_factor, desc) + rank(max_drawdown, asc)`
- composite rank-1 戦略の per-symbol breakdown を集計する。
- 上位 4 戦略の symbol 別集中度を確認する。
- `docs/research/TEMPLATE.md` の構造に従ってレポートを作成する。
- `docs/research/manifest.json` の `keep` に新規レポートを追加する。
- レビュー後、計画ファイルを `docs/exec-plans/completed/` に移動し、変更をコミット・プッシュする。

## Impact

- ドキュメント追加と manifest 更新のみ。
- 実行コード、ワークフロー定義、バックテストロジックには影響しない。

## Tasks

- [ ] run 94 の run id と artifact id を確認する。
- [ ] artifact を `/tmp` にダウンロードして展開する。
- [ ] ranking と recovered results の構造を確認する。
- [ ] composite score と per-symbol breakdown を計算する。
- [ ] TEMPLATE 準拠の research document を作成する。
- [ ] manifest を更新する。
- [ ] 内容をレビューし、今回の目的が確認できたか判断する。
- [ ] 計画ファイルを completed へ移動する。
- [ ] docs 変更をコミットし、main にプッシュする。

## Verification

- `docs/research/TEMPLATE.md` の主要セクションが揃っていることを確認する。
- composite score が PF ranking と混同されていないことを確認する。
- rank-1 および上位 4 戦略の集中度が記載されていることを確認する。
- `docs/research/manifest.json` が valid JSON であることを確認する。
- `git status --short` で意図したファイルのみが変更されていることを確認する。
