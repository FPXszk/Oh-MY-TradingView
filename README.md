# Oh-MY-TradingView

TradingView Desktop を **Copilot CLI 前提** で扱う最小 MCP / CLI ブリッジです。  
現在の対象は **Windows + WSL** を主軸にした **CDP 接続 / 現在価格取得 / Pine ループ** です。

- docs の入口: `docs/DOCUMENTATION_SYSTEM.md`
- 現在の研究 handoff / 最新結果: `docs/research/latest/`
- 外部・比較調査の参照資料台帳: `docs/references/design-ref-llms.md`
- **外部資料を参照したら `docs/references/design-ref-llms.md` に必ず記録してください**

## 重要な前提

- **非公式**: TradingView Inc. とは無関係です
- **CDP 操作はローカル限定**: `tv_*` / `pine_*` / `backtest` 系はローカルの TradingView Desktop に対して動作します
- **`market_*` は外部取得あり**: `market_quote` / `market_fundamentals` / `market_snapshot` / `market_news` / `market_screener` / `market_ta_summary` / `market_ta_rank` / `market_symbol_analysis` / `market_confluence_rank` は Yahoo Finance の public endpoint を使います
- **`x_*` は read-only**: `x_status` / `x_whoami` / `x_search_posts` / `x_user_profile` / `x_user_posts` / `x_tweet_detail` はローカルの `twitter-cli` と認証済みブラウザ cookies または `TWITTER_AUTH_TOKEN` / `TWITTER_CT0` を使います
- **`reach_*` は Twitter 以外の目**: `reach_status` / `reach_read_web` / `reach_read_rss` / `reach_search_reddit` / `reach_read_reddit_post` / `reach_read_youtube` は read-only の external observation layer です
- **要ユーザー起動**: 現行前提は **Windows で `9222` 起動 / WSL からは `9223` 接続** です
- **利用規約順守**: TradingView の Terms of Use は利用者責任です

## できること

### MCP tools

- `tv_health_check`
- `tv_discover`
- `tv_get_price`
  - 現在チャート価格
  - `symbol` 指定時は symbol 切替後に価格取得
- `tv_backtest_nvda_ma_5_20`
  - NVDA 固定 5/20 SMA クロス戦略バックテスト
  - Strategy Tester の主要指標を読み取り
  - Strategy Tester が読めない場合は chart bars から local fallback metrics を返す
- `tv_backtest_preset`
  - preset-driven 戦略バックテスト（presetId / symbol / dateFrom / dateTo）
- `tv_launch`
  - TradingView Desktop を CDP debug port 付きで起動
- `tv_launch_browser`
  - Chromium 系ブラウザで TradingView chart URL を CDP debug port 付きで起動（bounded fallback）
  - TradingView Desktop が利用不可時の観測・復旧支援用途。Desktop の完全な代替ではありません
  - `executablePath` で明示指定、または既知候補から自動検出
  - `dryRun` で起動コマンドのプレビューのみ可能
- `tv_capture_screenshot`
  - CDP 経由でスクリーンショット取得（png / jpeg）
  - 保存時は `results/screenshots/` 配下の相対パスのみ許可
- `tv_stream_price`
  - 制限付きポーリング（maxTicks 回数上限付き、無限常駐ではない）
- `market_quote` — 個別銘柄の quote（CDP 不要）
- `market_fundamentals` — ファンダメンタルズ（PE, 時価総額 等）
- `market_snapshot` — 複数銘柄 quote 一括取得
- `market_news` — 金融ニュース検索
- `market_screener` — 価格 / 出来高でフィルタリング
- `market_ta_summary` — 複数銘柄の TA 要約（price change, RSI14, SMA20/50 乖離）
- `market_ta_rank` — TA 指標で銘柄ランキング（priceChange / rsi14 / sma20Deviation / sma50Deviation）
- `market_symbol_analysis` — 単一銘柄の deterministic analyst-style analysis（trend / fundamentals / news / risk / overall + confluence）
- `market_confluence_rank` — 複数銘柄を deterministic confluence score で順位付け
- `x_status` — Twitter/X の認証状態確認（read-only）
- `x_whoami` — 認証済みの Twitter/X アカウント確認
- `x_search_posts` — Twitter/X 投稿検索
- `x_user_profile` — Twitter/X ユーザープロフィール取得
- `x_user_posts` — Twitter/X ユーザー投稿取得
- `x_tweet_detail` — Twitter/X 単一投稿詳細取得
- `reach_status` — Web / RSS / Reddit / YouTube の可用状態確認
- `reach_read_web` — Jina Reader 経由で公開 Web ページ本文を読む
- `reach_read_rss` — RSS / Atom feed を読む
- `reach_search_reddit` — 公開 Reddit 投稿を検索する
- `reach_read_reddit_post` — 公開 Reddit 投稿本文と上位コメントを読む
- `reach_read_youtube` — YouTube metadata を読み、`yt-dlp` があると字幕断片も読む

