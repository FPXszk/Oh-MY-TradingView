# DOCUMENTATION_SYSTEM

## 目的

このドキュメントは、リポジトリ内の文書をどこに置き、どの順番で読み、どう鮮度を保つかを定義します。

プロジェクト全体の一次入口は、リポジトリルートの [README.md](../README.md) です。docs 配下の索引とドキュメント運用ルールは、この `DOCUMENTATION_SYSTEM.md` に集約します。

## README はルートに1つだけ置く

- README はリポジトリルートの `README.md` だけを正本とする。
- `docs/` や各サブディレクトリには、別の `README.md` を作らない。
- docs 配下の読み方、配置ルール、主要領域への索引は、この文書に集約する。
- 詳細 runbook、調査、過去経緯、運用レポートはルート README に詰め込まず、目的別の docs へ分ける。

## 読み始める順番

1. [../AGENTS.md](../AGENTS.md) - AI 作業規則
2. [../README.md](../README.md) - プロジェクト概要、主環境、タスク別ナビゲーション
3. [exec-plans/active/](exec-plans/active/) - 進行中の実装計画
4. 対象領域の code / config / tests
5. 必要な場合だけ、この文書の索引から research / reports / references / strategy / sessions へ進む
6. archive や generated artifacts は、現行実装を確認したあとに参照する

実装の正本は、現行の code / config / tests / workflow です。docs と artifacts が実装と矛盾する場合は、実装側を優先して文書を更新します。

## docs の主な領域

| 領域 | 場所 | 用途 |
|---|---|---|
| exec-plans | [exec-plans/](exec-plans/) | 実装計画。進行中は `active/`、完了後は `completed/` |
| strategy | [strategy/](strategy/) | 戦略、テーマ、投資判断の人間向け説明 |
| research | [research/](research/) | 調査メモ、backtest scoreboard、manifest 管理対象資料 |
| reports | [reports/](reports/) | incident、postmortem、運用レポート |
| references | [references/](references/) | 外部資料台帳、Pine snapshot などの再利用資料 |
| sessions | [sessions/](sessions/) | 直近の判断ログ。通常は最後に見る |

## 置き場所

| 種別 | 場所 | 役割 |
|---|---|---|
| プロジェクト入口 | [../README.md](../README.md) | 概要、current default、タスク別ナビゲーション |
| docs 索引・運用規則 | [DOCUMENTATION_SYSTEM.md](DOCUMENTATION_SYSTEM.md) | docs 配下の読み方、配置、鮮度維持 |
| 実装計画 | [exec-plans/](exec-plans/) | active / completed を分けて管理 |
| 戦略説明 | [strategy/](strategy/) | 戦略、テーマ、投資判断の人間向け説明 |
| 調査資料 | [research/](research/) | manifest 管理対象の current research と archive |
| 運用レポート | [reports/](reports/) | incident、postmortem、運用結果 |
| 参照資料 | [references/](references/) | 外部資料台帳、Pine snapshot など |
| セッションログ | [sessions/](sessions/) | 直近判断ログ。通常は最後に参照 |
| 生成物 | [../artifacts/](../artifacts/) | 実行結果。実装の正本ではない |

## よく使う入口

- 進行中の実装計画: [exec-plans/active/](exec-plans/active/)
- 完了済みの実装計画: [exec-plans/completed/](exec-plans/completed/)
- 戦略説明: [strategy/](strategy/)
- 調査資料: [research/](research/)
- 運用レポート: [reports/](reports/)
- 外部資料台帳: [references/design-ref-llms.md](references/design-ref-llms.md)
- 参照資料: [references/](references/)
- セッションログ: [sessions/](sessions/)

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
- 進行中・完了済みの実装計画

## 書き分け

- ルート README には、概要、主環境、タスク別ナビゲーション、最小セットアップだけを書く。
- docs には、詳細説明、運用判断、調査結果、過去経緯を書く。
- artifacts には、実行で生成された結果を置く。手で編集して仕様説明にしない。
- archive は背景資料として扱う。現行挙動は code / config / tests を優先して確認する。

## current / archive / generated

| 区分 | 判断基準 |
|---|---|
| current | ルート README、現行 code、現行 config、現行 tests、`docs/research/manifest.json` の keep 対象 |
| archive | `archive/` 配下の過去資料。現行仕様として扱う前に code / config / tests で検証する |
| generated | `artifacts/` 配下の実行生成物。結果確認用であり、実装の正本ではない |

## 鮮度維持

- path を変えたら、ルート README、この文書、導線テストを同時に直す。
- ルート README とこの文書から、存在しないローカルリンクへ誘導しない。
- README を追加しない。docs の索引が必要な場合は、この文書へ追記する。
- docs の主要リンクは [../tests/documentation-navigation.test.js](../tests/documentation-navigation.test.js) で検出する。
- `docs/research/` の鮮度は [research/manifest.json](research/manifest.json) の keep で管理する。
- keep 外の research docs や古い session logs は [../scripts/docs/archive-stale-latest.mjs](../scripts/docs/archive-stale-latest.mjs) で archive へ退避する。
- 外部資料を参照したら [references/design-ref-llms.md](references/design-ref-llms.md) に記録する。
- 廃止した文書の名称やパスを、現行の README・索引・導線テストへ残さない。

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
