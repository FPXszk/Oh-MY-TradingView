# run72 Top3 全銘柄成績追記計画

作成日時: 2026-04-29 11:58 JST

## 目的

`docs/research/TEMPLATE.md` の更新内容に合わせて、`docs/research/night-batch-self-hosted-run72_20260429.md` の Top 3 戦略セクションへ `全銘柄の成績` 表を追記する。  
今回は Top 3 セクションのテンプレート差分として解釈し、1位・2位・3位の各 preset について `recovered-results.json` から銘柄別成績を追加する。

## 事前確認

- 変更対象文書: `docs/research/night-batch-self-hosted-run72_20260429.md`
- 参照テンプレート: `docs/research/TEMPLATE.md`
- 元データ: `/tmp/night-batch-25059045892/campaigns/deep-pullback-plus-recovery-us40-50pack/full/recovered-results.json`
- Top 3 preset:
  1. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma15-rsi60`
  2. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix24-rsi40-vixpeak-sma20-rsi60`
  3. `donchian-60-20-rsp-rsi14-regime60-tp25-27-plus-recovery-vix28-rsi40-vixpeak-sma20-rsi60`

## 変更・作成・移動するファイル

### 作成

- `docs/exec-plans/active/update-run72-top3-symbol-tables_20260429_1158.md`

### 変更

- `docs/research/night-batch-self-hosted-run72_20260429.md`

### 完了時に移動

- `docs/exec-plans/active/update-run72-top3-symbol-tables_20260429_1158.md`
- 移動先: `docs/exec-plans/completed/update-run72-top3-symbol-tables_20260429_1158.md`

## 実装内容と影響範囲

- `recovered-results.json` から Top 3 各 preset の 40 銘柄ぶんの raw metrics を集計する
- 各 Top 3 セクションへ `全銘柄の成績` 表を追加する
- 表はテンプレート指示どおり `net_profit` 降順で並べる
- 列は `銘柄 / net_profit / profit_factor / max_drawdown / win_rate / trades` を使用する
- 既存の結論、平均との差コメント、集中度、除外候補は変更しない

## スコープ

### 含む

- Top 3 への銘柄別成績表の追記
- 数値整合の spot check
- plan 完了処理、commit、push

### 含まない

- Top 3 以外の戦略への同表追加
- `TEMPLATE.md` 自体の再編集
- run72 以外の研究メモ修正

## テスト戦略

- 文書更新のため自動テストは追加しない
- `recovered-results.json` から抽出した 3 preset の銘柄別値を spot check する
- `git diff -- docs/research/night-batch-self-hosted-run72_20260429.md`

## 検証コマンド候補

- `node --input-type=module -e '...'`
- `git diff -- docs/research/night-batch-self-hosted-run72_20260429.md`
- `git status --short`

## リスク / 注意点

- `recovered-results.json` は 1 行ごとに `result.metrics` を持つため、列の参照先を誤ると 0 埋めになる
- Top 3 はいずれも 40 銘柄なので、表の行数が多く文書差分が大きくなる
- `net_profit` 降順の並び替えを忘れるとテンプレート要件を満たさない

## 実装ステップ

- [ ] Top 3 各 preset の銘柄別 metrics を抽出し、表形式へ整形する
- [ ] `night-batch-self-hosted-run72_20260429.md` の Top 3 セクションへ `全銘柄の成績` 表を追記する
- [ ] 文書差分と数値整合をレビューする
- [ ] plan を `docs/exec-plans/completed/` に移動する
- [ ] Conventional Commit で commit し、`main` に push する

## 完了条件

- run72 文書の Top 3 それぞれに `全銘柄の成績` 表が追加されている
- 表が `net_profit` 降順で並び、各行が `recovered-results.json` と整合している
- plan が completed に移動し、対象差分が `main` に push されている
