# TradingView ATH Watchlist Runbook Plan 20260716_0134

## Goal

TradingView の目的ウォッチリスト（例: `ATH`）へ CDP 経由で銘柄を登録するとき、次の AI が同じ失敗を避けて再現できるように、既存の `tradingview-operator-playbook` skill へ手順を追加する。

## Files

| File | Action | Purpose |
|---|---|---|
| `.agents/skills/tradingview-operator-playbook/SKILL.md` | MODIFY | Watchlist 登録時のリスト切替、追加、存在確認、既知の失敗回避を手順化する |
| `tests/skills-contract.test.js` | MODIFY if needed | 既存 contract が新しい skill 文言を要求する必要がある場合のみ最小追記する |
| `docs/exec-plans/active/tradingview-ath-watchlist-runbook_20260716_0134.md` | CREATE then MOVE | この計画。完了時に `docs/exec-plans/completed/` へ移動する |

## Scope And Impact

- TradingView Desktop / CDP / Watchlist 操作の runbook だけを更新する。
- 実装コード、MCP tool、CLI 挙動、スクリーナー、売買判断ロジックは変更しない。
- 既存の `tv_watchlist_add` が「アクティブウォッチリストへ追加」しか保証しない点を明記し、目的リストへ切り替える確認ステップを追加する。
- 今回発生した失敗を反映する: 標準パスで `TradingView.exe` が見つからない場合、`C:\TradingView\TradingView.exe` などショートカット実体を確認する。`Index` のような別リストがアクティブなら追加しない。検索 UI の直接 value 書換では結果が更新されないことがあるため、キー入力または既存 tool の成功確認に寄せる。

## Implementation Steps

- [x] 既存 skill と contract test の制約を確認する。
- [x] `tradingview-operator-playbook` に Watchlist target-list workflow を追加する。
- [x] 必要な場合のみ contract test に最小限の文言チェックを追加する。
- [x] `git diff --check` と関連テストを実行する。
- [x] REVIEW: 変更が docs/skill 手順に限定され、過剰な抽象化や実装変更がないことを確認する。
- [x] 完了時にこの計画を `docs/exec-plans/completed/` へ移動する。

## Validation

Run:

```powershell
git diff --check
npm run test:contract
```

Completed validation:

```powershell
git diff --check
npm run test:contract
node --test tests/skills-contract.test.js
npm run test:unit
```

`test:e2e` は実行しない。理由: 今回は skill/runbook 文書の更新であり、TradingView runtime や CDP 実装コードを変更しないため。

## Risks And Uncertainties

- TradingView の DOM class は変わりやすい。スキルには特定 class への依存を最小限にし、標準 tool 優先と画面確認・存在確認を重視する。
- `tv_watchlist_add` はアクティブリストへの追加であり、名前指定の list switching tool は現時点でない。目的リスト切替は UI 観測または CDP DOM 操作が必要。
- 現在の作業ツリーには前回の screener report 更新と観測 artifact が残っているため、この変更の commit 対象から分離する。

## Out Of Scope

- Watchlist 名を指定して追加する新しい MCP tool / CLI の実装。
- TradingView の保存済みウォッチリスト構造の解析や永続ストレージ直接編集。
- 既存の screener report 差分や TradingView スクリーンショット artifact の整理。
