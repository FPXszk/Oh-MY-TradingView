# スクリーニング処理フロー可視化と Dドメイン追記 実装計画

## ゴール

現在のスクリーニング結果で表示されている `Phase1 セクターランキング` と `Phase2 テーマランキング` が、実際にはどういう処理順で作られているかをテキストベースで説明できるようにする。

今回の完了条件:

1. 現行スクリーニングの実行フローを、実装に即した順序で文章化できる
2. `Phase1` / `Phase2` が「表示上の章名」と「実際のフィルタ段階」でどう対応しているかを明確化できる
3. 追記先ドキュメントの末尾に同じアーキテクチャ説明を追加できる

## 前提と解釈

- 依頼の中心は「今のスクリーニングが何をどういう順でやっているかの可視化」であり、スクリーニング条件そのものの変更ではない
- 説明対象の正本は `src/core/fundamental-screener.js`、`src/core/sector-momentum.js`、`src/core/sector-screening-profiles.js`、`src/core/theme-taxonomy.js`、`scripts/screener/run-fundamental-screening.mjs` とする
- `Phase1 セクターランキング` は broad universe 側のセクター集計と選抜、`Phase2` はその採用セクターに対する銘柄抽出と再分類を指す
- `Dドメイン` の追記先は repo 内の既存ドキュメントを特定して対応する。特定できない場合はユーザー確認を優先する

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
|---|---|---|
| `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md` | CREATE | 本計画 |
| `docs/strategy/theme-sector-taxonomy-and-moomoo-screening-research_20260531.md` | MODIFY候補 | スクリーニングの実行フロー説明を最下部へ追記する第一候補 |
| `docs/reports/screener/daily-ranking.md` | MODIFY候補なし | 現行見出しや表示用語の確認のみ。原則編集しない |

## 実装内容

### A. 実行フローの整理

- `runSectorMomentumScan()` が何を母集団にしてセクターを順位付けしているかを整理する
- `runFundamentalScreener()` が
  - Phase1 上位セクターの選抜
  - sector profile ごとの TradingView scan
  - client-side hard gate
  - theme taxonomy 付与
  - rank block による総合点算出
  - report 用の sector/theme 集計
  の順で進むことを文書化する

### B. 認識ずれが起きやすい点の明文化

- `Phase2 テーマランキング` は theme で直接スキャンしているのではなく、Phase2 通過銘柄を repo taxonomy で再分類して後から集計していることを書く
- `Phase1` はセクター ranking 兼 universe narrowing、`Phase2` は selected sector 内の stock ranking であることを書く
- `theme ranking` と `sector ranking` の粒度差を説明する

### C. ドキュメント追記

- 追記先ドキュメントの最下部に `現行スクリーニングの処理フロー` 節を追加する
- 箇条書きではなく、`何をやって -> 次に何をやって -> 最後に何を表示するか` が追いやすいテキストを中心にする
- 既存内容のリライトはせず、今回必要な説明だけを末尾追加する

## 実装ステップ

- [ ] 実装ソースから Phase1 / Phase2 の処理順を確定する
- [ ] ユーザー向けのテキストフロー説明を作成する
- [ ] Dドメインの追記先を repo 内で確定する。確定できなければ確認する
- [ ] 対象ドキュメント末尾に説明を追記する
- [ ] 差分を見直し、表現が実装とズレていないことを確認する

## テスト戦略

- 今回はロジック変更なしのため自動テスト追加は行わない
- 代わりに、記述内容を `src/core/fundamental-screener.js` と `scripts/screener/run-fundamental-screening.mjs` の実処理順に照合してレビューする

## 検証

```bash
git diff -- docs/strategy/theme-sector-taxonomy-and-moomoo-screening-research_20260531.md
```

必要時:

```bash
sed -n '829,990p' src/core/fundamental-screener.js
sed -n '300,430p' scripts/screener/run-fundamental-screening.mjs
```

## 影響範囲

- 影響あり
  - スクリーニング処理の説明ドキュメント
- 影響なし
  - スクリーニングロジック
  - GitHub Actions workflow
  - レポート生成物の集計値

## リスク

1. `Phase1` / `Phase2` の言葉が「表示章」と「実処理段階」で完全一致しないため、説明文の主語を曖昧にすると誤解を増やす
2. `Dドメイン` の追記先が別ファイルだった場合、誤ったドキュメントへ追加してしまうリスクがある

## スコープ外

- スクリーニング条件の変更
- セクター数、テーマ taxonomy、重み付けの再設計
- レポート Markdown の章立て変更

## 競合確認

- `docs/exec-plans/active/` は確認時点で空であり、今回と競合する進行中 plan は見当たらない
