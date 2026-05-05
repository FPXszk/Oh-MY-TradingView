# Update run94 profit-filter and baseline comparison notes plan

## Goal

`docs/research/night-batch-self-hosted-run94_20260505.md` に、avg_net_profit 18,000 ドル超の戦略だけを残した再ランキング表と、134位の baseline が raw profit では強く見える理由・現行 composite で低順位になる理由を追記する。

## Scope

### 変更するファイル
- `docs/research/night-batch-self-hosted-run94_20260505.md`
- `docs/exec-plans/active/update-run94-profit-filter-baseline-notes_20260505_1101.md`
  - 実装完了時に `docs/exec-plans/completed/` へ移動する。

### 作成するファイル
- なし

### 削除するファイル
- なし

## Implementation

- run94 artifact の `strategy-ranking.json` / `recovered-results.json` を再利用して、avg_net_profit > 18,000 の戦略を抽出する。
- 抽出後の戦略だけで、現行と同じ composite score を再計算する。
  - `rank(avg_net_profit desc) + rank(avg_profit_factor desc) + rank(avg_max_drawdown asc)`
- レポート末尾に以下を追記する。
  - 「avg_net_profit 18,000 超フィルタ後ランキング」表
  - baseline と上位フィルタ通過戦略の見方
  - 上位戦略が baseline と何を変えて試したものかの言語化
- baseline が raw profit / win_rate では強いが、composite で低順位になる理由を数値で説明する。
  - 主な観点: avg_max_drawdown、銘柄集中、entry を絞った派生戦略の目的、raw profit 優先時の別ランキング解釈

## Impact

- ドキュメント追記のみ。
- バックテスト実行コード、戦略コード、workflow、manifest には影響しない。

## Out of Scope

- composite score の定義変更はしない。
- campaign / strategy / Pine の変更はしない。
- 新しいバックテスト実行はしない。

## Tasks

- [ ] run94 artifact から avg_net_profit 18,000 超の戦略を抽出する。
- [ ] フィルタ後 ranking と baseline 比較に必要な値を計算する。
- [ ] `docs/research/night-batch-self-hosted-run94_20260505.md` の末尾に表と説明を追記する。
- [ ] baseline が強く見える理由と、現行 composite で低順位になる理由を明記する。
- [ ] 追記内容をレビューする。
- [ ] 計画ファイルを completed へ移動する。
- [ ] docs 変更をコミットし、main にプッシュする。

## Verification

- 追記表が avg_net_profit 18,000 超のみで構成されていることを確認する。
- baseline がフィルタ後表に含まれていることを確認する。
- `docs/research/night-batch-self-hosted-run94_20260505.md` にテンプレート未置換文字列が残っていないことを確認する。
- `git diff --stat` と `git status --short` で意図した docs 変更だけになっていることを確認する。
