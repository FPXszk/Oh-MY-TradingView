# Public vs Strongest 比較表作成計画

作成日時: 2026-04-21 16:13 JST

## 目的

最新の `public-top10-us-40x10` 実行結果と、既存の strongest / finetune 系の結果を同じ指標で比較し、どちらが優勢か判断できる比較表を作成する。

## 現時点の確認結果

- public 側の最新確定ソース
  - `/tmp/night-batch-24705526295/night-batch-24705526295-1/gha_24705526295_1-summary.json`
  - run17 artifact から `public-top10-us-40x10` の smoke / production 実績を取得可能
- 既存 strongest / finetune 側の手元ソース
  - `artifacts/campaigns/next-long-run-jp-finetune-100x10/smoke/final-results.json`
  - `artifacts/campaigns/next-long-run-us-finetune-100x10/smoke/final-results.json`
- 現時点では workflow summary だけでは優劣断定に必要な `net_profit` / `profit_factor` 比較が不足している

## 変更・確認対象ファイル

- 作成: `docs/exec-plans/completed/public-vs-strongest-comparison-table_20260421_1613.md`
- 変更候補: `docs/reports/night-batch-self-hosted-run17.md`
- 変更候補: `docs/reports/README.md`
- 変更候補: 新規比較メモを置くなら `docs/reports/night-batch-public-vs-strongest.md`

## 実装内容と影響範囲

- 比較対象の定義
  - public: `public-top10-us-40x10`
  - 比較先: 既存 strongest / finetune 系のうち、手元に metrics がある campaign
- 比較指標
  - success / failure / total
  - `net_profit`
  - `profit_factor`
  - `max_drawdown`
  - 必要なら `closed_trades` / `percent_profitable`
- 出力形式
  - ユーザー向けに読みやすい比較表を作成
  - 既存 run archive に追記するか、独立レポートを新規作成する

## 実装ステップ

- [ ] public run17 artifact から `public-top10-us-40x10` の strategy 単位 metrics を抽出する
- [ ] strongest / finetune 側の `final-results.json` から同じ指標を抽出する
- [ ] 比較可能な market / phase / symbol 条件の差を整理し、完全比較でない点を明示する
- [ ] RED: 必要なら report index か比較表ドキュメントの存在を固定する最小テストを追加する
- [ ] GREEN: 比較表を `docs/reports/` に追加し、要点をまとめる
- [ ] REVIEW: 「完走性」と「性能」を混同していないか確認する
- [ ] 検証: 追加した doc まわりの既存テストがあれば実行する
- [ ] COMMIT/PUSH: 承認後、必要なら plan を `completed/` へ移し commit / push する

## テスト戦略

- 主体は調査と docs 更新
- ドキュメント配置や index が変わる場合のみ、既存の layout 系テストを最小限で確認する

## 検証コマンド候補

- `python3` で `final-results.json` / artifact summary を読んで metrics を集計
- `node --test tests/repo-layout.test.js`

## リスクと注意点

- public 側と strongest 側で市場・銘柄集合・phase が一致しない可能性が高く、完全な apples-to-apples 比較にはならない
- run17 artifact が smoke / production の summary だけで、strategy 単位の metrics 抽出に追加パースが必要になる可能性がある
- 既存 active plan
  - `night-batch-readiness-stabilization_20260416_1706.md`
  - `night-batch-summary-and-storage-followup_20260420_1123.md`
  と近接するが、今回は比較表作成に限定する

## スコープ外

- strategy の入れ替え判断そのもの
- workflow や campaign 定義の変更
- 新規 backtest の追加実行
