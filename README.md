# Oh-MY-TradingView

TradingView Desktop の CDP 操作を中核に、MCP / CLI、Pine 開発、バックテスト、米国・日本株スクリーニング、Moomoo / SBI / ポートフォリオ診断、Windows Night Batch を統合するローカル投資分析基盤です。

この README は、リポジトリを調査・変更するときの一次入口です。README はこのルートファイルだけを正本とし、細かい運用手順、docs 配下の索引、配置ルール、過去経緯は [docs/DOCUMENTATION_SYSTEM.md](docs/DOCUMENTATION_SYSTEM.md) から辿ります。

## 現在の主実行環境

| 項目 | Current default |
|---|---|
| OS / shell | Windows native / PowerShell |
| Repository root | `C:\00_mycode\Oh-MY-TradingView` |
| Node.js | `>=20` |
| TradingView CDP | `127.0.0.1:9222` |
| GitHub Actions | Windows self-hosted runner を含む |
| WSL | legacy / optional。通常の調査・実装では current default として扱わない |

CDP が必要な作業では、TradingView Desktop を debug port `9222` 付きで起動してから `npm run tv -- status` を先に確認します。CDP 不要の market / reach / docs / unit test 系作業では TradingView Desktop は不要です。

## 最初に読む順番

1. [AGENTS.md](AGENTS.md) - このリポジトリでの AI 作業規則
2. この README の「タスク別ナビゲーション」
3. [docs/exec-plans/active/](docs/exec-plans/active/) - 進行中の計画
4. 対象ドメインの入口ファイル
5. 対応する [tests/](tests/)
6. 必要な場合だけ [docs/DOCUMENTATION_SYSTEM.md](docs/DOCUMENTATION_SYSTEM.md) から詳細資料・過去資料・生成物へ進む

実装の正本はコードと設定です。`artifacts/` や古い reports は実行結果・履歴の確認に使いますが、実装調査の最初の入口にはしません。

## AI runbooks

[.agents/skills/](.agents/skills/) はタスク別 runbook です。判断の補助として使いますが、正本は現行の code / config / tests / workflow です。skill と実装が矛盾する場合は、実装側を優先して skill を更新します。

## タスク別ナビゲーション

| タスク | 最初に見る場所 | 次に見る場所 | 主な検証 |
|---|---|---|---|
| MCP tool 追加・修正 | [src/server.js](src/server.js) | [src/tools/](src/tools/) -> [src/core/](src/core/) | 対応する `tests/*.test.js` |
| CLI 追加・修正 | [src/cli/index.js](src/cli/index.js) | [src/cli/commands/](src/cli/commands/) -> [src/core/](src/core/) | CLI 対象の unit test |
| CDP 接続 | [src/connection.js](src/connection.js) | [src/core/health.js](src/core/health.js)、[src/core/tradingview-readiness.js](src/core/tradingview-readiness.js) | [tests/connection.test.js](tests/connection.test.js) |
| Pine 編集・compile | [src/tools/pine.js](src/tools/pine.js) | [src/core/pine.js](src/core/pine.js)、[src/cli/commands/pine.js](src/cli/commands/pine.js) | Pine 系 tests |
| Backtest / campaign | [config/backtest/](config/backtest/) | [src/core/backtest.js](src/core/backtest.js)、[src/core/campaign.js](src/core/campaign.js)、[scripts/backtest/](scripts/backtest/) | backtest / campaign 系 tests |
| Night Batch | [config/night_batch/](config/night_batch/) | [.github/workflows/night-batch-self-hosted.yml](.github/workflows/night-batch-self-hosted.yml)、[python/night_batch.py](python/night_batch.py)、[scripts/windows/](scripts/windows/) | `npm run test:night-batch` |
| 米国スクリーナー | [.github/workflows/daily-screener.yml](.github/workflows/daily-screener.yml) | [scripts/screener/](scripts/screener/)、[src/core/fundamental-screener.js](src/core/fundamental-screener.js)、[src/core/sec-edgar.js](src/core/sec-edgar.js) | screener / SEC 系 tests |
| 日本株スクリーナー | [.github/workflows/daily-screener-japan.yml](.github/workflows/daily-screener-japan.yml) | [scripts/screener/](scripts/screener/)、[src/core/edinet.js](src/core/edinet.js) | screener / EDINET 系 tests |
| Moomoo OpenAPI | [src/tools/moomoo.js](src/tools/moomoo.js) | [src/core/moomoo.js](src/core/moomoo.js)、[scripts/moomoo/](scripts/moomoo/) | [tests/moomoo.test.js](tests/moomoo.test.js) |
| SBI / portfolio | [scripts/sbi/](scripts/sbi/)、[scripts/portfolio/](scripts/portfolio/) | [.github/workflows/sbi-portfolio-capture.yml](.github/workflows/sbi-portfolio-capture.yml)、portfolio 系 workflows | SBI / portfolio 系 tests |
| Windows runner | [scripts/windows/](scripts/windows/) | [.github/workflows/night-batch-self-hosted.yml](.github/workflows/night-batch-self-hosted.yml) | Windows / night-batch 系 tests |
| ドキュメント | [README.md](README.md) | [docs/DOCUMENTATION_SYSTEM.md](docs/DOCUMENTATION_SYSTEM.md)、[docs/exec-plans/active/](docs/exec-plans/active/) | [tests/documentation-navigation.test.js](tests/documentation-navigation.test.js) |

