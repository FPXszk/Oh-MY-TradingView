# WSL to Windows Native Migration Plan

作成日時: 2026-06-19 22:44 JST

## 目的

現在の Windows + WSL 前提運用を、可能な限り Windows ネイティブへ移す。主目的は `vmmemWSL` 約 2.9GB の常駐メモリを解放しつつ、TradingView CDP 操作、night batch、daily screener、portfolio/SBI/moomoo レポート、LINE 通知を壊さないこと。

## 変更予定ファイル

この計画書は、実装前の調査・移行計画であり、まだコードは変更しない。

実装時に変更候補となるファイル:

- `README.md`
- `.codex/config.toml`
- `.github/workflows/night-batch-self-hosted.yml`
- `.github/workflows/night-batch-smoke.yml`
- `.github/workflows/daily-screener.yml`
- `.github/workflows/daily-screener-japan.yml`
- `.github/workflows/moomoo-portfolio-diagnostics.yml`
- `.github/workflows/portfolio-health-check.yml`
- `.github/workflows/sbi-portfolio-capture.yml`
- `scripts/windows/run-night-batch-self-hosted.cmd`
- `scripts/windows/github-actions/sync-daily-screener-report-to-wsl.ps1`
- `scripts/windows/github-actions/sync-portfolio-reports-to-wsl.ps1`
- `scripts/backtest/ensure-tradingview-recovery.sh`
- `scripts/backtest/run-finetune-bundle.mjs`
- `scripts/sbi/build-portfolio-report.mjs`
- `python/night_batch.py`
- `src/connection.js`
- `src/core/launch.js`
- `src/core/browser-launch.js`
- `src/server.js`
- `src/tools/*.js` の WSL 向けヒント文
- `config/night_batch/*.json`
- `config/backtest/campaigns/*.json`
- `tests/connection.test.js`
- `tests/night-batch.test.js`
- `tests/tradingview-readiness.test.js`
- `tests/campaign.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`

削除候補:

- なし。まず Windows ネイティブ経路を追加・置換し、WSL 経路の削除は検証後に行う。

## 実装ステップ

- [x] Phase 0: 現状バックアップとメモリ・workflow 成功状態を計測する
- [x] Phase 1: Windows ネイティブ開発環境を準備し、Node/Python/Git/Codex CLI を確認する
- [x] Phase 2: CDP 不要の通常 CLI、market/reach/x read-only、LINE dry run を Windows で確認する
- [x] Phase 3: TradingView CDP を `127.0.0.1:9222` 直結に切り替える
- [x] Phase 4: night batch wrapper から `wsl.exe bash -lc` を除去する
- [x] Phase 5: self-hosted workflow の WSL publish と WSL 実行を Windows native に置換する
- [x] Phase 6: Windows 移行テストを追加・更新し、CDP あり/なしで検証を分ける
- [x] Phase 7: `wsl --shutdown` は実行せず、WSL 起動維持のまま Windows native workflow で代替確認する
- [x] Phase 8: README と運用 docs を Windows native 前提へ更新する

## 調査対象と根拠

確認した主な対象:

- `README.md`
- `package.json`
- `.github/workflows/*.yml`
- `scripts/`
- `scripts/windows/`
- `python/`
- `src/`
- `config/`
- `tests/`
- `docs/` の運用・構成・workflow・TradingView・Windows/WSL 関連
- `.codex/config.toml`, `.gitignore`, `.gitattributes`

検索キーワードは依頼にある `wsl`, `wsl.exe`, `wslpath`, `bash -lc`, `python3`, `/home/`, `/mnt/c`, `REPO_WSL`, `WSL_REPO_PATH`, `172.31.`, `9223`, `9222`, `localhost`, `127.0.0.1`, `TradingView`, `CDP`, `cmd`, `pwsh`, `powershell`, `.ps1`, `.cmd`, `.sh`, `chmod`, `rm -rf`, `cp`, `mv`, `grep`, `sed`, `awk`, `find`, `mktemp`, `ls`, `cat`, `curl`, `python/night_batch.py`, `node scripts/`, `npm ci`, `npm run`, `self-hosted`, `windows`, `ubuntu`, `linux` を中心に実施した。生成済み artifact と `node_modules` は移行対象コードではないため、依存表からは除外する。

## 現状構成

主要機能:

