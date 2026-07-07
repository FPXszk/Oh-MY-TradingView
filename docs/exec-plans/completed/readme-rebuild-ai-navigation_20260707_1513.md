# README 再構築・AI ナビゲーション整備 完了記録

- 作成日時: 2026-07-07 15:13 JST
- 完了日時: 2026-07-07 15:35 JST
- 対象リポジトリ: `FPXszk/Oh-MY-TradingView`
- 対象ブランチ: `main`
- 状態: COMPLETED

## ゴール

古い README を、現行コードに合う「リポジトリの一次入口」へ作り直し、他の AI エージェントや開発者が最初に見たときに次を判断できる状態にする。

- このプロジェクトが何をするものか
- 現在の主実行環境が何か
- タスク別にどの範囲を読むべきか
- 実行入口、ドメインロジック、設定、テストがどこにあるか
- 何が正本で、何が生成物・過去資料か

## 実施内容

- ルート `README.md` を現行コードに合わせて再構成した
- Windows native / PowerShell を current default として明記した
- タスク別ナビゲーションを追加した
- MCP / CLI / Workflow / Night Batch の主要実行経路を整理した
- リポジトリ構造、最小セットアップ、テストの選び方を整理した
- current / archive / generated の区分を明文化した
- docs 配下の配置・鮮度維持ルールを `docs/DOCUMENTATION_SYSTEM.md` に整理した
- `tests/documentation-navigation.test.js` を追加し、主要リンクの破損を検出できるようにした

## 現在のドキュメント方針

この計画の完了後、ドキュメント入口はさらに整理され、README はルート `README.md` だけを正本とする方針に統一された。

- プロジェクト入口: `README.md`
- docs 配下の索引・配置・鮮度維持: `docs/DOCUMENTATION_SYSTEM.md`
- 進行中の実装計画: `docs/exec-plans/active/`
- 完了済みの実装計画: `docs/exec-plans/completed/`

## 主な入口

- MCP server: `src/server.js`
- CDP 接続: `src/connection.js`
- MCP tools: `src/tools/`
- CLI: `src/cli/index.js`、`src/cli/commands/`
- ドメインロジック: `src/core/`
- Workflows: `.github/workflows/`
- Backtest / Night Batch 設定: `config/backtest/`、`config/night_batch/`
- Screener 設定: `config/screener/`
- Python Night Batch runner: `python/night_batch.py`
- 検証: `tests/`
- 生成物: `artifacts/`

## 成功条件

- [x] README 冒頭でプロジェクト概要が分かる
- [x] Windows native が current default と分かる
- [x] AI / 開発者の読み順が分かる
- [x] タスク別ナビゲーションから調査範囲を決められる
- [x] MCP / CLI / Workflow / Night Batch の入口が明確である
- [x] current と legacy / optional が混同されない
- [x] 実装の正本、設定の正本、生成物、過去資料の違いが分かる
- [x] ドキュメント導線テストが用意されている

## 影響範囲

変更はドキュメントとドキュメント導線テストに限定し、実装コード、CLI、MCP、screener、backtest、Night Batch の挙動は変更していない。
