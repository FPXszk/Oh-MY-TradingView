# README 再構築・AI ナビゲーション整備計画

- 作成日時: 2026-07-07 15:13 JST
- 更新日時: 2026-07-07 15:35 JST
- 対象リポジトリ: `FPXszk/Oh-MY-TradingView`
- 対象ブランチ: `main`
- 状態: PLAN
- 主対象: `README.md`、`docs/README.md`、`docs/DOCUMENTATION_SYSTEM.md`

## 1. ゴール

古い README を、現行コードに合う「リポジトリの一次入口」に作り直す。

特に、他の AI エージェントや開発者が最初に見たときに、次を迷わず判断できる状態にする。

- このプロジェクトが何をするものか
- 現在の主実行環境が何か
- タスク別にどの範囲を読むべきか
- 実行入口、ドメインロジック、設定、テストがどこにあるか
- 何が正本で、何が生成物・過去資料か

README は詳細な runbook ではなく、対象領域へ進むためのルーターにする。CLI / MCP tool の全件列挙や古い運用履歴は README の主導線から外し、必要なものだけ `docs/` へ案内する。

## 2. 既存計画レビュー

既存の `docs/exec-plans/active/readme-rebuild-ai-navigation_20260707_1513.md` は方向性として妥当だった。

維持する方針:

- README をゼロベースで再構成する
- README 冒頭にプロジェクト概要、現行環境、読み順を置く
- タスク別ナビゲーションを README の中心にする
- current / legacy を明確に分ける
- `docs/README.md` を作成し、docs 配下の索引を分離する
- `docs/DOCUMENTATION_SYSTEM.md` を新しい役割分担へ合わせる
- 導線破損を検出するテストを追加する

修正する点:

- 検証範囲はドキュメント変更に合わせ、必須は `node --test tests/documentation-navigation.test.js` と `npm run test:unit` に絞る。CDP 実機 E2E は README 変更の必須条件にしない。
- タスク別ナビゲーションは実在ファイルに合わせて確定する。
- README は 250〜350 行の目安にこだわりすぎず、最初の 150 行で判断できることを優先する。
- `package.json` の `test:unit` は既存列挙方式に合わせて、追加する導線テストだけを足す。
- 実装コード、workflow 挙動、CLI 挙動は変更しない。

## 3. 現行コードから確認した前提

主実行環境:

- Repository root: `C:\00_mycode\Oh-MY-TradingView`
- Node.js: `>=20`
- TradingView CDP: Windows native `127.0.0.1:9222`
- GitHub Actions: Windows self-hosted runner を含む
- WSL / tmux / portproxy は legacy または optional

主要入口:

- MCP server: `src/server.js`
- CDP 接続: `src/connection.js`
- MCP tools: `src/tools/`
- CLI: `src/cli/index.js`、`src/cli/commands/`
- ドメインロジック: `src/core/`
- Node scripts: `package.json`、`scripts/`
- Workflows: `.github/workflows/`
- Backtest / Night Batch 設定: `config/backtest/`、`config/night_batch/`
- Screener 設定: `config/screener/`
- Python Night Batch runner: `python/night_batch.py`
- 検証: `tests/`
- 実装計画: `docs/exec-plans/`
- 生成物: `artifacts/`

現行 workflow:

- `.github/workflows/daily-screener.yml`
- `.github/workflows/daily-screener-japan.yml`
- `.github/workflows/moomoo-portfolio-diagnostics.yml`
- `.github/workflows/night-batch-self-hosted.yml`
- `.github/workflows/night-batch-smoke.yml`
- `.github/workflows/portfolio-health-check.yml`
- `.github/workflows/sbi-portfolio-capture.yml`

現行 script 領域:

- `scripts/backtest/`
- `scripts/docs/`
- `scripts/line/`
- `scripts/moomoo/`
- `scripts/portfolio/`
- `scripts/sbi/`
- `scripts/screener/`
- `scripts/tmux/`
- `scripts/windows/`

## 4. 変更対象

### 4.1 修正するファイル

#### `README.md`

全文を現行コードに合わせて再構成する。

含める内容:

- 一文概要
- 現在の主実行環境
- AI / 開発者が最初に読む順番
- タスク別ナビゲーション
- 主要実行経路
- リポジトリ構造
- 最小セットアップ
- テストの選び方
- 正本と生成物の区別
- docs 配下への詳細導線

削る内容:

- MCP tool / CLI の全件手書き列挙
- 古い WSL 主導線
- 個別 watchlist 作成 runbook
- 過去の dual-worker 詳細
- 長い Night Batch 運用履歴
- 古い market provider 説明