## 主要実行経路

```text
MCP
src/server.js
  -> src/tools/*
  -> src/core/*
  -> src/connection.js / external providers

CLI
src/cli/index.js
  -> src/cli/commands/*
  -> src/core/*

Workflow
.github/workflows/*
  -> scripts/*
  -> src/core/*
  -> docs/reports/ or artifacts/

Night Batch
.github/workflows/night-batch-self-hosted.yml
  -> scripts/windows/*
  -> python/night_batch.py
  -> scripts/backtest/*
  -> artifacts/night-batch/
```

MCP tool の実際の登録と説明は [src/server.js](src/server.js) を正本にします。CLI の実コマンドは `npm run tv -- --help` と [src/cli/commands/](src/cli/commands/) を確認します。

## リポジトリ構造

```text
.
├─ AGENTS.md                 # AI 作業規則
├─ README.md                 # 唯一の README・プロジェクト入口・タスクルーター
├─ package.json              # Node 実行入口・テストコマンド
├─ src/
│  ├─ server.js              # MCP server entry point
│  ├─ connection.js          # CDP 接続
│  ├─ core/                  # ドメインロジック
│  ├─ tools/                 # MCP tool 登録
│  └─ cli/                   # tv CLI
├─ config/
│  ├─ backtest/              # preset / campaign / universe
│  ├─ night_batch/           # Night Batch 設定
│  └─ screener/              # US / Japan screener 設定
├─ scripts/
│  ├─ backtest/
│  ├─ docs/
│  ├─ line/
│  ├─ moomoo/
│  ├─ portfolio/
│  ├─ sbi/
│  ├─ screener/
│  ├─ tmux/                  # legacy / optional
│  └─ windows/
├─ python/
│  └─ night_batch.py
├─ .github/workflows/        # 定期・手動 workflow
├─ tests/                    # unit / E2E / workflow 検証
├─ docs/                     # 計画・設計・調査・レポート。索引は DOCUMENTATION_SYSTEM.md
└─ artifacts/                # 生成物。実装の正本ではない
```

## 最小セットアップ

```powershell
npm ci
npm run tv -- --help
npm test
```

TradingView Desktop の CDP 接続を使う場合:

```powershell
npm run tv -- status
```

代表的な入口:

```powershell
npm run tv -- status
npm run tv -- price get
npm run tv -- pine analyze --file .\example.pine
npm run tv -- backtest preset ema-cross-9-21 --symbol NVDA
npm run portfolio:convert -- --help
```

環境変数の基本:

