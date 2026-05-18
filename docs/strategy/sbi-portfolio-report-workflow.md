# SBI Portfolio Report Workflow

## Goal

手動ログイン済みの SBI 証券画面と、ダウンロードした CSV を使って、現ポートフォリオ・現金残高・実現損益・約定履歴を 1 本の Markdown にまとめる。

## Safety

- 読み取り専用のみ
- ログインは手動
- 発注、取消、入出金は実施しない
- Cookie / password / local storage は扱わない

## Current Verified Path

今回のセッションで実際に検証できたのは、**CSV ダウンロード後の集計ワークフロー**。
Chrome 上での tab claim / 画面遷移は、このセッションではツール露出を確認できなかったため、ブラウザ操作自体は durable workflow に含めず、CSV 出力以降を安定経路として固定する。

## Required CSV Files

`/mnt/c/Users/szk/Downloads/` に以下の最新ファイルがある前提。

- `sbi_assets_summary.csv`
- `sbi_us_stocks.csv`
- `SaveFile.csv`
- `ALLTYPE_*.csv`
- `DOMESTIC_STOCK_*.csv`
- `FOREIGN_STOCK_*.csv`
- `FUND_*.csv`
- `SaveFile_*.csv`
- `yakujo*.csv`

## Run

```bash
npm run sbi:portfolio-report
```

既定の出力先:

```text
/mnt/c/Users/szk/Documents/レポート/スクリーンワー/portfolio_new/sbi_portfolio_report.md
```

## Optional Overrides

個別パスを上書きしたい場合は CLI option を使う。

```bash
node scripts/sbi/build-portfolio-report.mjs --help
```

## Expected Output

生成される Markdown には以下を含む。

- 総資産残高
- 円預り金 / 米ドル預り金（円換算）
- 現在の米国株一覧
- 現在の投資信託一覧
- 日本株の現保有有無
- 商品別の実現損益
- 実現益 / 実現損の上位銘柄
- 国内株・投信・米国株を統合した直近約定履歴

## Manual Browser Steps

1. Chrome で SBI 証券に手動ログインする
2. 口座管理 / ポートフォリオ / 実現損益 / 約定履歴から CSV をダウンロードする
3. `Downloads` に CSV が揃ったら `npm run sbi:portfolio-report` を実行する
4. 出力 Markdown を確認する

## Notes

- 日本株の現保有一覧 CSV が無い場合は、資産サマリー上の評価額から「現保有なし / 要追加CSV」を判定する。
- SBI CSV は UTF-8 と Shift_JIS が混在しうるため、スクリプト側で両対応している。