- TradingView Desktop を CDP で操作する MCP/CLI (`src/server.js`, `src/cli/index.js`)
- Pine source 取得・compile・backtest・capture・workspace・alert・observability
- TradingView Scanner API/Yahoo Finance/外部 Web/RSS/Reddit/YouTube/X read-only による market/reach 調査
- `python/night_batch.py` による夜間 backtest orchestration
- GitHub Actions self-hosted Windows runner による night batch / screener / portfolio 実行
- screener レポート生成と LINE Messaging API 通知
- SBI capture、moomoo portfolio diagnostics、統合 portfolio report 生成

Node.js:

- `package.json` は Node 20+ 前提。`npm run tv`, `npm run test:unit`, `npm run test:night-batch`, `npm run test:e2e` を定義。
- `src/` は CDP/MCP/CLI 本体。`scripts/` は screener、backtest、SBI、moomoo、LINE、docs archive を担当。

Python:

- `python/night_batch.py` が night batch 本体。Node CLI を `subprocess` で呼び出す。
- `python/moomoo_adapter.py` が moomoo OpenAPI adapter。
- `scripts/generate-*.py` は backtest campaign/config 生成補助。

PowerShell:

- `.github/workflows/*` の validation、SBI capture、portfolio report、summary 出力。
- `scripts/windows/github-actions/*.ps1` が workflow summary、output discovery、WSL publish、live checkout baseline を担当。
- `scripts/windows/focus-chrome-window.ps1` が Chrome/SBI 画面 focus 補助。

cmd:

- `scripts/windows/run-night-batch-self-hosted.cmd` が Windows runner 入口。ただし中身は WSL 起動に強く依存。
- `scripts/windows/bootstrap-self-hosted-runner.cmd`, `run-self-hosted-runner-with-bootstrap.cmd`, `register-self-hosted-runner-autostart.cmd` が runner 起動と Task Scheduler 登録を担当。

WSL/bash/Linux 依存:

- night batch workflow と wrapper は `wsl.exe wslpath` + `wsl.exe bash -lc` で WSL checkout に入り、`npm ci`, `python3`, `node` を実行する。
- publish scripts は Windows checkout の成果物を WSL checkout へ `cp` し、WSL 側で `git commit` / `git push` する。
- recovery helper は `.sh` と Linux tool (`pgrep`, `grep`) 前提。

TradingView/CDP:

- Node default は Windows native では `localhost:9222`、WSL では `172.31.144.1:9223` (`src/connection.js:3-6`, `src/connection.js:45-52`)。
- night batch config は全て runtime host `172.31.144.1`, port `9223`、startup check は `127.0.0.1:9222`。
- `scripts/windows/register-self-hosted-runner-autostart.cmd` は Task Scheduler launcher 内で `127.0.0.1:9222/json/list` を確認し、TradingView を `--remote-debugging-port=9222` で起動する。

GitHub Actions self-hosted:

- 全 workflow が `runs-on: [self-hosted, windows]`。
- night batch 系だけ WSL workspace に依存して実行。
- screener/portfolio 系は Node/Python 実行自体は Windows だが、成功後の publish は WSL main checkout に依存。

レポート保存:

- night batch: `artifacts/night-batch/`, `artifacts/campaigns/`, `docs/research/current/`, `references/backtests/`
- screener: `docs/reports/screener/daily-ranking*.md`, `daily-ranking*-run.json`
- portfolio/SBI/moomoo: `docs/reports/screener/portfolio/`
- workflow artifact: `actions/upload-artifact@v4`

外部取得:

- TradingView Scanner API: `src/core/market-intel.js`, `src/core/fundamental-screener.js`
- Yahoo Finance: market quote/news/chart 系
- X/Twitter: local `twitter-cli` read-only
- reach: Web/RSS/Reddit/YouTube read-only
- moomoo: OpenD host/port + `moomoo-api`
- LINE: `scripts/line/send-screener-line-message.mjs`

## WSL依存箇所一覧

