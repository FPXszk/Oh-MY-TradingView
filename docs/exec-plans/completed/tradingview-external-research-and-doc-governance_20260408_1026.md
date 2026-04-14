# 外部 TradingView 関連リポジトリ調査・適用可能性分析・参照管理整備計画

## 問題提起

本リポジトリは現在、TradingView Desktop を debug mode で起動し、CDP 経由で操作して期間バックテストを実行している。  
今回の作業では、指定された外部リポジトリ群と `github.com/tradingview` 配下を調査し、それぞれの役割を明確化したうえで、本リポジトリへ持ち込める実装方針・運用能力・代替アプローチを詳細比較する。  
あわせて、調査で参照した外部資料を `docs/references/design-ref-llms.md` に必ず記録する運用を明文化し、最終的にドキュメント整備、セッションログ作成、push、待機まで完了させる。

## スコープ

- 指定 5 リポジトリの調査、要約、比較
- `https://github.com/tradingview` が公式かどうかの確認
- 公式である場合の `tradingview` org 配下リポジトリの棚卸しと分類
- 現行方式（TradingView Desktop + CDP）との比較
- CDP を使わないバックテスト代替案の有無調査
- financial / fundamental info 取得の代替経路や導入可能性の調査
- 本 repo に持ち込める skill / capability / architecture / docs 運用の抽出
- 参照資料の `docs/references/design-ref-llms.md` への記録
- 「参照した資料は必ず `docs/references/design-ref-llms.md` に記録する」ルールの明文化
- セッションログ作成、文書保守、push、待機

## スコープ外

- CDP 代替実装そのものの追加
- MCP / CLI の新機能実装
- 外部 API キー導入や認証連携実装
- バックテスト基盤の全面刷新
- 新規 lint / test 基盤の追加
- 既存ドキュメントの無関係な全面修正

## 対象ファイル

### 作成

- `docs/exec-plans/active/tradingview-external-research-and-doc-governance_20260408_1026.md`
- `docs/research/<research-summary-name>_YYYYMMDD_HHMM.md` または `docs/research/archive/<comparison-doc-name>_YYYYMMDD_HHMM.md`
- `docs/working-memory/session-logs/<session-log-name>_YYYYMMDD_HHMM.md`

### 更新

- `docs/references/design-ref-llms.md`
- `docs/DOCUMENTATION_SYSTEM.md`
- `README.md`（ルール掲示先として必要な場合）

### 削除

- なし

## 実装ステップ

- [ ] 指定 5 リポジトリの目的、技術方式、TradingView との接続方法、本 repo への適用可能性を整理する
- [ ] `github.com/tradingview` が公式組織かを確認し、公式なら配下リポジトリを分類して要約する
- [ ] ローカル repo を横断確認し、現行アプローチ（Desktop + CDP + period backtesting）の前提、制約、強みを整理する
- [ ] 外部調査結果と現行方式を比較し、CDP 非依存バックテスト、financial / fundamental info 取得、MCP 化 / CLI 化 / Webhook 化 / Pine 資産活用の持ち込み余地を整理する
- [ ] 採用候補、不採用候補、要追加調査項目を明文化する
- [ ] 調査結果の本体ドキュメントを `docs/research/` もしくは `docs/research/archive/` に保存する
- [ ] 調査で参照した全外部資料を `docs/references/design-ref-llms.md` に理由、採用 / 不採用判断付きで追記する
- [ ] `docs/DOCUMENTATION_SYSTEM.md` と必要なら `README.md` に参照資料記録ルールを明示する
- [ ] ドキュメント相互導線を更新する
- [ ] 作業内容、判断理由、未解決事項を session log に残す
- [ ] 既存コマンドで検証し、差分確認後に commit / push する

## テスト戦略

### RED

- 現状の `docs/references/design-ref-llms.md` の不整合と、参照記録ルール未整備状態を確認する
- 文書間導線不足や記録漏れが起きる箇所を洗い出す

### GREEN

- 参照資料一覧、比較調査結果、公式 / 非公式判定、適用可否判断、文書ルール追加を最小差分で反映する
- `design-ref-llms.md` に参照資料を欠けなく記録する
- `DOCUMENTATION_SYSTEM.md` / `README.md` の可視ルールを整える

### REFACTOR

- 見出し構成、導線、重複記述を整理し、今後の追記保守をしやすくする
- research / design-doc / session log の役割分担を明確にする

## 検証コマンド

- `npm test`
- `npm test:e2e`
- `npm test:all`

## リスク / 注意点

- 外部リポジトリは要約だけでなく、本 repo への適用判断まで落とし込まないと成果が曖昧になる
- `github.com/tradingview` 配下には本件と直接関係しない repo も含まれる可能性があり、分類と取捨選択が必要
- `design-ref-llms.md` は現状ノイズ混入があるため、既存の有効記載を壊さず整形する必要がある
- README と DOCUMENTATION_SYSTEM の両方を更新する場合、責務重複に注意する
- CDP 非依存代替案は「存在する」ことと「この repo に適用可能」であることが別問題のため、比較軸を明示する

## 期待成果物

- `docs/exec-plans/active/tradingview-external-research-and-doc-governance_20260408_1026.md`
- 外部リポジトリ比較・適用可能性調査文書
- `docs/references/design-ref-llms.md` 更新
- `docs/DOCUMENTATION_SYSTEM.md` と必要に応じた `README.md` 更新
- `docs/working-memory/session-logs/<session-log-name>_YYYYMMDD_HHMM.md`
- commit / push 済み状態
