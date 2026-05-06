# MA + BB Overlay Indicator 計画

作成日時: 2026-05-07 00:46 JST

## 目的

TradingView 上でストラテジー本体とは別に使える、線表示専用の Pine インジケーターを 1 本追加する。  
今回の対象は、価格チャート上に以下を一括表示する overlay indicator。

1. 移動平均線 `5 / 25 / 50 / 100 / 200`
2. ボリンジャーバンド `14` 期間

## 変更・作成・確認対象ファイル

### 新規作成

- `docs/references/pine/custom-indicators/ma-bb-overlay-5-25-50-100-200-bb14.pine`
- `docs/exec-plans/active/ma-bb-overlay-indicator_20260507_0046.md`

### 確認のみ

- `README.md`
- `docs/exec-plans/completed/` 配下の Pine / My Scripts 関連計画

### 運用ファイル

- 完了時に `docs/exec-plans/active/ma-bb-overlay-indicator_20260507_0046.md` を `docs/exec-plans/completed/` へ移動

## 実装内容と影響範囲

- `strategy(...)` ではなく `indicator(..., overlay=true)` を使う
- 売買条件、エントリー、エグジット、アラート条件は持たせない
- Pine 1 本で MA 5 本と BB 14 を同時表示する
- 表示を重くしすぎないよう、必要最小限の input と plot のみで構成する
- 既存戦略コードや既存 CLI には手を入れない

## 実装ステップ

- [ ] 既存 repo の Pine 配置方針と命名に合わせて保存先を確定する
- [ ] MA 5/25/50/100/200 と BB14 を表示する overlay indicator を新規作成する
- [ ] 静的解析または repo 既存 CLI で Pine の妥当性を確認する
- [ ] レビュー観点で、過剰機能がないこととコピペ登録しやすいことを確認する
- [ ] 完了後、plan を `completed/` に移し、変更を Conventional Commit で commit / push する

## テスト戦略

- `tv pine analyze --file <pine-file>` もしくは同等の repo 既存確認導線を使う
- 実機の TradingView 反映までは今回の最小スコープに含めないが、TradingView へそのまま貼れる構文であることを確認する

## リスクと注意点

- Pine の文法は軽量でも、TradingView 側 UI への実登録は別ステップになる
- ボリンジャーバンドの標準偏差倍率は一般的な `2.0` を仮定する
- 「最強戦略で使っている内部線を完全再現する」ことは今回のスコープ外で、今回は明示要望の MA 群と BB14 の可視化に限定する

## 成功基準

- 1 本の Pine インジケーターで MA 5/25/50/100/200 と BB14 が同時表示できる
- `indicator(..., overlay=true)` ベースで、ストラテジーではなく補助表示として使える
- ユーザーが TradingView の Pine Editor に貼り付けて保存できる形になっている

## スコープ外

- MACD / RSI の別パネル追加
- 既存「最強戦略」の売買ロジック抽出
- My Scripts への自動登録実行