| ファイルパス | 行番号 | 該当コード/設定 | WSL依存の種類 | Windows移行時の問題 | 修正方針 | 優先度 | 破壊リスク | テスト方法 |
|---|---:|---|---|---|---|---|---|---|
| `README.md` | 4 | Windows + WSL を主軸 | 運用前提 | docs が現運用と逆方向 | Windows native を主経路、WSL を legacy に変更 | Mid | Low | docs review |
| `README.md` | 316-345 | `172.31.144.1:9223`, `curl` | CDPブリッジIP依存 | 新運用の接続先が誤案内になる | `127.0.0.1:9222` を主経路へ | High | Low | README 手順で疎通 |
| `README.md` | 570-610 | `python3`, WSL `9223` preflight | Python実行名/CDP依存 | night batch を Windows で起動できない | `py -3`/`python`, host `127.0.0.1`, port `9222` に更新 | High | Low | smoke-prod dry run |
| `.codex/config.toml` | 7-28 | `/home/...`, `TV_CDP_HOST=172.31.144.1`, `9223` | Linuxパス/CDP依存 | Windows Codex CLI から server path と CDP が不正 | Windows 用 MCP 設定を追加または docs 化 | High | Mid | `codex mcp` / `tv status` |
| `.github/workflows/night-batch-self-hosted.yml` | 22-27 | Install dependencies in WSL workspace | WSLコマンド実行依存 | WSL 停止時に workflow が即失敗 | `npm ci --silent` を Windows checkout で実行 | High | Mid | workflow_dispatch smoke |
| `.github/workflows/night-batch-self-hosted.yml` | 85-97 | readiness diagnostics の `wsl.exe bash -lc python3 -c` | WSL/bash/Python実行名依存 | 診断が WSL 前提、host/port も 9223 | pwsh または Node script に置換 | High | Mid | readiness step log |
| `.github/workflows/night-batch-self-hosted.yml` | 102-109 | wait gate の `wsl.exe bash -lc node ...` | WSLコマンド実行依存 | gate が Windows runner checkout を使わない | `node scripts/backtest/wait-for-tradingview-readiness.mjs` を直接実行 | High | Mid | connection gate |
| `.github/workflows/night-batch-self-hosted.yml` | 112-145 | `scripts\windows\run-night-batch-self-hosted.cmd` | wrapper依存 | wrapper 内で WSL 起動 | wrapper Windows native 化後に継続 | High | High | full workflow |
| `.github/workflows/night-batch-self-hosted.yml` | 175-187 | archive/docs archive via WSL | WSLコマンド実行依存 | 後処理が WSL 停止時に失敗 | Windows Python/Node 直接実行 | High | Mid | archive outputs |
| `.github/workflows/night-batch-smoke.yml` | 22-27 | Install dependencies in WSL workspace | WSLコマンド実行依存 | smoke workflow が WSL 前提 | Windows checkout で `npm ci` | High | Mid | smoke workflow |
| `.github/workflows/night-batch-smoke.yml` | 80-114 | readiness/gate/smoke via WSL | WSL/bash/Python実行名依存 | smoke の実行自体が WSL 停止で不可 | pwsh/cmd direct run に置換 | High | High | smoke workflow |
| `.github/workflows/daily-screener.yml` | 12,78-83 | `WSL_REPO_PATH`, Publish to WSL main | artifact/report保存先依存 | 成功後 publish が WSL 側 repo 必須 | Windows checkout で commit/push する publish script へ置換 | High | Mid | screener workflow |
| `.github/workflows/daily-screener-japan.yml` | 12,80-85 | `WSL_REPO_PATH`, Publish to WSL main | artifact/report保存先依存 | 同上 | 同上 | High | Mid | Japan screener workflow |
| `.github/workflows/moomoo-portfolio-diagnostics.yml` | 45,103-108 | `WSL_REPO_PATH`, publish script | artifact/report保存先依存 | portfolio diagnostics publish が WSL 必須 | Windows native publish | High | Mid | workflow + artifact diff |
| `.github/workflows/portfolio-health-check.yml` | 77,227-240 | `WSL_REPO_PATH`, publish script | artifact/report保存先依存 | 統合 portfolio report publish が WSL 必須 | Windows native publish | High | Mid | full portfolio workflow |
| `.github/workflows/sbi-portfolio-capture.yml` | 37,126-131 | `WSL_REPO_PATH`, publish script | artifact/report保存先依存 | SBI report publish が WSL 必須 | Windows native publish | High | Mid | SBI workflow |
| `scripts/windows/run-night-batch-self-hosted.cmd` | 10 | `wsl.exe wslpath` | WSLコマンド実行依存 | REPO_WSL 解決不可 | `REPO_WIN` をそのまま作業 dir に使う | High | High | wrapper unit + manual |
| `scripts/windows/run-night-batch-self-hosted.cmd` | 22 | `wsl.exe bash -lc ... python3 ... archive-rounds` | WSL/bash/Python実行名依存 | archive が不可 | `python python\night_batch.py archive-rounds` | High | Mid | manual archive |
| `scripts/windows/run-night-batch-self-hosted.cmd` | 29-31 | `ls`, `mktemp`, `$?`, `cat`, `grep` | Linuxコマンド/bash構文依存 | resume fallback ロジックが cmd で動かない | PowerShell helper か Python 側に移す | High | High | fingerprint mismatch test |
| `scripts/windows/run-night-batch-self-hosted.cmd` | 35-37 | `wsl.exe bash -lc ... smoke-prod` | WSLコマンド実行依存 | night batch 本体が WSL 停止時に不可 | Windows Python で直接実行 | High | High | smoke/full dry run |
| `scripts/windows/run-night-batch-self-hosted.cmd` | 43 | post-run archive via WSL | WSLコマンド実行依存 | manual 実行後 cleanup 不可 | Windows Python 直接実行 | High | Mid | local manual |
| `scripts/windows/github-actions/sync-daily-screener-report-to-wsl.ps1` | 30-45 | `Invoke-WslStrict`, `wslpath` | WSLコマンド実行依存 | publish 全体が WSL 必須 | Windows native `git add/commit/push` script に置換 | High | High | workflow publish |
| `scripts/windows/github-actions/sync-daily-screener-report-to-wsl.ps1` | 84-93 | WSL git/pull/cp/commit/push | Linuxコマンド/Git依存 | WSL main checkout 二重管理 | runner checkout で main push、または artifact PR 化 | High | High | no-change/change publish |
| `scripts/windows/github-actions/sync-portfolio-reports-to-wsl.ps1` | 29-44 | `Invoke-WslStrict`, `wslpath` | WSLコマンド実行依存 | 同上 | 共通 Windows publish helper へ統合 | High | High | portfolio publish |
| `scripts/windows/github-actions/sync-portfolio-reports-to-wsl.ps1` | 95-138 | `test`, `grep`, `mkdir -p`, `rm -rf`, `cp -R`, WSL git | Linuxコマンド依存 | directory sync と git 操作が WSL 必須 | `Copy-Item -Recurse`, `Remove-Item`, Windows git | High | High | directory copy + commit |
| `python/night_batch.py` | 47-51 | default `172.31.144.1:9223`, shortcut path | CDPブリッジIP依存 | Windows native でも WSL bridge を見に行く | default を `127.0.0.1:9222` に変更、legacy config で上書き可 | High | Mid | night-batch unit |
| `python/night_batch.py` | 60,326 | default recovery `.sh` | bash構文依存 | Windows Python から `.sh` helper が動かない | `.ps1`/Node recovery helper を追加 | High | Mid | recovery path test |
| `python/night_batch.py` | 331 | "WSL-first orchestrator" | docs/環境変数依存 | ヘルプが逆 | Windows-first に更新 | Low | Low | CLI help |
| `scripts/backtest/ensure-tradingview-recovery.sh` | 1-120 | shell script, `pgrep`, `grep`, `tasklist.exe` | bash/Linuxコマンド依存 | Windows native から直接使いにくい | `ensure-tradingview-recovery.ps1` または Node 化 | Mid | Mid | recovery test |
| `scripts/backtest/run-finetune-bundle.mjs` | 189-190 | default `172.31.144.1`, `9223` | CDPブリッジIP依存 | direct Windows run が WSL port を見る | default `127.0.0.1`, `9222` | Mid | Mid | campaign dry run |
| `scripts/backtest/run-finetune-bundle.mjs` | 261 | WSL exposure hint | docs依存 | 誤案内 | Windows direct hint に変更 | Low | Low | test snapshot |
| `scripts/sbi/build-portfolio-report.mjs` | 7 | `/mnt/c/Users/szk/Downloads` | Linuxパス依存 | Windows で default download dir 不正 | `%USERPROFILE%\Downloads` 相当へ OS 分岐 | Mid | Mid | report load test |
| `src/connection.js` | 5-6 | WSL default host/port | CDPブリッジIP依存 | WSL を残す場合は有効、完全 Windows では legacy | 当面残し、docs と tests で Windows default を主にする | Mid | Low | connection tests |
| `src/core/launch.js` | 39-43 | WSL から Windows app path 探索 | WSL/Windows二重依存 | 完全 Windows では不要だが互換用 | 削除は後段。まず legacy として維持 | Low | Low | launch tests |
| `src/core/browser-launch.js` | 37-46,159-170 | `/mnt/c` browser candidates | WSL path依存 | 完全 Windows では不要だが fallback 用 | legacy として維持、docs は Windows direct | Low | Low | browser launch tests |
| `src/server.js` | 136 | WSL hint | docs依存 | 誤案内 | hint 更新 | Low | Low | unit/doc |
| `src/tools/health.js` | 19 | WSL hint | docs依存 | 誤案内 | hint 更新 | Low | Low | unit/doc |
| `src/tools/observe.js` | 61 | WSL hint | docs依存 | 誤案内 | hint 更新 | Low | Low | unit/doc |
| `src/tools/launch.js` | 8 | WSL port 9223 hint | docs依存 | 誤案内 | hint 更新 | Low | Low | unit/doc |
| `src/tools/price.js` | 20 | WSL hint | docs依存 | 誤案内 | hint 更新 | Low | Low | unit/doc |
| `config/night_batch/*.json` | 3-4 | `host=172.31.144.1`, `port=9223` | CDPブリッジIP依存 | night batch が Windows local に直結しない | primary config を `127.0.0.1:9222` へ。legacy config は別名保存 | High | High | smoke-prod |
| `config/night_batch/*.json` | 12-13 | `C:\TradingView\...ショートカット.lnk` | TradingView起動方式依存 | 日本語/スペース/shortcut が壊れやすい | `%LOCALAPPDATA%\TradingView\TradingView.exe` 優先、shortcut は fallback | Mid | Mid | launcher probe |
| `config/backtest/campaigns/*.json` | various | `worker_ports: [9223]` | CDPブリッジIP依存 | campaign が 9223 前提 | `worker_ports: [9222]` へ移行、multi worker は別途 | High | Mid | campaign tests |
| `tests/connection.test.js` | 114-215 | WSL default 9223 expectations | テスト依存 | default 更新時に failing | Windows primary と WSL legacy を分けて更新 | Mid | Low | npm test |
| `tests/windows-run-night-batch-self-hosted.test.js` | 42-55 | WSL wrapper 前提 assertions | テスト依存 | wrapper Windows 化で failing | Windows direct assertions に更新 | High | Low | npm run test:night-batch |
| `tests/windows-run-night-batch-self-hosted.test.js` | 771-797 | 9222/9223 両方診断 | テスト依存 | Windows direct 方針とズレ | 9222 primary、legacy 9223 optional に更新 | Mid | Low | npm run test:night-batch |
| `tests/tradingview-readiness.test.js` | 10,362-365,693-725 | `172.31.144.1:9223` fixtures | テスト依存 | error/hint expectation が古い | Windows fixture と WSL fixture を分離 | Mid | Low | npm test |
| `tests/campaign.test.js` | 1299-1305 | default port 9223 | テスト依存 | campaign default 更新で failing | default 9222 に更新 | Mid | Low | npm test |
| `scripts/tmux/run-night-batch-with-recovery.sh` | 1-83 | tmux/bash/python3 | Linux運用依存 | Windows native では不要 | legacy docs へ隔離 | Low | Low | none |
| `docs/strategy/archive/moomoo/*` | various | WSL portproxy 11112 | docs依存 | moomoo Windows direct では古い | archive は履歴として維持、現行 docs に注記 | Low | Low | docs review |

