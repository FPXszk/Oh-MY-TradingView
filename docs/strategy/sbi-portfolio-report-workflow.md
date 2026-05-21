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

入力元の既定探索先:

```text
/mnt/c/Users/szk/Downloads
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
- `My資産トップ` (`https://site.sbisec.co.jp/account/assets`) を authenticated session 経由で保存する
- 可能なら CSV ダウンロードを試す
- CSV が取れなくても「毎資産」ページのテキスト / 表 snapshot を artifact 化する
- capture artifact から `sbi_portfolio_report.md` を生成する

前提:

1. self-hosted runner が Windows 上で動いている
2. 同じマシン上の Chrome が SBI 証券へログイン済みで開いている
3. Chrome が remote debugging port 付きで起動している

代表入力:

- `cdp_host`: 既定 `127.0.0.1`
- `cdp_port`: 既定 `9222`
- `output_dir`: 既定 `docs/reports/screener/portfolio/capture/latest`
- `dry_run`: `true` / `false`

主な出力先:

- runner 上の repo worktree:
  - `docs/reports/screener/portfolio/capture/latest/capture-summary.md`
  - `docs/reports/screener/portfolio/capture/latest/capture-summary.json`
  - `docs/reports/screener/portfolio/capture/latest/sbi_portfolio_report.md`
  - `docs/reports/screener/portfolio/capture/latest/downloads/`
- GitHub Actions artifact:
  - `sbi-portfolio-capture-<RUN_ID>`

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

2026-05-18 pipeline update:

- live workflow run `26040718109` で `My資産トップ｜SBI証券` を target として capture できた
- artifact には `account-assets-page.json/.txt` と `sbi_portfolio_report.md` が含まれる
- 今回の自動回収で確認できた detailed source は `downloads/SaveFile.csv` で、投資信託 3 件は report 化できた
- 一方で、米国株明細 / 国内株明細 / 実現損益詳細 / 約定履歴 CSV はまだ自動回収していないため、report は部分的である

2026-05-20 capture expansion update:

- capture script は `My資産トップ` 到達後、artifact に見えていた導線を次の順序で追加探索する
  - `米国株式`
  - `実現損益詳細`
  - `配当金・分配金履歴`
- 各導線について
  - `account/assets` へ戻る
  - クリック結果を summary note に残す
  - 到達ページを snapshot 化する
  - CSV download を試行する
  という flow に拡張した
- `capture-summary.md` には `Route Captures` セクションが追加され、各導線ごとの
  - attempted
  - clicked
  - captured
  - csv_download_success
  - snapshot
  - downloaded_files
  が残る
- report builder は capture artifact 内の未解析 download も `補助artifact` セクションに列挙するため、`配当金・分配金履歴` 由来の CSV がまだ未解析でも workflow の成果を見失わない

2026-05-20 us-stocks / history-range update:

- `実現損益詳細` は workflow から `2022/01/01` - `today` の range へ強制遷移できるようになった
- `配当金・分配金履歴` も同様に `2022/01/01` - `today` まで広げられる
- どちらも page 本文上で `CSVダウンロード` 文言と長期レンジ結果が確認できた
- `米国株式` は `My資産` 直リンク先では `現在、お客様の預り情報はございません。` となり、CSV も確認できなかった
- そのため米国株の回収は fallback を追加し、
  - `外国株式トップ`
  - `保有銘柄`
  の順で進み、`foreign-holdings-page` 本文から
  - 銘柄名
  - ティッカー
  - 数量
  - 円換算評価額
  - 円換算評価損益
  を text fallback で report 化する

2026-05-20 csv-download artifact update:

- `実現損益詳細` は `baseDateType=CONTRACT` / `product=ALL` を維持した range URL へ workflow から到達できるようになった
- `実現損益詳細` / `配当金・分配金履歴` の両方で、artifact summary 上 `CSVダウンロード` button click 自体は `clicked: true` まで確認できた
- ただし live runs `26112826557` / `26113139012` でも artifact `downloads/` に追加保存された CSV は現れず、結果は `downloads/SaveFile.csv` のみだった
- したがって current state は
  - page 到達: 済み
  - CSV button click: 済み
  - CSV file artifact 化: 未解決
  である

2026-05-21 csv-download completion update:

- live run `26171801854`
  - URL: <https://github.com/FPXszk/Oh-MY-TradingView/actions/runs/26171801854>
  - conclusion: `success`
- `実現損益詳細` / `配当金・分配金履歴` の `CSVダウンロード` は、`button type="button"` で `form` も `onclick` attribute も持たない plain button だった
- capture script 側でこの種の button を `element.click()` ではなく trusted click 相当の CDP mouse dispatch に切り替えたところ、artifact `downloads/` に実ファイルが追加された
- 実際に増えたファイル:
  - `ALLTYPE_20260521001538.csv`
  - `DISTRIBUTION_20260521001543.csv`