> `market_*` は CDP 不要ですが、ネットワーク経由で Yahoo Finance の public endpoint を参照します。

> `x_*` も CDP 不要ですが、ローカルで `twitter-cli` が使えることと、X への認証が済んでいることが前提です。今回の実装は **read-only 限定** で、投稿・返信・いいね・フォローは含みません。

> `reach_*` も CDP 不要で **read-only 限定** です。Phase 1 は Web / RSS / Reddit / YouTube の観測に絞っており、投稿・コメント送信・subscribe などの write 操作は含みません。

#### Workspace 操作 (CDP 必要)

- `tv_watchlist_list` — アクティブ watchlist の銘柄一覧
- `tv_watchlist_add` — watchlist に銘柄追加
- `tv_watchlist_remove` — watchlist から銘柄削除（見つからなければエラー）
- `tv_pane_list` — チャートペイン一覧
- `tv_pane_focus` — ペインを index で選択（範囲外ならエラー）
- `tv_tab_list` — 現在 layout 内の chart slot 一覧
- `tv_tab_switch` — 現在 layout 内の active chart slot を index で切替（範囲外ならエラー）
- `tv_layout_list` — レイアウト一覧
- `tv_layout_apply` — レイアウト適用（見つからなければエラー）

#### Alert 管理 (CDP 必要 / ローカル限定)

- `tv_alert_list` — 現在チャートの alert 一覧
- `tv_alert_create_price` — 価格 alert 作成（ローカル通知のみ、webhook なし）
- `tv_alert_delete` — alert を id で削除（見つからなければエラー）

> Alert 操作はローカル TradingView Desktop 上の価格アラートのみ対象です。webhook 配信先の設定は未対応です。

#### Observability (CDP 必要)

- `tv_observe_snapshot` — one-shot 観測スナップショット
  - CDP 接続情報、ページ/チャート状態、ランタイムエラー、スクリーンショットを `results/observability/<snapshot-id>/` に保存
  - 部分失敗時は `warnings` に記録し、成功可能な部分は返却
- `pine_get_source`
- `pine_set_source`
- `pine_compile`
- `pine_get_errors`
- `pine_smart_compile`
- `pine_analyze`

### CLI

- `tv status`
- `tv discover`
- `tv price get`
- `tv price get --symbol NVDA`
- `tv pine get`
- `tv pine set --file <path>`
- `tv pine compile`
- `tv pine errors`
- `tv pine analyze --file <path>`
- `tv backtest nvda-ma`
- `tv backtest preset <preset-id> --symbol NVDA`
- `tv launch [--port 9222] [--path /path/to/tv] [--dry-run]`
- `tv launch-browser [--port 9333] [--path /path/to/chrome] [--url https://www.tradingview.com/chart/] [--dry-run]`
- `tv capture [--output chart.png] [--format png|jpeg] [--quality 80]`
- `tv stream [--symbol NVDA] [--interval 5000] [--ticks 12]`
- `tv market quote --symbol AAPL`
- `tv market fundamentals --symbol AAPL`
- `tv market snapshot AAPL MSFT GOOGL`
- `tv market news --query "earnings"`
- `tv market screener AAPL MSFT --min-price 100`
- `tv market ta-summary AAPL MSFT GOOGL`
- `tv market ta-rank AAPL MSFT --sort-by rsi14 --order asc`
- `tv market analysis --symbol AAPL`
- `tv market confluence-rank AAPL MSFT NVDA --limit 3`
- `tv x status`
- `tv x whoami`
- `tv x search --query "NVDA" --max 3`
- `tv x user --username jack`
- `tv x user-posts --username jack --max 5`
- `tv x tweet --id 1234567890`
- `tv reach status`
- `tv reach web --url https://example.com`
- `tv reach rss --url https://news.ycombinator.com/rss --max 3`
- `tv reach reddit-search --query "NVDA earnings" --max 3`
- `tv reach reddit-post --id <post-id>`
- `tv reach youtube --url https://www.youtube.com/watch?v=jNQXAC9IVRw`
- `tv workspace watchlist-list`
- `tv workspace watchlist-add --symbol AAPL`
- `tv workspace watchlist-remove --symbol AAPL`
- `tv workspace pane-list`
- `tv workspace pane-focus --index 0`
- `tv workspace tab-list`
- `tv workspace tab-switch --index 1`
- `tv workspace layout-list`
- `tv workspace layout-apply --layout "My Layout"`
- `tv alert list`
- `tv alert create-price --price 150 --condition crossing_up`
- `tv alert delete --id <alert-id>`
- `tv observe snapshot`