#### `docs/DOCUMENTATION_SYSTEM.md`

新 README と `docs/README.md` の役割分担に合わせて更新する。

修正する内容:

- 読み始める順番
- どの情報を README に置くか
- どの情報を docs に置くか
- current / archive / generated の区分
- 鮮度維持とリンク破損検知の説明

#### `package.json`

`test:unit` に `tests/documentation-navigation.test.js` を追加する。

既存 script 名、依存関係、CLI 挙動は変更しない。

### 4.2 新規作成するファイル

#### `docs/README.md`

docs 配下の一次索引として作成する。

含める内容:

- docs の役割
- exec plans
- strategy
- research
- reports
- references
- sessions
- current / archive / generated の扱い
- README から分離した詳細情報の探し方

#### `tests/documentation-navigation.test.js`

README と docs 索引の導線が壊れていないことを検証する。

検証する内容:

- README が主要セクションを含む
- README が現行主環境を明記している
- README が主要 entry point を含む
- README と docs/README のローカル Markdown リンク先が存在する
- `docs/README.md` が存在し、主要 docs ディレクトリを案内している
- WSL が current default と誤読される表現を避けている

文章の完全一致ではなく、主要導線の破損検知に限定する。

### 4.3 移動するファイル

実装・検証・レビュー完了後、この計画を次へ移動する。

```text
docs/exec-plans/completed/readme-rebuild-ai-navigation_20260707_1513.md
```

### 4.4 削除するファイル

なし。

旧 README の全文バックアップは作らない。必要なら Git 履歴で確認する。

## 5. README の新構成

想定する章立て:

1. `# Oh-MY-TradingView`
2. `## 現在の主実行環境`
3. `## 最初に読む順番`
4. `## タスク別ナビゲーション`
5. `## 主要実行経路`
6. `## リポジトリ構造`
7. `## 最小セットアップ`
8. `## テストの選び方`
9. `## 正本と生成物`
10. `## 詳細ドキュメント`

README 冒頭の一文概要:

```text
TradingView Desktop の CDP 操作を中核に、MCP / CLI、Pine 開発、バックテスト、米国・日本株スクリーニング、Moomoo / SBI / ポートフォリオ診断、Windows Night Batch を統合するローカル投資分析基盤。
```

タスク別ナビゲーションの対象:

| タスク | 最初に見る場所 | 次に見る場所 | 主な検証 |
|---|---|---|---|
| MCP tool 追加・修正 | `src/server.js` | `src/tools/`、`src/core/` | 対応する `tests/*.test.js` |
| CLI 追加・修正 | `src/cli/index.js` | `src/cli/commands/`、`src/core/` | CLI 対象の unit test |
| CDP 接続 | `src/connection.js` | `src/core/health.js`、`src/core/tradingview-readiness.js` | `tests/connection.test.js` |
| Pine | `src/tools/pine.js` | `src/core/pine.js`、`src/cli/commands/pine.js` | Pine 系 tests |
| Backtest | `config/backtest/` | `src/core/backtest.js`、`scripts/backtest/` | backtest / campaign 系 tests |
| Night Batch | `config/night_batch/` | `.github/workflows/night-batch-self-hosted.yml`、`python/night_batch.py`、`scripts/windows/` | `npm run test:night-batch` |
| 米国スクリーナー | `.github/workflows/daily-screener.yml` | `scripts/screener/`、`src/core/fundamental-screener.js`、`src/core/sec-edgar.js` | screener / SEC 系 tests |
| 日本株スクリーナー | `.github/workflows/daily-screener-japan.yml` | `scripts/screener/`、`src/core/edinet.js` | screener / EDINET 系 tests |
| Moomoo | `src/tools/moomoo.js` | `src/core/moomoo.js`、`scripts/moomoo/` | `tests/moomoo.test.js` |
| SBI / portfolio | `scripts/sbi/`、`scripts/portfolio/` | `.github/workflows/sbi-portfolio-capture.yml`、portfolio workflows | SBI / portfolio 系 tests |
| Windows runner | `scripts/windows/` | `.github/workflows/night-batch-self-hosted.yml` | Windows / night-batch 系 tests |
| ドキュメント | `README.md` | `docs/README.md`、`docs/DOCUMENTATION_SYSTEM.md` | `tests/documentation-navigation.test.js` |

## 6. 実装手順

