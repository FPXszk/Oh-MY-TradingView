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

追記:

- `SBI Portfolio Capture` という self-hosted GitHub Actions workflow を追加した。
- こちらは **既存のログイン済み Chrome が CDP endpoint を公開していること** を前提に、SBI タブへ接続して CSV ダウンロードを試み、取れない場合は「毎資産」ページのテキストと表を artifact 化する。
- 2026-05-18 時点では、この開発セッションから `127.0.0.1:9222` / `127.0.0.1:9223` の live endpoint は未確認だったため、repo 側では probe 可能な workflow として実装し、実運用確認は runner 上で行う前提とする。

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

## GitHub Actions Capture Workflow

workflow:

```text
.github/workflows/sbi-portfolio-capture.yml
```

目的:

- ログイン済み SBI Chrome tab へ CDP 接続する
- 現在ページを保存する
- 可能なら CSV ダウンロードを試す
- CSV が取れなくても「毎資産」ページのテキスト / 表 snapshot を artifact 化する

前提:

1. self-hosted runner が Windows 上で動いている
2. 同じマシン上の Chrome が SBI 証券へログイン済みで開いている
3. Chrome が remote debugging port 付きで起動している

代表入力:

- `cdp_host`: 既定 `127.0.0.1`
- `cdp_port`: 既定 `9222`
- `output_dir`: 既定 `docs/reports/screener/portfolio/capture/latest`
- `dry_run`: `true` / `false`

ローカル確認:

```bash
npm run sbi:portfolio-capture -- --dry-run
```

CDP endpoint が無い場合でも、`capture-summary.md` と `capture-error.txt` を出して失敗理由を残す。

2026-05-18 debug memo:

- `127.0.0.1:9222` / `127.0.0.1:9223` が未応答なら、`capture-summary.md` の `Endpoint Probe` に
  - `endpoint_reachable`
  - `version_ok`
  - `list_ok`
  - `target_count`
  - `GET /json/version` / `GET /json/list` の失敗理由
  が残る。
- workflow 側でも `Probe CDP endpoint` step で `json/version` / `json/list` を先に確認する。
- 現在の blocker が `CDP endpoint 不在` なのか `SBI tab 不在` なのかは、この probe と summary で切り分ける。
- Windows 側では dedicated Chrome shortcut から `127.0.0.1:9222` の endpoint 応答を確認できた。
- 一方、WSL からの `127.0.0.1:9222` は未到達のままだったため、local WSL 実行と self-hosted Windows runner 実行は分けて考える。
- 現時点で bootstrap 後の次 blocker は `No SBI Securities tab found` で、SBI ログイン済み tab を CDP 対象の Chrome 側に載せる必要がある。

## Notes

- 日本株の現保有一覧 CSV が無い場合は、資産サマリー上の評価額から「現保有なし / 要追加CSV」を判定する。
- SBI CSV は UTF-8 と Shift_JIS が混在しうるため、スクリプト側で両対応している。
