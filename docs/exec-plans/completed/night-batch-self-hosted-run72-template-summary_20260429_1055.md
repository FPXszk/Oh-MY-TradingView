# Night Batch Self Hosted Run72 テンプレート要約・プッシュ計画

作成日時: 2026-04-29 10:55 JST

## 目的

GitHub Actions run `25059045892` の成果物を読み、`docs/research/TEMPLATE.md` に従って前回と同じ粒度の結果まとめを作成する。  
今回は `deep-pullback-plus-recovery-us40-50pack` の full 結果が `2000 / 2000 success` まで揃っているため、partial ではなく正式結果として `docs/research/` に追記し、レビュー後に commit / push する。

## 事前確認

- workflow: `Night Batch Self Hosted`
- run URL: `https://github.com/FPXszk/Oh-MY-TradingView/actions/runs/25059045892`
- artifact 展開先（ローカル調査用）: `/tmp/night-batch-25059045892/`
- 対象 campaign: `deep-pullback-plus-recovery-us40-50pack`
- full summary: `recovered-summary.json` は `success=2000 / total=2000`
- ranking source: `strategy-ranking.json` は `rows` 配列で 50 戦略を保持
- 前回比較の基準文書: `docs/research/night-batch-self-hosted-run71_20260428.md`
- `docs/exec-plans/active/` には `repo-structure-align-and-archive-rules_20260424_2015.md` が残っているため、本件は対象ファイルを限定して進める

## 変更・作成・移動するファイル

### 作成

- `docs/exec-plans/active/night-batch-self-hosted-run72-template-summary_20260429_1055.md`
- `docs/research/night-batch-self-hosted-run72_20260429.md`

### 変更予定なし（調査のみ）

- `docs/research/TEMPLATE.md`
- `/tmp/night-batch-25059045892/campaigns/deep-pullback-plus-recovery-us40-50pack/full/strategy-ranking.json`
- `/tmp/night-batch-25059045892/campaigns/deep-pullback-plus-recovery-us40-50pack/full/recovered-results.json`
- `/tmp/night-batch-25059045892/campaigns/deep-pullback-plus-recovery-us40-50pack/full/recovered-summary.json`
- `docs/research/night-batch-self-hosted-run71_20260428.md`

### 完了時に移動

- `docs/exec-plans/active/night-batch-self-hosted-run72-template-summary_20260429_1055.md`
- 移動先: `docs/exec-plans/completed/night-batch-self-hosted-run72-template-summary_20260429_1055.md`

## 実装内容と影響範囲

- full の `strategy-ranking.json` から 50 戦略の順位表を抽出する
- `recovered-results.json` から Top 3 の銘柄集中度を計算する
- `TEMPLATE.md` の各セクションを今回の事実で埋める
  - ヘッダー
  - 結論
  - 市場別平均
  - 全戦略スコア一覧
  - Top 3
  - 除外候補
  - 銘柄集中チェック
  - 改善点と次回確認事項
- 前回 run71 が partial だった点も踏まえ、今回の正式完走でどう結論が変わったかを短く触れる

## スコープ

### 含む

- run `25059045892` の結果確認
- `TEMPLATE.md` 準拠の run72 summary 作成
- 差分レビュー
- commit / push

### 含まない

- backtest 再実行
- strategy preset / campaign / workflow の変更
- `docs/research/manifest.json` や current 導線の再設計
- 過去 report / archive 文書の整理

## テスト戦略

- 主作業は文書更新なのでコード変更は行わない前提
- 数値抽出は artifact JSON を直接読み、表・平均・集中度の spot check を行う
- 想定検証:
  - `git diff -- docs/research/night-batch-self-hosted-run72_20260429.md`
  - 必要なら集計用の一時コマンドで Top 3 / 平均値 / 集中度を再計算して突合する

## 検証コマンド候補

- `gh run view 25059045892`
- `python3 - <<'PY' ... strategy-ranking.json / recovered-results.json を読む ... PY`
- `git diff -- docs/research/night-batch-self-hosted-run72_20260429.md`
- `git status --short`

## リスク / 注意点

- `strategy-ranking.json` の schema が `rows` であり、run71 までの途中集計コード前提で読むと列を取り違える
- `recovered-results.json` の銘柄別 net profit 合計を使う集中度計算で、負け銘柄を除外すると比率を誤る
- 前回 run71 は partial なので、単純比較の際に「完走条件の違い」を曖昧にしない
- 作業ツリーに別差分が混ざる可能性があるため、commit 対象を本件ファイルだけに限定する

## 実装ステップ

- [x] run `25059045892` の workflow / artifact / campaign 情報を確定する
- [x] full `strategy-ranking.json` と `recovered-summary.json` から順位表と市場別平均の元データを抽出する
- [x] `recovered-results.json` から Top 3 の銘柄集中度を算出する
- [x] `docs/research/night-batch-self-hosted-run72_20260429.md` を `TEMPLATE.md` 準拠で作成する
- [x] 数値・叙述・参照パスの整合性をレビューする
- [x] plan を `docs/exec-plans/completed/` に移動する
- [x] Conventional Commit で commit し、`main` に push する

## 完了条件

- run72 の結果が `TEMPLATE.md` 準拠で `docs/research/` に記録されている
- 50 戦略ランキング、Top 3、除外候補、集中度、次回確認事項が数値付きで読める
- plan が completed に移動し、対象差分のみが push されている