- `capture-summary.md` の route result でも
  - `実現損益詳細` `csv_download_success: true`
  - `配当金・分配金履歴` `csv_download_success: true`
  を確認できた
- `build-portfolio-report` 側も quoted CSV header を認識するよう更新し、capture artifact から `ALLTYPE_*.csv` を `実現損益` セクションへ取り込めるようになった
- 現在の到達点は
  - 投資信託 CSV: 取得済み
  - 実現損益 CSV: 取得済み
  - 配当金・分配金履歴 CSV: 取得済み
  - 米国株 CSV: 依然として未確認。ただし `foreign-holdings-page` text fallback で report 化は可能
  である
- ただし subsequent live runs `26172151272` / `26172459167` では、同じ revision でも追加 CSV が再び落ちず `downloads/SaveFile.csv` のみへ戻った
- したがって現時点の厳密な評価は
  - 成功 run の実証: 済み
  - report builder の `ALLTYPE_*.csv` 反映: 済み
  - repeated rerun の安定化: 未解決
  である

2026-05-21 stability rerun update:

- revision `bbff9e8` (`fix: stabilize sbi csv download retries`) で、
  - route 遷移後 `1500ms` settle wait
  - CSV click 前 `1500ms` / click 後 `2000ms` wait
  - download 検知 `20s`
  - keyword ごと最大 2 round retry
  を追加した
- live run `26173338216`
  - URL: <https://github.com/FPXszk/Oh-MY-TradingView/actions/runs/26173338216>
  - artifact: `ALLTYPE_20260521004507.csv`, `DISTRIBUTION_20260521004519.csv`, `SaveFile.csv`
- live run `26173625221`
  - URL: <https://github.com/FPXszk/Oh-MY-TradingView/actions/runs/26173625221>
  - artifact: `ALLTYPE_20260521004929.csv`, `DISTRIBUTION_20260521004941.csv`, `SaveFile.csv`
- 2 連続 rerun で `実現損益詳細` / `配当金・分配金履歴` の CSV が回収できたため、現時点では repeated rerun の安定性は改善したと見てよい

2026-05-21 metadata / us-stocks triage update:

- live run `26175124809`
  - URL: <https://github.com/FPXszk/Oh-MY-TradingView/actions/runs/26175124809>
  - conclusion: `success`
- report 冒頭の `取得日時: n/a` / `生成元: n/a` は、artifact 不足ではなく builder fallback 不足だった
  - `account-assets-page.json` の `text` に `更新 2026/5/21 01:43` が存在したため、snapshot fallback から `取得日時` を復元するよう修正した
  - assets summary CSV が無い run でも、`生成元` は `account-assets-page.json` などの snapshot 名を出すよう修正した
- 米国株 route の `csv_download_success: false` は、この run では workflow failure ではなく live page 制約として扱うのが妥当
  - `My資産` 直リンク先では `csv_candidates: 0`
  - fallback で取得した `foreign-holdings-page.json` には ORCL / IONQ / MU / NVDA / OKLO の保有本文が存在
  - report でも米国株 5 件が本文へ反映されている
- したがって current interpretation は
  - 配当履歴 / 実現損益 CSV: workflow で取得成功
  - 米国株 CSV: 未取得でも、text fallback により report 目的は達成可能
  - 今後 CSV 化を再挑戦する場合は、`csv_download_success` 単体ではなく `foreign-holdings-page` と report 本文の両方を見て判定する

2026-05-21 final verification update:

- live run `26197836346`
  - URL: <https://github.com/FPXszk/Oh-MY-TradingView/actions/runs/26197836346>
  - conclusion: `success`
- artifact には次が含まれていた
  - `downloads/ALLTYPE_20260521092554.csv`
  - `downloads/DISTRIBUTION_20260521092606.csv`
  - `downloads/SaveFile.csv`
  - `sbi_portfolio_report.md`
- `sbi_portfolio_report.md` では次を確認できた
  - `取得日時: 2026/5/21 09:23`
  - `生成元: account-assets-page.json ほか`
  - `米国株` 5 件の text fallback 反映
  - `実現損益` セクションの集計反映
  - `配当金・分配金履歴` セクションの集計と直近受取 20 件の反映
- よって現時点の評価は
  - workflow の最終到達点としては **概ね期待どおり**
  - 米国株 direct CSV は依然未取得でも、report 目的は達成できている
  - この workflow は `capture artifact を残しつつ report を組み立てる read-only パイプライン` として完了扱いにしてよい

## Notes

- 日本株の現保有一覧 CSV が無い場合は、資産サマリー上の評価額から「現保有なし / 要追加CSV」を判定する。
- SBI CSV は UTF-8 と Shift_JIS が混在しうるため、スクリプト側で両対応している。
