# run71 checkpoint-1730 テンプレート追記計画

作成日時: 2026-04-28 10:35 JST

## 目的

`checkpoint-1730.json` に残っている partial 成果物を使い、`docs/research/night-batch-self-hosted-run71_20260428.md` を `docs/research/TEMPLATE.md` 準拠で更新する。  
run71 は full 完走前に停止しているため、**checkpoint-1730 時点の暫定結果**であることを明示しつつ、前回 run70 で見たかった比較ポイントに対する途中結論を記録する。  
更新後はレビューし、commit / push する。

## 前提・確認事項

- 正本データは `C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView\artifacts\campaigns\strongest-plus-recovery-reversal-us40-50pack\full\checkpoint-1730.json` を WSL から参照したものを使う
- checkpoint には `effective_results` 1730 件が含まれ、43 戦略は 40/40 完走、1 戦略だけ 10/40 の partial 状態
- `strategy-ranking.json` / `recovered-summary.json` は full 完走前停止のため未生成でも、既存集計ロジックで partial ranking を再構築できる
- `TEMPLATE.md` は完全 run を前提にしているため、未完データは「暫定」「partial」「43戦略完走 + 1戦略途中」を明示する
- `docs/exec-plans/active/` に別 active plan はあるが、対象ファイルは重ならない前提で進める

## 変更・作成・移動するファイル

### 作成

- `docs/exec-plans/active/run71-checkpoint1730-template-summary_20260428_1035.md`

### 更新

- `docs/research/night-batch-self-hosted-run71_20260428.md`

### 完了時に移動

- `docs/exec-plans/active/run71-checkpoint1730-template-summary_20260428_1035.md`
- 移動先: `docs/exec-plans/completed/run71-checkpoint1730-template-summary_20260428_1035.md`

## 実装内容と影響範囲

- `checkpoint-1730.json` の `effective_results` を既存 campaign 集計ロジックに流し、partial ranking を再構築する
- `TEMPLATE.md` の各セクションを、checkpoint-1730 時点の事実で埋める
- 少なくとも以下を更新する
  - ヘッダー / 結論
  - 市場別平均
  - 全戦略スコア一覧
  - Top 3 戦略
  - 除外候補
  - 銘柄集中チェック
  - 改善点と次回確認事項
- 前回 run70 で見たかったポイント
  - SMA20 / SMA25 parity
  - recovery overlay の純増効果
  - DD suppression
  - RSI2x10 / confirm slicing
  に対して、checkpoint-1730 時点で何が言えるかを数値付きで反映する

## スコープ

### 含む

- checkpoint-1730 ベースの partial summary
- run71 research doc の `TEMPLATE.md` 準拠更新
- 暫定 Top / baseline 比較 / 観測できた比較ポイントの記録
- review / commit / push

### 含まない

- 新しい backtest 再実行
- workflow や strategy 実装の追加修正
- manifest や scoreboard の追加更新
- 未完 1 戦略を無理に補完した ranking の捏造

## TDD / テスト戦略

- 主作業は research doc 更新のためコード変更は行わない前提
- 数値抽出は既存集計ロジックをそのまま使い、手計算との差分だけを spot check する
- もし補助スクリプト修正が必要になった場合のみ RED -> GREEN -> REFACTOR で進める

## 検証コマンド候補

- `node --input-type=module ... summarizeMarketCampaign ... checkpoint-1730.json`
- `git diff -- docs/research/night-batch-self-hosted-run71_20260428.md`
- `git status --short`

## リスク / 注意点

- 44 戦略しか ranking に入らず、そのうち 1 戦略は 10/40 しか終わっていないため、厳密には full 50pack の最終結論ではない
- `TEMPLATE.md` の「市場別平均」は 44 戦略ベースになり、full 50 戦略平均との差ではない
- 既存文書の「取得不可」記述を partial ranking へ差し替えるため、run 未完である事実を弱めないように書き方を調整する必要がある
- 未完 1 戦略を Top / Bottom 判定へ混ぜると誤解を生むため、必要なら比較対象から除外して注記する

## 実装ステップ

- [ ] checkpoint-1730 の集計値と run_count 内訳を確定する
- [ ] Top / baseline / 弱い群 / partial 1 戦略の扱いを整理する
- [ ] `docs/research/night-batch-self-hosted-run71_20260428.md` を `TEMPLATE.md` 準拠で暫定結果へ更新する
- [ ] 未完であること、43戦略完走 + 1戦略途中であることを文書中に明示する
- [ ] 数値と narrative の整合性をレビューする
- [ ] plan を `docs/exec-plans/completed/` に移動する
- [ ] Conventional Commit で commit し、`main` に push する

## 完了条件

- run71 文書が checkpoint-1730 ベースの暫定結果で埋まっている
- 前回見たかった比較ポイントに対する途中結論が数値付きで読める
- 未完データであることが明示されている
- plan が completed に移動し、差分が push されている