### Market confluence の見え方

- `tv market analysis --symbol AAPL` の `analysis.overall_summary` には、既存の `stance` / `confidence` / `signals` / `warnings` に加えて `confluence_score` / `confluence_label` / `confluence_breakdown` / `coverage_summary` が入ります。
- `confluence_score` は trend / fundamentals / risk の固定重みで作る coarse な 0-100 スコアです。`news` は初期実装では direction ではなく coverage のみを補強します。
- fundamentals などの core input が欠けた場合でも schema は壊さず、`coverage_summary` と warning で degraded 状態を明示します。
- `analysis.provider_status` には `quote` / `fundamentals` / `ta` / `news` / `community` の `status` / `missing_reason` / `available` が入り、silent null を避けます。
- `analysis.community_snapshot` には `x` / `reddit` の件数、最新時刻、source presence、provider別 warning が入り、初期実装では **directional sentiment は返しません**。
- `tv market confluence-rank ...` でも `ranked_symbols[]` に `provider_status` と `community_snapshot` が伝播し、`--limit` で落ちた成功銘柄は `omitted[]` に残ります。

## アーキテクチャ

```text
Copilot CLI / tv CLI (WSL or Windows)
        ↓
   MCP Server (stdio)
        ↓
 Chrome DevTools Protocol
        ↓
 TradingView Desktop (Electron)
```

## セットアップ

### 1. 依存インストール

```bash
npm install
```

### 1.5 Twitter/X read-only を使う場合

`twitter-cli` が必要です。認証はブラウザ cookies 抽出が推奨です。

```bash
uv tool install twitter-cli
twitter whoami
```

環境変数を使う場合は `config/.env` に以下を置けます。`devinit.sh` はこのファイルから `TWITTER_AUTH_TOKEN` / `TWITTER_CT0` / `TWITTER_BIN` だけを安全に読み込みます。

```bash
TWITTER_AUTH_TOKEN=...
TWITTER_CT0=...
```

### 1.6 Reach layer を使う場合

Web / RSS / Reddit は追加設定なしで使えます。YouTube は metadata fallback だけなら追加設定なし、字幕断片まで読みたい場合は `yt-dlp` を入れて `YTDLP_BIN` か `python/.venv/bin/yt-dlp` を使える状態にします。

```bash
uv tool install yt-dlp
```

### 2. TradingView Desktop を CDP 付きで起動

Windows（current default: `9222`）:

```cmd
"%LOCALAPPDATA%\TradingView\TradingView.exe" --remote-debugging-port=9222
```

必要なら次も試してください。

```cmd
"%LOCALAPPDATA%\TradingView\TradingView.exe" --remote-debugging-port=9222 --remote-debugging-address=0.0.0.0
```

現在この環境で検証済みの startup-first 手順:

1. Windows local `9222` を先に確認する
2. 応答しなければ `C:\TradingView\TradingView.exe - ショートカット.lnk` で起動する
3. その後に WSL から `172.31.144.1:9223` を確認する

Windows local の確認:

```powershell
powershell.exe -NoProfile -Command "Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9222/json/list | Select-Object -ExpandProperty Content"
```

未起動なら current verified shortcut で起動:

```powershell
powershell.exe -NoProfile -Command "Start-Process -FilePath 'C:\TradingView\TradingView.exe - ショートカット.lnk'"
```

