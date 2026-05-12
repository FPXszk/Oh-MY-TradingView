# Phase2 sector top5 and top30 report_20260513_0145

## 目的

日次スクリーニングレポートの後半を次の 2 点で拡張する。

1. `Phase2 通過銘柄のセクター内訳` を、各セクターごとの代表銘柄 1 件表示から、各セクターの上位 5 銘柄一覧へ置き換える
2. `銘柄ランキング` の掲載件数を 20 位から 30 位へ増やす

## 変更対象ファイル

- `src/core/fundamental-screener.js`
- `scripts/screener/run-fundamental-screening.mjs`
- `tests/daily-screener-report.test.js`
- `tests/fundamental-screener.test.js`
- `docs/reports/screener/TEMPLATE.md`
- `docs/reports/screener/daily-ranking.md`

## 影響範囲

- Phase2 セクター集計 payload の shape
- Markdown レポートの Phase2 表示構成
- 日次レポートの掲載銘柄数

## 実装方針

- `summarizeSectors()` を拡張し、各セクターの平均値に加えて `rankScore` 上位 5 銘柄の詳細配列を返す
- Phase2 の出力は「1 セクター 1 行の集計表」から「1 セクター 5 行までの銘柄表」へ変更する
- 各銘柄行には、既存の `銘柄ランキング` と同じ主要指標列を使う
- `runFundamentalScreener()` の `limit` を 30 に変更し、テスト fixture も更新する

## 実装ステップ

- [ ] `src/core/fundamental-screener.js` でセクター別 Top5 銘柄情報を返すようにする
- [ ] `scripts/screener/run-fundamental-screening.mjs` で Phase2 セクションをセクター別 Top5 表示に置き換える
- [ ] `scripts/screener/run-fundamental-screening.mjs` の掲載件数を 30 に広げる
- [ ] `docs/reports/screener/TEMPLATE.md` を新しい Phase2 表示に合わせて更新する
- [ ] `tests/daily-screener-report.test.js` と `tests/fundamental-screener.test.js` を新仕様に合わせて更新する
- [ ] テスト実行と実レポート再生成で、Phase2 表示と Top30 掲載を確認する

## テスト戦略

- `tests/daily-screener-report.test.js` で Phase2 の新表構造と Top30 出力を検証する
- 必要に応じて `tests/fundamental-screener.test.js` でセクター別 Top5 payload を検証する
- 実コマンド実行で `daily-ranking.md` を再生成し、目視確認する

## 検証コマンド

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE SCREENER_GROSS_MARGIN_MIN_PCT=30 SCREENER_SCOPE_LABEL='NASDAQ + NYSE stocks only (OTC excluded)' node scripts/screener/run-fundamental-screening.mjs`

## リスク

- Phase2 セクションが長くなるため、Markdown の可読性が落ちる可能性がある
- 既存の `sectorRanking` を参照しているコードがあれば payload shape 変更の影響を受ける
- 30 件化によりテスト fixture と期待値の更新量がやや増える

## スコープ外

- Phase1 指標や重みの変更
- 銘柄ランキングの列追加・削除
- セクターの並び順ロジックそのものの変更
