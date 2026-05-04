# 日次スクリーナー順位説明・上位20件化 実装計画

## ゴール

毎日 JST 12:00 に更新される `docs/reports/screener/daily-ranking.md` について、以下を満たす。

1. 上位銘柄が「なぜその順位なのか」を、相対順位ベースで説明できる
2. 詳細解説は上位5件まで表示し、6位以降は一覧中心にする
3. ランキング表示を上位10件から上位20件へ拡張する
4. 銘柄ランキングに加えてセクター強度ランキングを同じレポートに載せる
5. 現在の市場カバレッジ（NASDAQ / NYSE / OTC / CBOE 等）がどこ由来で何件規模かをレポート内で説明できる
6. 現在使っている財務指標と、未採用だが追加検討価値のある指標を調査結果として追記できる

## 前提と解釈

- 依頼の中心は「日次スクリーナーレポートの説明力強化」であり、既存ワークフローの実行時刻変更ではない
- 現在のスケジュールは `.github/workflows/daily-screener.yml` の `0 3 * * *` で、UTC 03:00 = JST 12:00
- 現在の順位は `rank(Perf.3M) + rank(ROE) + rank(FCFマージン) + rank(revenueGrowth)` の rank-sum（Yahoo enrich 有効時）で決まる
- 市場の母集団件数は TradingView Scanner API の `america` 市場と `stock` type の返却結果から把握できる範囲を明記し、「概数」で扱う
- 今回はランキングロジックの全面刷新ではなく、まず既存ロジックの可視化と補助集計を優先する

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
|---|---|---|
| `src/core/fundamental-screener.js` | MODIFY | レポート用メタデータ拡張。`sector` / `industry` / 市場情報を返し、順位理由に使う各指標順位・合計点・セクター集計を返せるようにする |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | Markdown 出力を上位20件化。上位5件の順位理由、セクターランキング、市場カバレッジ、財務指標メモを追加する |
| `src/cli/commands/screener.js` | MODIFY | 必要なら `limit` デフォルト説明を 20 件基準に合わせる。内部結果の拡張に追随する |
| `src/tools/screener.js` | MODIFY | MCP ツール説明文を新しい順位説明項目と上位20件前提に合わせる |
| `tests/fundamental-screener.test.js` | CREATE | スコア内訳、セクター集計、市場情報、20件 limit の挙動を固定する |
| `tests/daily-screener-report.test.js` | CREATE | Markdown に上位5件解説、上位20件表、セクター順位、市場カバレッジ節が出ることを固定する |
| `package.json` | MODIFY | 新規テストファイルを `npm test` 対象へ追加する |

## 実装内容

### A. 順位理由の可視化

- 各銘柄に以下を付与する
  - 総合 `rankScore`
  - `Perf.3M` / `ROE` / `FCFマージン` / `revenueGrowth` の個別順位
  - どの指標が上位を押し上げたか、どの指標が相対的に弱いかを判定する材料
- 上位5件については Markdown 上で
  - 何が strongest contributor だったか
  - 2位以下との差がどこにあったか
  - 弱点があるなら何か
  を1銘柄ずつ短く説明する

### B. 上位20件化

- 日次ジョブの `runFundamentalScreener({ limit: 20, enrichWithYahoo: true })` へ変更
- 見出し、集計文言、表の件数を 20 件前提へ更新
- 6位以降は説明段落を付けず、一覧のみ維持する

### C. セクターランキング

- Scanner API の `sector` を取得列に追加する
- スクリーナー通過銘柄を対象に、少なくとも以下を算出する
  - セクター別銘柄数
  - セクター平均 `Perf.3M`
  - セクター平均 `rankScore` または上位銘柄寄与を踏まえた補助指標
- レポートには「今強いセクター」を見たい用途に合わせ、単純で説明しやすい並び順を採用する
- 実装前に複雑な多因子 sector score は入れず、まず平均3Mリターン + 通過銘柄数ベースの簡潔な順位付けに留める

### D. 市場カバレッジ説明

- `exchange` を集計して、NASDAQ / NYSE / OTC / CBOE など何市場から通過しているかを出す
- Scanner の設定が `markets: ['america']` + `types: ['stock']` であることをレポートに明記する
- 可能であれば返却データ件数から
  - スキャン対象総数
  - サーバーフィルター通過件数
  - クライアントフィルター通過件数
  - 通過銘柄の市場別内訳
  をまとめる
- 「市場全体の総上場件数」は API から確定取得できない場合、今回のスキャン結果ベースの観測値として表現する

### E. 財務指標の追加提案

- 現在見ている指標をレポートに整理する
  - 収益性: EPS, ROE, gross margin, FCF margin
  - バリュエーション: P/FCF
  - 成長: revenueGrowth
  - モメンタム/需給: RSI, Perf.3M, relative volume, 52週高値比率
- 未採用だが追加候補として妥当な指標を、取得可否込みで短く提案する
  - 例: debt/equity, earningsGrowth, profitMargins, forwardPE, price_book_fq, dividendYield, net margin 系
- 今回は「提案まで」を範囲とし、追加採用は別タスクに分離する

## 実装ステップ

- [x] `src/core/fundamental-screener.js` の現行返却値を拡張する
- [x] 個別順位内訳と explanation 用補助データを追加する
- [x] `sector` / `industry` / `exchange` 集計を追加する
- [x] `scripts/screener/run-fundamental-screening.mjs` の Markdown 構成を更新する
- [x] 上位20件表 + 上位5件解説 + セクター順位 + 市場説明 + 財務指標メモを追加する
- [x] CLI / MCP の説明文・デフォルト件数表記を更新する
- [x] `tests/fundamental-screener.test.js` を追加する
- [x] `tests/daily-screener-report.test.js` を追加する
- [x] `package.json` の test script に新規テストを追加する
- [x] `npm test` を実行して既存回帰がないことを確認する
- [x] 必要なら `node scripts/screener/run-fundamental-screening.mjs` 相当のローカル dry-run で出力確認する

## テスト戦略

- RED:
  - スコア内訳・セクター集計・市場内訳が現状返っていないことを新規テストで固定
  - Markdown に上位5件解説やセクター順位節がないことを新規テストで固定
- GREEN:
  - 最小変更で返却 payload とレポート出力を拡張し、テストを通す
- REFACTOR:
  - explanation 生成ロジックが重複した場合のみ小さく整理する

## 検証コマンド

```bash
npm test
node scripts/screener/run-fundamental-screening.mjs
```

## 影響範囲

- 影響あり
  - 日次スクリーナーの Markdown 形式
  - CLI / MCP の `fundamental` 出力 payload
  - 自動コミットされる日次レポートの見え方
- 影響なし
  - バックテスト系ワークフロー
  - CDP / TradingView Desktop 操作
  - 他の market-intel API

## リスク

1. `sector` / `industry` の列名は Scanner API 側の実フィールドに依存するため、期待名が違うと修正が必要
2. 上位5件 explanation が冗長になるとレポートが読みにくくなるため、文量制御が必要
3. CLI / MCP の payload 拡張で既存利用側が strict schema 前提なら影響する可能性がある
4. Yahoo Finance enrich 失敗時に `revenueGrowth` が null の銘柄説明文をどう表現するか整理が必要

## スコープ外

- スクリーニング条件そのものの見直し
- 新しい外部データソースの追加
- 追加財務指標を実際にランキングへ組み込むこと
- 過去時点の sector 強度履歴の保存

## 競合確認

- `docs/exec-plans/active/` を確認し、今回のスクリーナー日次レポート改修と直接競合する active plan は見当たらない