> 現行運用は **Windows 側の `9222` 個体を起動し、WSL からは Windows host IP 経由の `9223` に接続** です。`localhost` が届かない場合があるため、WSL では通常 `172.31.144.1:9223` のような Windows host IP を使います。`9223` が応答しない場合、CLI の default は他ポートへ暗黙フォールバックしません。

### 3. WSL から Windows 側 CDP へ接続

WSL から `localhost:<port>` に届かない場合があります。  
このケースではまず Windows 側の CDP port が **127.0.0.1 のみに bind** されていないか確認してください。

WSL 側の候補 IP:

```bash
grep nameserver /etc/resolv.conf
ip route
```

接続先を指定:

```bash
export TV_CDP_HOST=<windows-host-ip>
export TV_CDP_PORT=9223
curl http://$TV_CDP_HOST:$TV_CDP_PORT/json/list
```

> `curl` が通らない場合は、Windows Firewall 許可か `portproxy` が必要です。

直近の実機確認例:

```bash
export TV_CDP_HOST=172.31.144.1
export TV_CDP_PORT=9223
curl http://172.31.144.1:9223/json/list
```

### 4. Copilot CLI の MCP 設定

```json
{
  "mcpServers": {
    "oh-my-tradingview": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/Oh-MY-TradingView/src/server.js"],
        "env": {
          "TV_CDP_HOST": "172.x.x.x",
          "TV_CDP_PORT": "9223"
        }
      }
    }
}
```

## 環境変数

| 変数 | デフォルト | 説明 |
|---|---|---|
| `TV_CDP_HOST` | `localhost` | CDP host。WSL では Windows host IP を指定 |
| `TV_CDP_PORT` | `9222` | CDP port。WSL からは通常 `9223` を使う |
| `TV_WINDOWS_USER` | unset | WSL で browser fallback の Windows user 候補を明示したいときに指定 |
| `TWITTER_AUTH_TOKEN` | unset | Twitter/X read-only 用の auth_token |
| `TWITTER_CT0` | unset | Twitter/X read-only 用の ct0 |
| `TWITTER_BIN` | unset | `twitter-cli` バイナリを明示したい場合に指定 |
| `YTDLP_BIN` | unset | `reach_read_youtube` で `yt-dlp` の場所を明示したい場合に指定 |

## 使い方

### CLI

接続確認:

```bash
node src/cli/index.js status
```

WSL からの既定例:

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
```

現在チャートの価格:

```bash
node src/cli/index.js price get
```

NVDA に切り替えて価格取得:

```bash
node src/cli/index.js price get --symbol NVDA
```

Pine 解析:

```bash
node src/cli/index.js pine analyze --file ./example.pine
```

NVDA 5/20 MA クロス バックテスト:

```bash
node src/cli/index.js backtest nvda-ma
```

WSL からの既定例:

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma
```

### Python night batch

夜間自動化は **Python が WSL 側の `9223` 接続を preflight し、TradingView 操作本体は既存 Node script を subprocess 実行する** 構成を想定しています。CDP/backtest 本体を Python に再実装しません。

```bash
# US/JP 12x10 bundle を smoke -> full foreground で監視実行
python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-foreground-reuse-config.json

# ローカル都合で detached 実行したい場合はこちら
python3 python/night_batch.py smoke-prod --config config/night_batch/bundle-detached-reuse-config.json

# JSON config を読んで startup check -> smoke -> detached production
python3 python/night_batch.py smoke-prod --config config/night_batch/nightly.default.json

# strategy だけ一時的に差し替えたい場合は CLI override も可能
python3 python/night_batch.py smoke-prod \
  --config config/night_batch/nightly.default.json \
  --smoke-cli "backtest nvda-ma"

# runner / wrapper 用の事前確認
python3 python/night_batch.py smoke-prod --config config/night_batch/nightly.default.json --dry-run

# fine-tune bundle を夜間実行
python3 python/night_batch.py bundle --host 172.31.144.1 --port 9223

# bundle 後に rich report まで一続きで実行
python3 python/night_batch.py nightly --host 172.31.144.1 --port 9223

# 朝の report だけ再生成
python3 python/night_batch.py report \
  --us results/campaigns/next-long-run-us-finetune-100x10/full/recovered-results.json \
  --jp results/campaigns/next-long-run-jp-finetune-100x10/full/recovered-results.json \
  --out results/night-batch/morning-report.md
```

