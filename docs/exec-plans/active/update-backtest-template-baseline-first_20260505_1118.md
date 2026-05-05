# Update backtest template to baseline-first evaluation plan

## Goal

`docs/research/TEMPLATE.md` を、composite score 中心ではなく baseline との比較を中心にしたバックテスト結果まとめテンプレートへ更新する。あわせて `backtest-results-capture` スキルの手順も新テンプレートに合わせ、今回の意図と変更内容を session log に残す。

## Scope

### 変更するファイル
- `docs/research/TEMPLATE.md`
- `.agents/skills/backtest-results-capture/SKILL.md`
- `docs/exec-plans/active/update-backtest-template-baseline-first_20260505_1118.md`
  - 実装完了時に `docs/exec-plans/completed/` へ移動する。

### 作成するファイル
- `docs/sessions/session_20260505_1118.md`

### 削除するファイル
- なし

## Implementation

- `docs/research/TEMPLATE.md` の評価軸を以下へ変更する。
  - composite score を標準評価軸から外す。
  - baseline 戦略の結果を判断基準直下に置く。
  - 各戦略は baseline への追随率、PF、DD対利益比率、勝率で比較する。
  - `avg_max_drawdown` 固定値基準を廃止し、`avg_max_drawdown / avg_net_profit` の比率評価に変更する。
  - win rate 閾値を `>=40%` 優秀、`35〜40%` 許容、`30〜35%` 要注意、`<30%` 即除外へ調整する。
  - 銘柄集中チェックセクションを削除する。
  - Top 3 の「他と比べて強かった点」を baseline 比較に変更する。
  - 除外候補を baseline に対して弱すぎる戦略、利益追随率不足、DD対利益比率過大、PF不足で判断する形へ変更する。
  - 改善点・次回確認事項は、次のAIへの記入指示と振り返り・今後方針の構造にする。
- `.agents/skills/backtest-results-capture/SKILL.md` の手順を以下へ変更する。
  - composite score 計算を必須手順から外し、baseline-first の主要指標を計算する手順へ変更する。
  - 集中度チェック必須の記述を削除する。
  - TEMPLATE の主要セクション一覧を新構造に更新する。
  - Anti-Patterns を新評価軸に合わせて更新する。
- `docs/sessions/session_20260505_1118.md` に、今回の意思決定、変更理由、今後のバックテスト結果まとめ方を記録する。

## Impact

- 今後のバックテスト結果まとめの読み方が、composite score ではなく baseline 追随と risk/reward 比較に変わる。
- 既存の過去レポート本文は変更しない。
- 戦略コード、バックテスト実行コード、GitHub Actions workflow には影響しない。

## Out of Scope

- `docs/research/night-batch-self-hosted-run94_20260505.md` の再生成はしない。
- 既存レポートの一括書き換えはしない。
- 新しいバックテスト実行はしない。

## Tasks

- [ ] `docs/research/TEMPLATE.md` を baseline-first 構造へ更新する。
- [ ] `backtest-results-capture` スキルの runbook を新テンプレートに合わせて更新する。
- [ ] `docs/sessions/session_20260505_1118.md` を作成する。
- [ ] 変更内容をレビューし、composite score 前提や銘柄集中必須の記述が残っていないか確認する。
- [ ] 計画ファイルを completed へ移動する。
- [ ] docs / skill 変更をコミットし、main にプッシュする。

## Verification

- `rg "composite|Composite|集中|銘柄集中" docs/research/TEMPLATE.md .agents/skills/backtest-results-capture/SKILL.md` で意図しない旧基準が残っていないことを確認する。
- `rg "例:|preset-id|ここに書く" docs/research/TEMPLATE.md` でサンプル記述が残りすぎていないことを確認する。
- `git diff --stat` と `git status --short` で意図したファイルのみが変更されていることを確認する。

## Risks

- 過去レポートは composite 前提で書かれているため、新テンプレート以降のレポートと評価軸が変わる。session log に明記して混同を避ける。
- baseline が存在しない campaign の場合は、テンプレート上で「baselineなし」と明記し、比較対象をユーザー指定または最も近い control 戦略にする必要がある。
