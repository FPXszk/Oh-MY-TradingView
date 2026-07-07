# Documentation Index

このディレクトリは、README から分離した詳細情報の置き場です。最初の入口はリポジトリルートの [README.md](../README.md) です。ここでは、どの詳細資料をどの順番で見るかだけを案内します。

## 読む順番

1. [../AGENTS.md](../AGENTS.md) - AI 作業規則
2. [../README.md](../README.md) - プロジェクト概要とタスク別ナビゲーション
3. [exec-plans/active/](exec-plans/active/) - 進行中の実装計画
4. 対象領域の docs / code / tests
5. 必要な場合だけ archive や generated artifacts

## 主な領域

| 領域 | 場所 | 用途 |
|---|---|---|
| exec-plans | [exec-plans/](exec-plans/) | 実装計画。進行中は `active/`、完了後は `completed/` |
| strategy | [strategy/](strategy/) | 戦略、テーマ、投資判断の人間向け説明 |
| research | [research/](research/) | 調査メモ、backtest scoreboard、manifest 管理対象資料 |
| reports | [reports/](reports/) | incident、postmortem、運用レポート |
| references | [references/](references/) | 外部資料台帳、Pine snapshot などの再利用資料 |
| sessions | [sessions/](sessions/) | 直近の判断ログ。通常は最後に見る |

## current / archive / generated

| 区分 | 扱い |
|---|---|
| current | README、現行 code、現行 config、`docs/research/manifest.json` の keep 対象 |
| archive | `archive/` 配下の過去資料。背景確認には使うが、現行仕様として扱う前にコードで検証する |
| generated | [../artifacts/](../artifacts/) 配下の実行生成物。結果確認用であり、実装の正本ではない |

## よく使う入口

- 実装計画: [exec-plans/active/](exec-plans/active/)
- 完了済み計画: [exec-plans/completed/](exec-plans/completed/)
- ドキュメント運用ルール: [DOCUMENTATION_SYSTEM.md](DOCUMENTATION_SYSTEM.md)
- 外部資料台帳: [references/design-ref-llms.md](references/design-ref-llms.md)
- 戦略説明: [strategy/](strategy/)
- 調査資料: [research/](research/)
- 運用レポート: [reports/](reports/)
- セッションログ: [sessions/](sessions/)

## 書き分け

- README には、概要、主環境、タスク別ナビゲーション、最小セットアップだけを書く。
- docs には、詳細説明、運用判断、調査結果、過去経緯を書く。
- artifacts には、実行で生成された結果を置く。手で編集して仕様説明にしない。
- archive は背景資料として扱う。現行挙動は code / config / tests を優先して確認する。