`config/night_batch/bundle-foreground-reuse-config.json` は、`next-long-run-us-12x10` / `next-long-run-jp-12x10` campaign を参照して **smoke から full を foreground で完走監視する** workflow / wrapper 向け config です（旧既定は `finetune-100x10`）。  
`config/night_batch/bundle-detached-reuse-config.json` は、ローカル都合で detached 実行を明示したいときの代替 config として残します。

`config/night_batch/nightly.default.json` は single-backtest ベースのサンプルです。日中に戦略案を差し替えたいときは、この JSON の `strategies.smoke.cli` / `strategies.production.cli` を更新するか、CLI override を使います。

`smoke-prod` は **Windows local `9222` の startup check** を先に行い、TradingView chart target が見つからなければ current verified shortcut `C:\TradingView\TradingView.exe - ショートカット.lnk` を使って launch します。その後に **WSL `9223` の preflight** を通し、smoke backtest を実行します。config の `detach_after_smoke: false` なら production を foreground で最後まで監視し、`bundle-foreground-state.json` の `updated_at` を heartbeat として更新します。`detach_after_smoke: true` のときだけ detached child を使います。

Python スクリプトは `results/night-batch/` に run summary / log / state を残します。`bundle` / `campaign` / `recover` / `report` / `nightly` / `smoke-prod` をサポートし、CDP が必要なコマンドでは 9223 preflight が通らない限り停止します。summary JSON / Markdown には `termination_reason`、`failed_step`、`last_checkpoint` が含まれます。

### Self-hosted GitHub Actions / Windows manual entrypoint

> **runner の service mode（サービスモード）は使用しない。** 現在使用している Windows OS バージョン / 実行環境では service mode 前提の運用を安定してサポートできないため、runner は手動で `run.cmd` を起動する前提で運用する。

#### Runner 起動（bootstrap 付き）

runner を起動する際は、`run.cmd` を直接叩く代わりに repo 管理の bootstrap wrapper を使う。bootstrap は `git safe.directory` 設定など、`actions/checkout` が失敗しないための prerequisite fix を先に実行し、成功時のみ `run.cmd` へ進む。

```cmd
scripts\windows\run-self-hosted-runner-with-bootstrap.cmd C:\actions-runner
```

初回セットアップ（one-time hookup）: 従来 `C:\actions-runner\run.cmd` を直接実行していた運用を、上記 wrapper 呼び出しに一度だけ置き換える。以後の prerequisite fix 更新は repo 側 script の更新で追従できる。

#### Runner 自動起動（Task Scheduler）

再起動後も runner を自動で online に戻したい場合は、**service mode ではなく Task Scheduler** を使う。標準 trigger は **runner 用 Windows ユーザーの logon 時**で、登録 script が **Task Scheduler 用 launcher** と **runner 配下の self-contained startup script copy** を生成する。

```cmd
scripts\windows\register-self-hosted-runner-autostart.cmd C:\actions-runner
```

- 登録先は `run.cmd` 直呼びではなく、生成される `C:\actions-runner\_diag\runner-autostart-launch.cmd`
- launcher の中から `C:\actions-runner\_diag\run-self-hosted-runner-with-bootstrap.cmd` を呼ぶ
- bootstrap も `C:\actions-runner\_diag\bootstrap-self-hosted-runner.cmd` に複製して live checkout 非依存にする
- trigger は **Task Scheduler / ONLOGON / 30 秒 delay**
- 実行ログは `C:\actions-runner\_diag\runner-autostart.log`
- 解除は `schtasks /Delete /TN "OhMyTradingViewRunnerAutostart" /F`
- 確認は `schtasks /Query /TN "OhMyTradingViewRunnerAutostart" /V /FO LIST`

もし `register-self-hosted-runner-autostart.cmd` 実行時に `楳笏...` のような文字化けしたコマンドエラーが出る場合は、**古い UTF-8 / 非 ASCII コメント入り script が live checkout に残っている**可能性が高い。最新 `main` に更新したうえで再実行する。

