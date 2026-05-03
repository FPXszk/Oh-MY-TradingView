# Exec-plan: takeprofit-template-doc_20260503_1544

## 目的

`docs/research/TEMPLATE-TP.md` を新規追加し、take profit 戦略専用のバックテスト結果まとめテンプレートを再現性のある形で固定する。  
他の担当者が同じ artifact 群を読み、同じ観点で要約・比較・採用判断を書ける状態を作る。

## 変更対象ファイル

| ファイル | 区分 | 変更内容 | 影響範囲 |
|---|---|---|---|
| `docs/research/TEMPLATE-TP.md` | 新規作成 | take profit 戦略専用テンプレートを追加 | take profit 系 research doc 作成フロー |
| `docs/research/manifest.json` | 更新 | 新規テンプレートを manifest 管理対象へ追加 | research ドキュメント一覧 |

## スコープ

### 実施すること

- `TEMPLATE-TP.md` 冒頭に「takeprofit の戦略専用のまとめテンプレート」であることを明記する
- 入力 artifact と記入手順を固定する
- 以下の比較セクションをテンプレートに含める
  - 全体ランキング
  - `tp1Pct x tp1Qty` のヒートマップ
  - baseline `q0` との差分表
- 差分表の最低必須指標を固定する
  - `delta_avg_trade_pnl`
  - `delta_avg_win_pnl`
  - `delta_avg_loss_pnl`
  - `delta_pf`
  - `delta_dd`
  - `net_tp1_edge`
- take profit の切り分けに有効な推奨指標をテンプレート内コメントで固定する
  - `tp1_hit_rate`
  - `tp1_fail_rate`
  - `avg_trade_pnl`
  - `avg_win_pnl`
  - `avg_loss_pnl`
  - `early_take_cost`
  - `loss_saved_by_partial`
  - `net_tp1_edge`
- 他の担当者が迷わないように、各指標の定義・分母・比較方法・記載ルールを明文化する

### 今回やらないこと

- 指標算出ロジックの実装
- `night_batch.py` や集計コードの改修
- 既存 `docs/research/TEMPLATE.md` の置き換え
- 新テンプレートを使った実データ記入

## 実装方針

- 既存 `docs/research/TEMPLATE.md` の構成を土台にしつつ、take profit 専用の比較観点へ絞る
- 「勝率」ではなく「TP1 が早売りコストより守り効果を持つか」を判定できる構造を優先する
- 定性コメントだけで埋められないよう、各セクションに数値必須ルールを入れる
- baseline 比較は `q0` を固定対照群として扱う前提をテンプレートで明記する

## テスト・検証

- `TEMPLATE-TP.md` を目視確認し、以下がテンプレート内に明記されていることを確認する
  - take profit 戦略専用である旨
  - 入力ファイル
  - 記入手順
  - 全体ランキング / ヒートマップ / baseline差分表
  - 必須差分指標
  - 推奨指標の定義
- `git diff -- docs/research/TEMPLATE-TP.md docs/research/manifest.json` で変更範囲が外科的であることを確認する

## リスク・注意点

- 既存 `TEMPLATE.md` と役割が曖昧に重なると運用がぶれるため、用途境界を明記する
- 指標名だけ並べて定義が弱いと再現性が落ちるため、分母・計算意図まで書く
- 実装ロジック未対応の指標も含むため、「テンプレート上の定義」であることと「算出元 artifact が必要」なことをコメントで明示する

## 競合確認

- `docs/exec-plans/active/` の既存 active plan は repo 構造整理と night batch 実行であり、`docs/research/TEMPLATE-TP.md` 新設とは直接競合しない

## 実装ステップ

- [ ] `docs/research/TEMPLATE.md` の構成を踏まえ、take profit 専用セクション案を確定する
- [ ] `docs/research/TEMPLATE-TP.md` を新規作成し、用途宣言・入力 artifact・記入手順・必須比較セクションを記述する
- [ ] baseline `q0` 差分表と推奨指標の定義コメントを追記する
- [ ] `docs/research/manifest.json` を更新して新規テンプレートを登録する
- [ ] 差分を確認し、用途重複や記載漏れがないことをレビューする
