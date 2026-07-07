---
name: tradingview-research-capture
description: 外部調査時の docs / references / manifest 更新手順を現行ドキュメント体系に合わせて固定化する runbook。
tags:
  - research
  - documentation
  - runbook
---

# tradingview-research-capture

外部調査の結果を Oh-MY-TradingView の現行ドキュメント体系へ残すための手順。正本は `docs/DOCUMENTATION_SYSTEM.md`、`docs/research/manifest.json`、`docs/references/design-ref-llms.md`。

## When To Use

- 外部リポジトリ、記事、公式ドキュメント、ツールを調査して repo に知見を取り込むとき
- `docs/references/design-ref-llms.md` への参照記録が必要なとき
- `docs/research/` に調査結果を追加するとき
- 調査結果を基に実装判断を文書化するとき

## Step 1: Reference Ledger

外部資料を参照したら `docs/references/design-ref-llms.md` に追記する。

```markdown
## 番号：名前

- URL: ***
- 参考にした理由: ***
- このプロジェクトにどう活かしたか: ***
- 採用したもの: ***
- 採用しなかったもの: ***
```

番号は既存の最大番号 + 1 から連番にする。各項目を空欄にしない。

## Step 2: Research Doc

比較調査や深い分析の結果は `docs/research/` 直下に Markdown で作成する。

推奨セクション:

- 概要
- 調査対象
- 採用 / 不採用の判断
- このプロジェクトへの接続点
- 残るリスク

`docs/research/archive/` は過去資料の退避先。現行仕様として使う前に code / config / tests で検証する。

## Step 3: Manifest

`docs/research/manifest.json` の `keep` 配列に新規ドキュメント名を追加する。

```json
{
  "keep": [
    "既存ファイル.md",
    "新しいドキュメント.md"
  ]
}
```

manifest 外の research doc は `scripts/docs/archive-stale-latest.mjs` で archive 対象になりうる。

## Step 4: Verification

現行の docs 導線と archive ルールを確認する:

```powershell
node --test tests/documentation-navigation.test.js tests/archive-latest-policy.test.js
```

docs 導線を変更していない research doc 追加だけなら、少なくとも archive policy を確認する:

```powershell
node --test tests/archive-latest-policy.test.js
```

## Current Structure

```text
docs/
├── DOCUMENTATION_SYSTEM.md
├── references/
│   └── design-ref-llms.md
├── research/
│   ├── manifest.json
│   ├── *.md
│   └── archive/
├── reports/
├── sessions/
└── exec-plans/
    ├── active/
    └── completed/
```

## Anti-Patterns

| Anti-Pattern | Correct approach |
|---|---|
| 外部資料を参照したのに台帳へ残さない | `docs/references/design-ref-llms.md` に記録する |
| research doc を manifest に入れない | doc 追加と同時に `docs/research/manifest.json` を更新する |
| archive 配下を現行仕様として扱う | code / config / tests で現行性を確認する |
| 調査結果を session log だけに残す | 再利用する知見は `docs/research/` へ固定する |