> **注意:** この方式は Windows の **自動ログオン** または対象ユーザーのログインを前提とする。  
> reboot だけで完全無人復旧するかどうかは OS 側の auto-logon 設定に依存し、repo だけでは保証しない。

#### Night batch manual launch

Windows Command Prompt からは次で同じ config を使えます。

```cmd
scripts\windows\run-night-batch-self-hosted.cmd config\night_batch\bundle-foreground-reuse-config.json
```

`.github/workflows/night-batch-self-hosted.yml` は **self-hosted Windows runner** 前提です。runner が online であれば動作し、service 常駐は前提としません。既定の cron は **毎日 00:00 JST**（`0 15 * * *` UTC）で、既定 config は `config/night_batch/bundle-foreground-reuse-config.json` です。workflow は smoke と production を **完了まで監視**し、GitHub Actions 上の success/failure が production の完了結果と一致するようにします。workflow では `actions/checkout` を **`clean: false`** にしつつ、終了時に **`GITHUB_STEP_SUMMARY`** へ要約を追記し、`actions/upload-artifact` で最新 round の成果物を回収します。**00:00 JST の起動窓を外れた stale scheduled run は skip** します。

workflow / manual wrapper の foreground 実行経路では `--round-mode` を使うため、state file は `results/night-batch/roundN/bundle-foreground-state.json` に配置されます。state の `updated_at` が heartbeat、summary JSON の `termination_reason` / `failed_step` / `last_checkpoint` が GitHub 側の切り分け根拠になります。hard reboot / power loss では最後の summary / artifact upload が完了しない可能性は残ります。

workflow の summary / artifact 周りの PowerShell ロジックは `scripts/windows/github-actions/` 配下の外部スクリプトに分離しています。inline PowerShell の構文エラーで workflow が failure になった事例と対策は [run 8 レポート](docs/reports/night-batch-self-hosted-run8.md) を参照してください。