- [ ] `main` が `origin/main` に追従していることを確認する
- [ ] active exec-plan と AGENTS.md を再確認する
- [ ] README に載せる主要 entry point と workflow を実ファイルで確認する
- [ ] `tests/documentation-navigation.test.js` を追加し、現 README で RED を確認する
- [ ] `docs/README.md` を作成する
- [ ] `README.md` をゼロベースで書き直す
- [ ] `docs/DOCUMENTATION_SYSTEM.md` を新導線へ合わせる
- [ ] `package.json` の `test:unit` に導線テストを追加する
- [ ] `node --test tests/documentation-navigation.test.js` を GREEN にする
- [ ] `npm run test:unit` を実行する
- [ ] `git diff --check` を実行する
- [ ] README の current / legacy 表現をレビューする
- [ ] README から存在しないローカルリンクへ誘導していないことを確認する
- [ ] 計画を `docs/exec-plans/completed/` へ移動する
- [ ] README 関連変更を Conventional Commits で commit / push する
- [ ] `git fetch origin` と `git status --short --branch` で remote / local clean を確認する

## 7. テスト戦略

### RED

`tests/documentation-navigation.test.js` を先に作成し、現行 README / 未作成の `docs/README.md` では失敗することを確認する。

想定 RED:

- `docs/README.md` が存在しない
- README に新しいタスク別ナビゲーションや主要 entry point が不足している
- README から存在しない docs 入口へ誘導している

### GREEN

README、`docs/README.md`、`docs/DOCUMENTATION_SYSTEM.md` を更新して導線テストを通す。

### REFACTOR

- README の詳細 runbook を削る
- コマンド全件列挙を `npm run tv -- --help` へ委譲する
- 表とツリーで見れば十分な箇所は長文説明を避ける
- テストが表現の細部に依存しすぎないようにする

### 必須検証コマンド

```powershell
node --test tests/documentation-navigation.test.js
npm run test:unit
git diff --check
```

### 任意検証コマンド

```powershell
npm run test:night-batch
npm run test:e2e
npm run test:all
```

今回の変更はドキュメントと導線テストに限定するため、E2E は必須にしない。CDP 実機を使える場合だけ実行し、未実行なら理由を報告する。

## 8. 成功条件

- [ ] README 冒頭でプロジェクト概要が分かる
- [ ] README 冒頭で Windows native が current default と分かる
- [ ] README 上部で AI / 開発者の読み順が分かる
- [ ] README のタスク別ナビゲーションから調査範囲を決められる
- [ ] MCP / CLI / Workflow / Night Batch の入口が明確である
- [ ] current と legacy / optional が混同されない
- [ ] README から存在しないローカルリンクへ誘導しない
- [ ] 実装の正本、設定の正本、生成物、過去資料の違いが分かる
- [ ] `docs/README.md` が docs 配下の索引として機能する
- [ ] `tests/documentation-navigation.test.js` が成功する
- [ ] `npm run test:unit` が成功する
- [ ] `git diff --check` が成功する
- [ ] 最終的に local / remote が同期し、working tree が clean になる

## 9. 影響範囲

影響はドキュメントとドキュメント導線テストに限定する。

変更しないもの:

- 実装コードの挙動
- CLI コマンド仕様
- MCP tool 仕様
- screener ロジック
- backtest ロジック
- Night Batch 実行方式
- Windows runner 構成
- WSL 用 script
- `AGENTS.md`
- `.github/copilot-instructions.md`

## 10. リスクと対策

### README が再び巨大化する

対策:

- README は入口と判断基準に限定する
- 詳細 runbook は docs へ誘導する
- CLI / MCP tool の全件列挙は避ける

### 情報を削りすぎて初動が分からなくなる

対策:

- 最小セットアップ、health check、テストの選び方は README に残す
- タスク別ナビゲーションを README の中心に置く

### 導線テストが壊れやすくなる

対策:

- 文言完全一致を避ける
- 主要セクション、主要パス、主要 entry point、リンク存在だけを見る

### active plan と競合する

対策:

- 実装開始前と commit 前に `docs/exec-plans/active/` を確認する
- README / docs を触る別計画があれば作業を止めて報告する

### remote が先行する

対策:

- 作業開始時、計画 commit 前、実装 commit 前に `git fetch origin` と status を確認する
- 先行している場合は clean tree の状態で fast-forward する

## 11. コミット方針

AGENTS.md のワークフローに従い、次の 2 段階で commit / push する。

1. 計画のみ
   - 対象: `docs/exec-plans/active/readme-rebuild-ai-navigation_20260707_1513.md`
   - commit message: `docs: readme-rebuild-ai-navigation_20260707_1513`

2. 実装完了後
   - 対象: README、docs 索引、導線テスト、`package.json`、completed へ移動した計画
   - commit message: `docs: rebuild readme navigation`

push は SSH remote `git@github.com:FPXszk/Oh-MY-TradingView.git` を使う。
