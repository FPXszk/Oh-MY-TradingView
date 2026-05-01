# compile-run79-80-81-research-doc_20260501_1738

## 目的
Night Batch GHA runs #79, #80, #81 の結果を統合し、`docs/research/night-batch-self-hosted-run79_20260501.md` を全50戦略の最終評価ドキュメントとして更新する。

## 背景
- **Run #79** (20260430): `ema-breakout-winrate-stopout-us40-50pack` → 15/50戦略に有効データ。35戦略が `stop_loss.type` バリデーションエラーで失敗。
- **Run #80** (20260501): 失敗35戦略の再実行 → GHA ランナーがプロセス中断で失敗。データ不完全。
- **Run #81** (20260501): 同キャンペーンを再実行 → SUCCESS。35戦略中26戦略に有効データ、9戦略は依然n/a (exit/hybrid群)。
- 統合結果: **40戦略に有効データ**、10戦略は n/a (exit/hybrid群)。

## 変更ファイル
- **更新**: `docs/research/night-batch-self-hosted-run79_20260501.md` — 全内容を統合結果で上書き

## 実装ステップ
- [ ] 統合結果の最終データ確認（averages計算済み）
- [ ] `docs/research/night-batch-self-hosted-run79_20260501.md` を全50戦略の最終結果で上書き
- [ ] ファイル内容をレビュー（ロジック・フォーマット確認）
- [ ] 完了後、計画を `docs/exec-plans/completed/` に移動してコミット

## 最終データサマリー
### US平均 (40戦略)
- avg_net_profit: 4,936.68
- avg_profit_factor: 2.1199
- avg_max_drawdown: 3,582.72
- avg_win_rate: 14.48%

### 総合首位 (rank 1)
`emr-breakout-winrate-stopout-entry-confirm-volume20x10`
- composite_score: 37 | np: 3,436.86 | pf: 2.7229 | dd: 2,032.45 | wr: 8.64%
- 銘柄集中: MSTR 47.8% → 許容（30〜50%）

### 除外候補
- 即除外: pf < 1.5 の戦略 (stop-atr20-grace5など) + DD > 7000 (stop-swinglow-atr05, reentry-atr15-plus-breakout-high)
- n/a戦略10本: exit/hybrid群 (validation errorで評価不可)
