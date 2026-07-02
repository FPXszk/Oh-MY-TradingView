# SBI to TradingView Portfolio CSV Converter Plan

## Goal

SBIの日本株取引履歴CSV、SBIの米国株約定履歴CSV、TradingView PortfoliosサンプルCSVを入力として、TradingView Portfoliosへ手動インポート可能なUTF-8 CSV、スキップ明細、変換レポートをCLIで生成できるようにする。

## Assumptions

- TradingViewへの実インポートはこのCLIの対象外とし、`conversion_report.md` に手順だけを書く。
- TradingView出力ヘッダーは、指定されたサンプルCSVのヘッダーを正とする。今回のサンプルでは `Symbol,Side,Qty,Fill Price,Commission,Closing Time`。
- SBI CSVはUTF-8またはCP932/Shift_JISとして読み込む。文字化けが少ない方を採用する。
- 手数料欄が `--`、空欄、未取得の場合は `0` として出力する。
- 投資信託はTradingView通常シンボルへ無理に変換せず、理由付きで skipped CSV に出す。

## Files

### Create

- `scripts/portfolio/convert-sbi-to-tradingview.mjs`
  - CLI本体。引数解析、CSV読み書き、SBI米国株/日本株変換、スキップ出力、レポート生成を行う。
- `config/tradingview-symbol-map.json`
  - 米国株・日本株のTradingViewシンボル上書きマップ。
- `tests/portfolio-converter.test.js`
  - CSVパース、エンコーディング、米国株/日本株変換、投資信託スキップ、シンボル上書きの最小テスト。
- `data/portfolio/input/.gitkeep`
  - 入力CSV配置先ディレクトリを保持する。
- `data/portfolio/output/.gitkeep`
  - 出力CSV配置先ディレクトリを保持する。

### Modify

- `package.json`
  - `portfolio:convert` npm scriptを追加する。

### Generated During Verification

- `data/portfolio/input/example.9205072d664d0a6f0bee_bdfd0.csv`
- `data/portfolio/input/yakujo20260702101116.csv`
- `data/portfolio/input/SaveFile_000001_000097.csv`
- `data/portfolio/output/tradingview_us_from_sbi.csv`
- `data/portfolio/output/tradingview_jp_stocks_from_sbi.csv`
- `data/portfolio/output/tradingview_conversion_skipped.csv`
- `data/portfolio/output/conversion_report.md`

## Scope

- SBI CSVからTradingView Portfolios用CSVへ変換するCLIだけを追加する。
- 既存のSBI保有レポート、moomoo診断、スクリーナー処理は変更しない。
- TradingView APIやブラウザ自動操作による実インポートは行わない。

## Implementation Steps

- [ ] 既存のCSVサンプルを元に、SBI米国株・日本株・TradingViewサンプルのヘッダー検出ルールを実装する。
- [ ] 引用符とカンマに対応するCSV parser/stringifierをCLI内に実装し、UTF-8/CP932読み込みを実装する。
- [ ] 米国株変換を実装する。
  - [ ] `約定日`、`銘柄名`、`取引`、`約定数量`、`約定単価`、手数料相当列を抽出する。
  - [ ] `買付` を `Buy`、`売却` を `Sell` に変換する。
  - [ ] 市場名を `NASDAQ:`、`NYSE:`、`AMEX:`、`CBOE:` へ変換し、不明市場は skipped に出す。
  - [ ] `config/tradingview-symbol-map.json` の `us` 上書きを優先する。
- [ ] 日本株変換を実装する。
  - [ ] `約定日`、`銘柄コード`、`取引`、`約定数量`、`約定単価`、`手数料/諸経費等` を抽出する。
  - [ ] `株式現物買` を `Buy`、`株式現物売` を `Sell` に変換する。
  - [ ] PTSを含め、原則 `TSE:銘柄コード` に変換する。
  - [ ] 投資信託キーワードに一致する行は skipped に出す。
  - [ ] `config/tradingview-symbol-map.json` の `jp` 上書きを優先する。
- [ ] `conversion_report.md` に変換件数、スキップ件数、Buy/Sell件数、銘柄別件数、手動インポート手順を出力する。
- [ ] `package.json` に `portfolio:convert` を追加する。
- [ ] Node testを追加し、既存テスト方針に合わせて `node --test` で検証する。
- [ ] 添付CSVを `data/portfolio/input/` に配置し、指定コマンドで実変換する。
- [ ] 出力CSV先頭10行、スキップ理由、レポート件数を確認する。
- [ ] レビュー後、計画を `docs/exec-plans/completed/` に移動して最終コミット・プッシュする。

## Validation

- `node --test tests/portfolio-converter.test.js`
- `npm run portfolio:convert -- --us ./data/portfolio/input/yakujo20260702101116.csv --jp ./data/portfolio/input/SaveFile_000001_000097.csv --example ./data/portfolio/input/example.9205072d664d0a6f0bee_bdfd0.csv --out ./data/portfolio/output`
- `Get-Content ./data/portfolio/output/tradingview_us_from_sbi.csv -TotalCount 10`
- `Get-Content ./data/portfolio/output/tradingview_jp_stocks_from_sbi.csv -TotalCount 10`
- `Get-Content ./data/portfolio/output/tradingview_conversion_skipped.csv -TotalCount 10`
- `Get-Content ./data/portfolio/output/conversion_report.md`
- `git diff --check`

## Risks

- SBI CSVの将来フォーマット変更で列名が変わると、ヘッダー検出に失敗する可能性がある。
- 米国株CSVの `銘柄名` からティッカー/市場を抽出するため、`銘柄名 TICKER / Market` 形式から外れる行は skipped になる。
- TradingView側のインポート仕様がサンプルから変わった場合は、サンプルCSVを更新して再実行する必要がある。