| 変数 | 既定 / 用途 |
|---|---|
| `TV_CDP_HOST` | CDP host。Windows native では `127.0.0.1` を使う |
| `TV_CDP_PORT` | CDP port。current default は `9222` |
| `TWITTER_AUTH_TOKEN` / `TWITTER_CT0` | X read-only 機能を使う場合だけ必要 |
| `YTDLP_BIN` | YouTube 字幕断片の取得に `yt-dlp` を明示したい場合だけ必要 |

## Windows runner / Night Batch 運用メモ

Windows self-hosted runner は service mode を使用しない。現在の Windows OS バージョン / 実行環境では service mode 前提の安定運用を採用せず、必要なときに runner の `run.cmd` を起動する。

手動起動は bootstrap wrapper を使う。

```cmd
scripts\windows\run-self-hosted-runner-with-bootstrap.cmd C:\actions-runner
```

自動起動が必要な場合は Task Scheduler を使い、登録は次の script で行う。launcher は TradingView の local debug port `9222` も確認する。

```cmd
scripts\windows\register-self-hosted-runner-autostart.cmd C:\actions-runner
```

Night Batch workflow は production が完了するまで monitor / 監視する。結果確認では `GITHUB_STEP_SUMMARY`、upload-artifact された artifact、`artifacts/night-batch/roundN/bundle-foreground-state.json`、完了後の `artifacts/night-batch/archive/roundN/` を見る。

active な workflow / runner が live checkout を使っている間は live checkout を編集しない。次 strategy は worktree / clone / branch などの別 workspace で準備し、workflow の production 完了を確認してから反映する。次 run を明示的に開始する場合は `advance-next-round` を使う。

## テストの選び方

| 変更内容 | 主なコマンド |
|---|---|
| 通常の core / CLI / docs 変更 | `npm run test:unit` |
| Night Batch / Windows runner 変更 | `npm run test:night-batch` |
| CDP 実機挙動の確認 | `npm run test:e2e` |
| まとめて確認 | `npm run test:all` |
| README / docs 導線だけ確認 | `node --test tests/documentation-navigation.test.js` |

E2E は TradingView Desktop + CDP が必要です。CDP が不要な変更では、E2E 未実行の理由を明記すれば十分です。

## 正本と生成物

| 区分 | 主な場所 | 扱い |
|---|---|---|
| 実装の正本 | [src/](src/)、[scripts/](scripts/) | 動作ロジック |
| 実行設定の正本 | [config/](config/)、[.github/workflows/](.github/workflows/) | 自動化・実行条件 |
| 検証 | [tests/](tests/) | 変更時に対応テストを確認 |
| 実装計画 | [docs/exec-plans/](docs/exec-plans/) | active / completed を区別 |
| 人間向け説明 | [docs/strategy/](docs/strategy/)、[docs/references/](docs/references/) | 必要な場合だけ参照 |
| 運用レポート | [docs/reports/](docs/reports/) | 実行結果・障害記録 |
| 生成物 | [artifacts/](artifacts/) | 実装の正本ではない |

## 詳細ドキュメント

- [docs/DOCUMENTATION_SYSTEM.md](docs/DOCUMENTATION_SYSTEM.md) - docs 配下の索引、ドキュメント配置、鮮度維持ルール
- [docs/exec-plans/active/](docs/exec-plans/active/) - 進行中の実装計画
- [docs/exec-plans/completed/](docs/exec-plans/completed/) - 完了済みの実装計画
- [docs/strategy/](docs/strategy/) - 戦略・投資判断に関する人間向け説明
- [docs/research/](docs/research/) - 調査メモ、manifest 管理対象の research docs
- [docs/reports/](docs/reports/) - incident / postmortem / 運用レポート
- [docs/references/](docs/references/) - 外部資料台帳、Pine snapshot などの再利用資料
- [docs/sessions/](docs/sessions/) - 直近の判断ログ。通常は最後に見る

外部資料を調査して再利用する場合は、[docs/references/design-ref-llms.md](docs/references/design-ref-llms.md) に記録します。