## ボトルネック

- `wsl.exe bash -lc` を消すと壊れる処理: night batch dependency install、readiness diagnostics、wait gate、smoke/full 実行、archive-rounds、docs archive、screener/portfolio publish。
- `python3` 依存: workflow inline diagnostics、wrapper、README 手順、docs archive、shebang。Windows では `python` または `py -3` に寄せる。
- bash 構文: wrapper の `if ls ...`, `mktemp`, `$?`, `cat`, `grep -q`, `exit $?` は PowerShell/cmd へ直訳すると壊れやすい。Python 側に resume fallback を寄せるのが最小リスク。
- パス区切り: repo-relative path は Node/Python では概ね安全だが、PowerShell publish で `/` と `\` を混ぜる。`Join-Path` と `Resolve-Path` に集約する。
- スペース/日本語 path: `C:\TradingView\TradingView.exe - ショートカット.lnk` は quoting と文字コードに弱い。direct exe 優先が安全。
- CDP: `172.31.x.x:9223` から `127.0.0.1:9222` に変えると、config、campaign、tests、readiness、README が同時に影響を受ける。
- `TV_CDP_HOST`/`TV_CDP_PORT`: Node の Windows default は既に `localhost:9222` だが、WSL env が残ると 9223 を見続ける。
- runner cwd: `actions/checkout` の Windows checkout を唯一の作業ディレクトリにする。二重 checkout をやめる代わりに、workflow の push 前に `git pull --ff-only` と dirty check が必要。
- shell 統一: workflow は PowerShell に寄せる。cmd は runner wrapper だけに限定する。
- npm scripts: `&&` は Windows cmd でも動くが、GitHub Actions shell が pwsh になると挙動差がある。CI script は既存のまま、workflow は explicit shell を使う。
- Python Windows 互換: `python/night_batch.py` は `pathlib` と list subprocess が中心で移行しやすい。recovery `.sh` と default host/port が主な障害。
- artifact/archive: Windows publish では `Copy-Item -Recurse -Force`, `Remove-Item -Recurse -Force`, `git add -- <paths>` に置換する。
- ファイルロック: TradingView/Chrome/SBI capture 中のファイルや screenshot 生成直後に Windows lock が残る可能性がある。retry が必要。
- 改行/文字コード: `.cmd` は `.gitattributes` で CRLF 強制済み。PowerShell scripts は UTF-8、cmd は ASCII-only 維持。
- 長時間バッチ: foreground 監視は維持。CDP 切断時 recovery helper を Windows native にしないと復旧できない。
- Task Scheduler: 既に runner autostart は service mode ではなく Task Scheduler。Windows native 化と相性は良い。
- Codex CLI: Windows 版 Codex CLI + Windows path の MCP 設定が必要。VS Code を開かずに CLI だけで動くには `.codex/config.toml` の Windows 例が必要。
- メモリ削減: WSL 常駐停止で `vmmemWSL` 約 2.9GB の解放が見込める。ただし Windows 側 `node.exe`, `python.exe`, `git.exe`, `codex`, TradingView/Chrome の使用量は残る。
- WSL 完全停止条件: `wsl.exe` 呼び出しが workflow/script/docs 主経路から消え、CDP/OpenD/SBI/screener/night batch/report publish が Windows checkout だけで成功すること。

## 移行案比較

| 案 | メモリ削減 | 工数 | 破壊リスク | TradingView安定性 | Actions影響 | デバッグ | 保守性 | おすすめ |
|---|---|---|---|---|---|---|---|---|
| A 完全 Windows native | 最大。`vmmemWSL` 常駐を消せる | 大 | High | direct 9222 で単純化。ただし一斉変更リスク大 | 大 | Windows に集約され楽 | 最終形として良い | 中 |
| B 段階移行 | 中から最大へ段階的 | 中 | Mid | 9222 直結を先に検証できる | 段階的 | 切り戻し容易 | 最も現実的 | 高 |
| C WSL最小化 | 中。必要時だけ WSL 起動 | 小から中 | Mid | 既存 9223 を残せる | 小 | 二重環境が残る | 長期負債が残る | 中 |

推奨は案B。理由は、night batch と publish は破壊リスクが高く、TradingView/CDP と workflow publish を同時に切ると原因切り分けが難しいため。先に Windows direct CDP と通常 CLI を固め、その後 wrapper/workflow/publish を小さく切る。

## Phase計画

### Phase 0: 現状バックアップと計測

- タスクマネージャーで `vmmemWSL`, `node.exe`, `python.exe`, `TradingView.exe`, `chrome.exe`, `codex`, `Runner.Listener` のメモリを記録。
- `gh run list --workflow "Night Batch Self Hosted" --limit 5` などで現在成功している run を記録。
- GitHub Secrets: `EDINET_API_KEY`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_TO_USER_ID` などを存在確認する。値は出力しない。
- rollback: `git revert` で戻せるよう PR 単位で進める。既存 WSL config は legacy として残す。