foreground monitoring へ切り替えた理由は、旧 detached 方式では **workflow success と production 完了が一致せず、runner cleanup / reboot 後に stale state が残り得た**ためです。現在は workflow の完了を production 完了結果に合わせ、Task Scheduler autostart も `C:\actions-runner\_diag\` 配下の launcher / wrapper copy / bootstrap copy を使うことで live checkout 非依存にしています。

Windows runner script は `cmd.exe` の文字コード解釈差を避けるため **ASCII-only の `.cmd`** に統一し、checkout 時も `.gitattributes` の `*.cmd text eol=crlf` で CRLF を強制しています。`楳笏...` のような文字化けや `schtasks` の quoting 崩れが出た場合は、まず最新 `main` を pull してから autostart 登録をやり直します。

#### 次 strategy 更新ポリシー（live checkout 保護）

> **foreground workflow の完了は production 完了まで追跡した結果を表す。** ただし active な workflow job / runner が live checkout を使っている間は、引き続き live checkout を編集しない。

次 strategy を考えたい / 更新したいと言われたら、まず **self-hosted runner / workflow job が現在 live checkout を使っていないか** を確認する。foreground 監視では workflow が production 完了まで待つため、workflow 終了後は **`GITHUB_STEP_SUMMARY` / artifact / `results/night-batch/roundN/bundle-foreground-state.json`** を見れば完了理由を追えます。

active な self-hosted runner / detached night-batch がある間は、**live checkout を編集しない**。特に以下のファイルは mid-run 変更の影響が大きい：

- `config/backtest/strategy-presets.json`
- `config/night_batch/bundle-foreground-reuse-config.json`
- `config/backtest/` 配下の strategy / backtest 入力

次ラウンド向けの strategy / config を準備する場合は、**別の worktree / clone / branch で次の変更を準備し**、現在の live checkout とは分離する。

1. self-hosted runner / workflow job が live checkout を使用中でないことを確認する
2. 最新 run の **`GITHUB_STEP_SUMMARY` / artifact / `results/night-batch/roundN/bundle-foreground-state.json`** を確認し、workflow が production 完了まで監視した結果を確認する
3. live checkout に差分を反映する
4. `advance-next-round` を明示して次 run を開始する

詳細な手順は [command.md § 次 strategy 更新手順](command.md#次-strategy-更新手順live-checkout-保護) を参照。

preset-driven バックテスト:

```bash
node src/cli/index.js backtest preset ema-cross-9-21 --symbol NVDA
```

> `config/backtest/strategy-presets.json` にある preset 全部が repo CLI でそのまま実行できるわけではありません。  
> 現在の CLI は `buildResearchStrategySource()` で組み立て可能な preset のみを実行します。

### Dual-worker parallel backtest

2026-04-06 時点の known-good dual-worker 構成では、以下を確認済みです。

- worker1: Windows `9222` -> WSL `9223`
- worker2: Windows `9224` -> WSL `9225`
- worker1 / worker2 individual preset backtest success
- warmed parallel distinct preset backtest 3 ラウンド連続 success

現在の主要な安定条件は次の 2 点です。

- `restore_policy: "skip"` を前提に、backtest-applied strategy をチャート上に残す
- Strategy Tester の `指標` タブを明示活性化できる構成で動かす

運用コマンドは `command.md`、known-good 条件と制約は
`docs/design-docs/dual-worker-parallel-backtest-runbook_20260406_0735.md`
を参照してください。

> docs 上で known-good として確認できているのは **dual-worker / 2 worker 並列** までです。  
> `shard parallel` はこの 2 worker 前提の運用方針であり、4並列は未検証です。

> **pane/tab support との関係**: `tv_tab_*` / `tv_pane_*` は現在 layout 内の chart slot 操作であり、
> 現在の backtest フローは active-chart-only です。pane/tab は切替短縮・比較レイアウトの補助導線
> として有用ですが、true parallel backtest は上記 dual-worker ベースです。

### Phase 1 experiment gating campaign

`config/backtest/campaigns/external-phase1-priority-top.json` は、既存の campaign/backtest 出力を壊さずに
**候補の gate 判定と順位付けだけ**を追加する Phase 1 用の campaign です。

- 対象: cross-market 100 universe × 優先 5 preset
- 追加 artifact: `results/campaigns/<campaign-id>/<phase>/gated-summary.json`
- 追加 artifact: `results/campaigns/<campaign-id>/<phase>/ranked-candidates.json`
- 追加 artifact: `results/campaigns/<campaign-id>/<phase>/market-intel-snapshots.json`
- 判定: `promote` / `hold` / `reject`
- `gated-summary.json` / `ranked-candidates.json` の各 candidate には additive に `confluence_snapshot` / `provider_status` / `community_snapshot` が付きます。

詳細な運用コマンドは `command.md` を参照してください。

### MCP workflow

1. `tv_health_check`
2. `tv_get_price`
3. `tv_get_price` with `symbol: "NVDA"` if you need a specific symbol
4. `pine_set_source`
5. `pine_smart_compile`
6. `pine_get_errors`

### Backtest workflow

1. `tv_backtest_nvda_ma_5_20` — NVDA に切替 → 5/20 MA クロス戦略を compile → Strategy Tester 読み取り
 - 成功時: `success: true`, `tester_available: true`, `metrics: { ... }`
 - Tester 読み取り不可時: `success: true`, `tester_available: false`, `tester_reason: "..."`
 - Fallback 使用時: `fallback_source: "chart_bars_local"`, `fallback_metrics: { ... }`
 - compile エラー時: `success: false`, `compile_errors: [...]`

## テスト

```bash
npm test
npm run test:e2e
npm run test:all
```

E2E は CDP が見つからない場合に skip されます。  
WSL 環境では `TV_CDP_HOST` と必要なら `TV_CDP_PORT` を設定してから実行してください。

## 制約

- TradingView の内部 DOM / API 依存なので、Desktop 更新で壊れる可能性があります
- 価格取得は `bars()` → `last_value()` → DOM の順に試します
- WSL2 では Windows 側が `127.0.0.1:<port>` にしか bind していないと接続できません
- バックテストの Strategy Tester 読み取りは DOM 依存のため、TradingView UI 更新で壊れる可能性があります
- Strategy Tester にストラテジーが載らない場合は、現在チャートの bars から local fallback を計算します
- バックテストは現在 NVDA 固定 / 5&20 SMA クロス固定です
- dual-worker 並列バックテストは warmed state で安定化済みですが、fresh cold start 直後の再現性は未検証です

```bash
# Unit tests (no TradingView needed)
npm test

# E2E tests (requires TradingView Desktop with CDP)
# In WSL, set TV_CDP_HOST and TV_CDP_PORT first
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 npm run test:e2e

