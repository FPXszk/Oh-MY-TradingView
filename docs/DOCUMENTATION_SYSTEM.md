# DOCUMENTATION_SYSTEM

## 目的

このドキュメントは、リポジトリ内の文書をどこに置き、どの順番で読み、どう鮮度を保つかを定義します。

README はリポジトリ全体の入口です。`docs/README.md` は docs 配下の索引です。詳細 runbook、調査、過去経緯、運用レポートは README に詰め込まず、docs 側へ分けます。

## 読み始める順番

1. [../AGENTS.md](../AGENTS.md) - AI 作業規則
2. [../README.md](../README.md) - プロジェクト概要、主環境、タスク別ナビゲーション
3. [README.md](README.md) - docs 配下の索引
4. [exec-plans/active/](exec-plans/active/) - 進行中の実装計画
5. 対象領域の code / config / tests
6. 必要な場合だけ research / reports / references / sessions

## 置き場所

| 種別 | 場所 | 役割 |
|---|---|---|
| プロジェクト入口 | [../README.md](../README.md) | 概要、current default、タスク別ナビゲーション |
| docs 索引 | [README.md](README.md) | docs 配下の読み方 |
| 実装計画 | [exec-plans/](exec-plans/) | active / completed を分けて管理 |
| 戦略説明 | [strategy/](strategy/) | 戦略、テーマ、投資判断の人間向け説明 |
| 調査資料 | [research/](research/) | manifest 管理対象の current research と archive |
| 運用レポート | [reports/](reports/) | incident、postmortem、運用結果 |
| 参照資料 | [references/](references/) | 外部資料台帳、Pine snapshot など |
| セッションログ | [sessions/](sessions/) | 直近判断ログ。通常は最後に参照 |
| 生成物 | [../artifacts/](../artifacts/) | 実行結果。実装の正本ではない |

## README に置くもの

- 一文概要
- 現在の主実行環境
- 最初に読む順番
- タスク別ナビゲーション
- 主要実行経路
- リポジトリ構造
- 最小セットアップ
- テストの選び方
- 正本と生成物の区別
- docs への入口

## docs に置くもの

- 詳細 runbook
- 調査結果
- 戦略説明
- incident / postmortem
- 外部資料の記録
- セッションログ
- 完了済みの実装計画

## current / archive / generated

| 区分 | 判断基準 |
|---|---|
| current | README、現行 code、現行 config、現行 tests、`docs/research/manifest.json` の keep 対象 |
| archive | `archive/` 配下の過去資料。現行仕様として扱う前に code / config / tests で検証する |
| generated | `artifacts/` 配下の実行生成物。結果確認用であり、実装の正本ではない |

## 鮮度維持

- path を変えたら README、docs 索引、この文書、導線テストを同時に直す。
- README から存在しないローカルリンクへ誘導しない。
- docs の主要リンクは [tests/documentation-navigation.test.js](../tests/documentation-navigation.test.js) で検出する。
- `docs/research/` の鮮度は [research/manifest.json](research/manifest.json) の keep で管理する。
- keep 外の research docs や古い session logs は [scripts/docs/archive-stale-latest.mjs](../scripts/docs/archive-stale-latest.mjs) で archive へ退避する。
- 外部資料を参照したら [references/design-ref-llms.md](references/design-ref-llms.md) に記録する。

## アーカイブルール

| 対象パス | 退避先 | 方式 |
|---|---|---|
| `docs/research/` | `docs/research/archive/` | `scripts/docs/archive-stale-latest.mjs` |
| `docs/sessions/` | `docs/sessions/archive/` | `scripts/docs/archive-stale-latest.mjs` |
| `docs/reports/` | `docs/reports/archive/` | 手動 |
| `config/backtest/campaigns/` | `config/backtest/campaigns/archive/` | 手動 |
| `config/backtest/universes/` | `config/backtest/universes/archive/` | 手動 |
| `artifacts/campaigns/` | `artifacts/campaigns/archive/` | workflow / night batch |

ローカルで archive 処理を確認する場合:

```powershell
node scripts/docs/archive-stale-latest.mjs
```