### Phase 1: Windowsネイティブ開発環境

- Windows Node.js 20+、Python 3、Git for Windows、Codex CLI、ripgrep を確認。
- `npm ci --silent`
- `python --version` または `py -3 --version`
- `git remote get-url origin` が SSH であることを確認。
- PowerShell execution policy は scripts 実行に必要な範囲で `Bypass` を workflow 内指定。
- `.env`/Secrets/token を Windows 環境へ移す。値は repo に書かない。

### Phase 2: 通常CLIのWindows動作確認

- `npm test`
- `npm run test:unit`
- `node src/cli/index.js status` は CDP 起動後に確認。
- CDP 不要: market/reach/x read-only を Windows 側で実行。
- LINE: secrets あり workflow または dry-run 相当を確認。

### Phase 3: TradingView CDP Windows直結

- TradingView を `--remote-debugging-port=9222` で起動。
- `TV_CDP_HOST=127.0.0.1`, `TV_CDP_PORT=9222` を基準にする。
- `node src/cli/index.js status`
- `node src/cli/index.js discover`
- `node src/cli/index.js price get --symbol NVDA`
- `node src/cli/index.js capture`
- `pine_get_source`, `pine_compile`, `backtest` 系を smoke で確認。
- `config/night_batch/*.json` と campaign `worker_ports` を 9222 に移す前に legacy config を退避。

