# Update backtest template to baseline-first evaluation plan

## Goal

`docs/research/TEMPLATE.md` の「Baseline 結果（比較の大前提）」を、run 94 の `ema-macd-rsi-sl-baseline`（composite 134位）を使った実データ例で埋める。あわせて `.agents/skills/backtest-results-capture/SKILL.md` の Step 5〜7 と Anti-Patterns を、固定の composite 手順ではなく **現在の `docs/research/TEMPLATE.md` に従って必要スコアと比較欄を埋める** 方針へ更新する。

## Scope

### 変更するファイル
- `docs/research/TEMPLATE.md`
- `.agents/skills/backtest-results-capture/SKILL.md`
- `docs/exec-plans/active/update-backtest-template-baseline-first_20260505_1118.md`
  - 実装完了時に `docs/exec-plans/completed/` へ移動する。

### 作成するファイル
- なし

### 削除するファイル
- なし

## Implementation

- `docs/research/TEMPLATE.md` の baseline セクションを、run 94 の baseline/control 戦略 `ema-macd-rsi-sl-baseline` を使った実例へ更新する。
  - 集計行は run 94 レポートで確認済みの `avg_net_profit 534,109.93 / avg_profit_factor 1.905 / avg_max_drawdown 184,211.31 / avg_win_rate 36.99% / rank 134` を基準にする。
  - 銘柄別行は run 94 の対応 artifact（`recovered-results.json`）から 8 銘柄ぶんの `net_profit / profit_factor / max_drawdown / dd_to_profit / win_rate / trades` を取得して埋める。
  - 「Baseline の読み方」は、raw profit の強さ、DD 対利益比率、派生戦略が最低限比較すべきラインを run 94 baseline に即した文面へ差し替える。
- `.agents/skills/backtest-results-capture/SKILL.md` を以下の方針に寄せる。
  - Step 5 と Step 6 は、固定の composite score 計算手順ではなく、`docs/research/TEMPLATE.md` に従って baseline 集計・銘柄別指標・各比較欄のスコアを埋める説明へ変更する。
  - Step 7 は「主要セクション一覧」を固定列挙せず、`docs/research/TEMPLATE.md` の見出し・表・記入指示に従って出力ファイルを作る説明へ変更する。
  - Anti-Patterns は現テンプレートに合わせ、先頭の「PF ランクだけで最優秀判断」、下から 2 番目の「artifact の rank と composite_score の混同」、最下段の「集中リスク未確認で結論」を削除する。
  - `result.metrics` 利用、manifest 更新、win_rate 単独での除外回避など、今も有効な注意点だけ残す。

## Impact

- 今後のテンプレート利用者は、baseline セクションの埋め方を run 94 実例で確認できる。
- `backtest-results-capture` スキルは、テンプレート依存の書式変更に追随しやすい説明へ変わる。
- 既存の過去レポート本文、戦略コード、Night Batch 実行フローには影響しない。

## Out of Scope

- `docs/research/night-batch-self-hosted-run94_20260505.md` 本文の再生成・書き換え
- 既存レポートの一括更新
- 新規バックテスト実行や artifact 再生成
- テンプレートの baseline 以外のセクション構造変更

## Test Strategy

- RED/GREEN の新規テスト追加は行わない。ドキュメント更新とスキル文面更新のため、既存の skill conformance テストと内容確認で検証する。
- `tests/agent-skills-conformance.test.js` が通ることを確認し、スキル frontmatter と必須見出しを壊していないことを担保する。

## Validation Commands

- `node --test tests/agent-skills-conformance.test.js`
- `rg "composite_score|PF ランクだけ|artifact の `rank`|集中リスク" .agents/skills/backtest-results-capture/SKILL.md docs/research/TEMPLATE.md`
- `git --no-pager diff --stat`
- `git --no-pager status --short`

## Risks

- run 94 の baseline 銘柄別数値はレポート本文ではなく artifact 側が source of truth なので、`recovered-results.json` の取得元を取り違えるとテンプレート例がずれる。
- テンプレートに具体値を入れすぎると「例」ではなく固定仕様と誤読される恐れがあるため、実例であることが分かる書き方に留める。
- `SKILL.md` をテンプレート依存に寄せすぎると手順の抽象度が下がるため、テンプレート参照と必要データ抽出の境界を明記する。

## Tasks

- [ ] run 94 baseline/control の artifact ソースを特定し、`ema-macd-rsi-sl-baseline` の 8 銘柄 metrics を抽出する。
- [ ] `docs/research/TEMPLATE.md` の baseline セクションを run 94 実例で更新する。
- [ ] `.agents/skills/backtest-results-capture/SKILL.md` の Step 5〜7 と Anti-Patterns を現テンプレート準拠に更新する。
- [ ] 変更内容をレビューし、テンプレート依存にしたい箇所だけを更新できているか確認する。
- [ ] 計画ファイルを `docs/exec-plans/completed/` へ移動する。
