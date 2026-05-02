---
name: tradingview-research-capture
description: 外部調査時の docs / references / manifest 更新手順を固定化する。research-to-docs の runbook。
tags:
  - research
  - documentation
  - runbook
---

# tradingview-research-capture — Research-to-Docs Runbook

このスキルは、外部調査の結果を Oh-MY-TradingView のドキュメント体系に正しく残すための手順書である。
調査結果を一時的なメモに留めず、durable asset として固定化する。

## When to Use

- 外部リポジトリ・記事・ツールを調査して、repo に知見を取り込むとき
- `docs/references/design-ref-llms.md` への参照記録が必要なとき
- `docs/research/` に調査結果を追加するとき
- 調査結果を基に実装判断を文書化するとき

## Runbook

### Step 1: 参照台帳への記録

調査で参照した**全ての**外部資料を `docs/references/design-ref-llms.md` に追記する。

テンプレート:
```markdown
## 番号：名前

- URL: ***
- 参考にした理由: ***
- このプロジェクトにどう活かしたか: ***
- 採用したもの: ***
- 採用しなかったもの: ***
```

ルール:
- 番号は既存の最大番号 + 1 から連番で付与する
- 各項目を空欄にしない
- 「採用しなかったもの」も必ず明記する

### Step 2: 調査結果ドキュメントの作成

比較調査や深い分析の結果は `docs/research/` にマークダウンで作成する。

命名規則: `<topic>-<description>.md`（例: `external-agent-pattern-comparison.md`）

必須セクション:
- 概要
- 調査対象
- 採用 / 不採用の判断（理由付き）
- このプロジェクトへの接続点

### Step 3: manifest.json の更新

`docs/research/manifest.json` の `keep` 配列に新規ドキュメントを追加する。

```json
{
  "keep": [
    "artifacts-backtest-scoreboards.md",
    "...",
    "新しいドキュメント名.md"
  ]
}
```

**注意**: manifest.json は `docs/research/manifest.json`（research ディレクトリの直下）。`current/` の中ではない。

### Step 4: 検証

```bash
node --test tests/repo-layout.test.js tests/archive-latest-policy.test.js
```

manifest に記載したファイルが実際に存在すること、ディレクトリ運用ルールに反していないことを確認する。

## ファイル構造

```
docs/
├── references/
│   └── design-ref-llms.md          ← 参照台帳（Step 1）
├── research/
│   ├── manifest.json               ← keep-set（Step 3）
│   ├── *.md                        ← 調査結果（Step 2）
│   ├── current/
│   │   └── artifacts-backtest-scoreboards.md  ← 自動生成（編集不要）
│   └── archive/                    ← stale docs の移動先
└── exec-plans/
    ├── active/                     ← 実施中の計画
    └── completed/                  ← 完了した計画
```

## Anti-Patterns

| Anti-Pattern | 正しいアプローチ |
|---|---|
| 参照台帳を更新せずに実装を進める | 外部資料を参照したら **必ず** `design-ref-llms.md` に記録してから実装する |
| manifest.json を更新せずに research にファイルを追加する | ファイル追加と manifest 更新は **同時に** 行う |
| 調査結果を session log だけに残す | 有用な知見は `docs/research/` に durable doc として固定する |
| 「採用しなかったもの」を省略する | 不採用理由は将来の再検討時に重要。必ず明記する |
| `docs/research/latest/` に置こうとする | `latest/` ディレクトリは廃止済み。`docs/research/` 直下に置く |
| research に置いたファイルを manifest に入れない | archive-stale-latest.mjs が manifest 外ファイルを自動アーカイブする |