### Phase 4: night batch Windows native化

- `scripts/windows/run-night-batch-self-hosted.cmd` から `wsl.exe` を除去。
- resume fallback は PowerShell 直書きより `python/night_batch.py` に集約する案を優先。
- `python/night_batch.py archive-rounds`
- `python/night_batch.py smoke-prod --config ... --round-mode resume-current-round`
- `advance-next-round`, `--run-id`, `NIGHT_BATCH_SKIP_SMOKE` を維持。
- recovery helper を `.ps1` または Node にする。

### Phase 5: GitHub Actions self-hosted workflow修正

- night-batch workflows の `Install dependencies in WSL workspace` を Windows checkout の `npm ci` に変更。
- readiness diagnostics を pwsh/Node へ置換。
- `WSL_REPO_PATH` と `Publish ... to WSL main` を廃止。
- publish は Windows checkout で `git pull --ff-only origin main`, copy/validate, `git add`, `git commit`, `git push origin main`。
- `shell: pwsh` を基本にし、cmd は runner wrapper だけに限定。

### Phase 6: テストとCI

- 更新必須: `tests/windows-run-night-batch-self-hosted.test.js`, `tests/connection.test.js`, `tests/night-batch.test.js`, `tests/tradingview-readiness.test.js`, `tests/campaign.test.js`。
- CDP 不要 unit: `npm run test:unit`
- night batch unit: `npm run test:night-batch`
- CDP あり manual/e2e: `npm run test:e2e` は TradingView 起動後に実施。
- workflow: `night-batch-smoke`, `night-batch-self-hosted`, `daily-screener`, `daily-screener-japan`, `portfolio-health-check`。