# All tests
npm run test:all
```

## Architecture

```
src/
  server.js          # MCP server entry point (stdio transport)
  connection.js      # CDP connection, target discovery, host resolution
  core/
    health.js        # Health check, API discovery, reusable page-state collection
    pine.js          # Pine Editor operations, static analysis
    price.js         # Current price retrieval (chart API + DOM fallback)
    backtest.js      # NVDA 5/20 MA cross backtest orchestration
    observability.js # One-shot observability snapshot orchestration
    browser-launch.js # Chromium browser fallback launch (bounded, CDP debug port)
    workspace.js     # Watchlist, pane, tab, layout CDP operations
    alerts.js        # Local price alert list/create/delete via CDP
    market-intel.js  # Yahoo Finance: quotes, fundamentals, screener, TA/confluence ranking
    market-intel-analysis.js # Deterministic symbol analysis built from market-intel inputs
    market-confluence.js # Pure confluence scoring and coverage helpers
    market-provider-status.js # Provider status / missing_reason / coverage summary helpers
    market-community-snapshot.js # X/Reddit community snapshot aggregation
  tools/
    _format.js       # MCP response formatting
    health.js        # MCP tool registration: tv_health_check, tv_discover
    pine.js          # MCP tool registration: pine_* tools
    price.js         # MCP tool registration: tv_get_price
    backtest.js      # MCP tool registration: tv_backtest_nvda_ma_5_20
    workspace.js     # MCP tool registration: tv_watchlist_*, tv_pane_*, tv_tab_*, tv_layout_*
    alerts.js        # MCP tool registration: tv_alert_*
    observe.js       # MCP tool registration: tv_observe_snapshot
    browser-launch.js # MCP tool registration: tv_launch_browser
  cli/
    index.js         # CLI entry point
    router.js        # Command router (node:util parseArgs)
    commands/
      health.js      # CLI: status, discover
      pine.js        # CLI: pine get/set/compile/errors/analyze
      price.js       # CLI: price get
      backtest.js    # CLI: backtest nvda-ma
      market-intel.js # CLI: market quote/fundamentals/snapshot/news/screener/ta-summary/ta-rank/analysis/confluence-rank
      workspace.js   # CLI: workspace watchlist-*/pane-*/tab-*/layout-*
      alerts.js      # CLI: alert list/create-price/delete
      observe.js     # CLI: observe snapshot
      browser-launch.js # CLI: launch-browser
tests/
  connection.test.js      # Unit: safeString, requireFinite, pickTarget, resolveCdpEndpoint
  pine.analyze.test.js    # Unit: offline Pine static analysis
  price.test.js           # Unit: formatPriceResult, validatePriceData
  backtest.test.js        # Unit: buildNvdaMaSource, normalizeMetrics, buildResult
  observability.test.js   # Unit: snapshot schema, bundle paths, partial-failure handling
  browser-launch.test.js  # Unit: browser fallback path resolution, dry-run, argument validation
  market-intel-analysis.test.js # Unit: deterministic symbol analysis
  market-confluence.test.js # Unit: pure confluence scoring
  market-provider-status.test.js # Unit: provider status classification and coverage summary
  market-community-snapshot.test.js # Unit: X/Reddit community snapshot aggregation
  e2e.pine-loop.test.js   # E2E: full pine loop (skips if no CDP)
  e2e.price.test.js       # E2E: price retrieval (skips if no CDP)
  e2e.backtest.test.js    # E2E: NVDA MA backtest (skips if no CDP)
  e2e.workspace.test.js   # E2E: workspace operations (skips if no CDP)
  e2e.alerts.test.js      # E2E: alert operations (skips if no CDP)
  e2e.observability.test.js # E2E: observability snapshot (skips if no CDP)
  workspace.test.js       # Unit: workspace CDP operations with mocks
  alerts.test.js          # Unit: alert CDP operations with mocks
```

## Safety

- **Target allowlist**: only connects to `page` targets matching `tradingview.com`
- **safeString**: JSON.stringify-based escaping for CDP evaluate injection
- **requireFinite**: blocks NaN/Infinity from reaching TradingView APIs
- **Local-only**: no external network calls (except TradingView's own in-app)

## License

MIT
