# US/JP Screener Fine Market Cap Bands Research And Live Verify

## 目的

米国株・日本株のスクリーニングレポートで、時価総額の帯表示を細かめ版 `(XL) (L+) (L) (M+) (M) (M-) (S)` に切り替える。  
あわせて、日本株は米国株と別基準を適用し、実際のワークフローを両方動かして期待どおりの表示になることを確認する。

## 変更対象ファイル

- `scripts/screener/run-fundamental-screening.mjs`
- `tests/daily-screener-report.test.js`
- `docs/exec-plans/active/us-jp-fine-marketcap-bands-research-and-live-verify_20260604_1036.md`

## 実装方針

- レポート生成時の時価総額フォーマットを、US/JP で別のしきい値を持てる形に変更する
- US は一般的な大型・中型・小型の USD 境界をベースに、表示用に `XL / L+ / L / M+ / M / M- / S` へ細分化する
- JP はまず市場で使われるサイズ区分の考え方を調べ、そのうえでレポート表示用の JPY 基準を定義して適用する
- 既存のランキングロジックは変えず、表示と期待値テストを外科的に更新する

## 影響範囲

- US/JP の日次スクリーニング Markdown 出力の時価総額表示
- それに追随するレポート生成テスト
- GitHub Actions の live 出力確認

## 範囲外

- スクリーニング指標や順位付けロジックそのものの変更
- セクター/テーマ選定ルールの再変更
- workflow 定義そのものの構造変更

## 検証方針

- `node --test tests/daily-screener-report.test.js`
- `node --test tests/fundamental-screener.test.js`
- `git diff --check`
- GitHub Actions の US/JP スクリーニング workflow を実行し、生成されたレポートを確認

## リスク

- 日本株の `marketCapUsd` 相当フィールドが実際には JPY スケールで来ている可能性があり、表示記号としきい値の両方を揃えないと誤読を招く
- JP の公式な大型/中型/小型区分は固定金額ではなく指数ルール寄りの可能性があるため、表示ルールとしての定義をコード内で明示する必要がある

## 実装ステップ

- [x] US/JP の時価総額サイズ区分の根拠を調査し、適用方針を確定する
- [x] `scripts/screener/run-fundamental-screening.mjs` の時価総額表示を US/JP 別の細かめ版に更新する
- [x] `tests/daily-screener-report.test.js` の期待値を新表示に合わせて更新する
- [x] ローカルテストと diff チェックを実行する
- [x] US/JP の workflow を実行し、生成レポートで表示を確認する