### Phase 7: WSL停止とメモリ確認

- `wsl --shutdown`
- `vmmemWSL` が消えることを確認。
- Windows 側プロセスのメモリを再計測。
- WSL を再起動せずに `npm test`, `tv status`, screener, night-batch smoke が動くことを確認。

### Phase 8: docs更新

- README の主経路を Windows native にする。
- WSL は legacy/troubleshooting に移す。
- night batch、TradingView 起動、Codex CLI、GitHub Actions、rollback 手順を更新。

## PR分割案

| PR | 目的 | 変更ファイル | 影響範囲 | テスト | rollback | リスク |
|---|---|---|---|---|---|---|
| PR1 | Windows CDP 設定を主経路化 | `README.md`, `.codex/config.toml`, `src/connection.js` 周辺 docs/hints, tests | CLI/CDP | `npm test`, `tv status` | docs/config revert | Mid |
| PR2 | night batch config を 9222 対応 | `config/night_batch/*.json`, `config/backtest/campaigns/*.json`, tests | backtest/night batch | `npm run test:night-batch`, smoke-prod dry-run | legacy config restore | High |
| PR3 | `run-night-batch-self-hosted.cmd` の WSL 排除 | wrapper, `python/night_batch.py`, recovery helper, tests | night batch entrypoint | wrapper unit/manual smoke | wrapper revert | High |
| PR4 | workflow の WSL 実行排除 | night-batch workflows | self-hosted CI | `night-batch-smoke` workflow | workflow revert | High |
| PR5 | publish-to-WSL を Windows native publish へ | sync scripts, screener/portfolio workflows, tests | report commit/push | screener/portfolio workflow | publish scripts revert | High |
| PR6 | docs と運用手順更新 | README/docs | operator workflow | docs review + command smoke | docs revert | Low |

## 具体コマンド集

Windows PowerShell:

```powershell
node --version
npm ci --silent
npm test
npm run test:night-batch
python --version
python python/night_batch.py smoke-prod --config config/night_batch/bundle-foreground-reuse-config.json --dry-run
$env:TV_CDP_HOST = '127.0.0.1'
$env:TV_CDP_PORT = '9222'
node src/cli/index.js status
Invoke-RestMethod http://127.0.0.1:9222/json/list
wsl --shutdown
```

Windows cmd:

```cmd
"%LOCALAPPDATA%\TradingView\TradingView.exe" --remote-debugging-port=9222
scripts\windows\run-night-batch-self-hosted.cmd config\night_batch\bundle-foreground-reuse-config.json
scripts\windows\run-self-hosted-runner-with-bootstrap.cmd C:\actions-runner
```

GitHub CLI:

```powershell
gh run list --workflow "Night Batch Self Hosted" --limit 5
gh run list --workflow "Daily Fundamental Screener" --limit 5
gh run list --workflow "Portfolio Health Check" --limit 5
```

## GitHub Actions修正案

- `night-batch-self-hosted.yml` と `night-batch-smoke.yml`
  - `Install dependencies in WSL workspace` を `npm ci --silent` に変更。
  - inline `wsl.exe bash -lc python3 -c` 診断を `pwsh` + `Invoke-RestMethod` または small Node script に変更。
  - `scripts\windows\run-night-batch-self-hosted.cmd` は Windows native wrapper として維持。
  - archive/docs archive は direct `python`/`node`。
- screener/portfolio workflows
  - `WSL_REPO_PATH` を削除。
  - `Publish ... to WSL main` を `Publish ... to main` に変更。
  - Windows native publish script で SSH remote を確認して `git pull --ff-only`, `git add`, `git commit`, `git push`。

## config修正案

- `config/night_batch/*.json`
  - `runtime.host`: `127.0.0.1`
  - `runtime.port`: `9222`
  - `startup_check_host`: `127.0.0.1`
  - `startup_check_port`: `9222`
  - `launch.shortcut_path`: direct exe 優先。shortcut は fallback。
- `config/backtest/campaigns/*.json`
  - `worker_ports`: `[9222]`
- legacy が必要な場合は `*-wsl-legacy.json` として明示的に分ける。

## テスト計画

- Unit: `npm run test:unit`
- Night batch: `npm run test:night-batch`
- E2E/CDP: TradingView 起動後に `npm run test:e2e`
- Python: `python python/night_batch.py smoke-prod --config ... --dry-run`
- Workflow live:
  - `Night Batch Smoke`
  - `Night Batch Self Hosted`
  - `Daily Fundamental Screener`
  - `Daily Fundamental Screener Japan`
  - `Portfolio Health Check`
  - `SBI Portfolio Capture`
- 成功基準:
  - WSL を起動せずに workflow の主要 job が完走
  - レポートが expected path に出力
  - publish commit/push が main に反映
  - LINE success/failure 通知が従来通り送信または secrets 未設定時に安全 skip

## rollback手順

- PR 単位で revert。
- `config/night_batch` は legacy config を保持し、緊急時は `172.31.144.1:9223` に戻す。
- workflow は直前 commit SHA に戻し、self-hosted runner を再起動。
- publish が失敗した場合は artifact を GitHub Actions から取得し、手動 commit で復旧。
- CDP が不安定な場合は `TV_CDP_HOST=172.31.144.1`, `TV_CDP_PORT=9223` の legacy 経路を一時使用。

## メモリ削減見込み

- WSL 常駐を止められれば `vmmemWSL` 約 2.9GB の削減が主効果。
- Node/Python/Git/Codex CLI は Windows 側へ移るため、プロセス単体のメモリは消えない。
- Chrome/TradingView は従来通り重い。削減の本命は WSL 常駐と二重 checkout/二重 runtime の排除。

## 最初に着手すべき最小変更

最小の第一歩は PR1 ではなく、検証用に「Windows direct CDP を壊さず確認できる小変更」から始めること。

1. `config/night_batch` のうち代表 1 ファイルだけを Windows native 用に複製する。
2. `python/night_batch.py smoke-prod --dry-run --config <windows-native-config>` を Windows Python で通す。
3. `node src/cli/index.js status` を `127.0.0.1:9222` で確認する。
4. 問題なければ wrapper/workflow へ進む。

最優先で直すべき危険箇所は `scripts/windows/run-night-batch-self-hosted.cmd` と publish-to-WSL scripts。ここが残る限り、WSL を停止した運用は成立しない。
