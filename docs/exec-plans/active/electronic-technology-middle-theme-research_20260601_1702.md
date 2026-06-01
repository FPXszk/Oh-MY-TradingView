# Electronic Technology 中テーマ調査 実行計画

## ゴール

スクリーニング結果で上位に来ている `Electronic Technology` について、

1. repo 現行 taxonomy 上の `中テーマ / 小テーマ` を一覧化する
2. 外部の主要分類体系で「どこまで定義されているか」を確認する
3. `半導体 / 防衛 / 光通信 / 電子部品 / ネットワーク` などの切り分けを、次に係数調整しやすい形で整理する

今回の完了条件:

1. `Electronic Technology` 配下の現行中テーマ一覧を repo 根拠付きで説明できる
2. GICS / ICB / Morningstar / MSCI / Nasdaq / S&P Kensho / moomoo のうち、今回の論点に効く外部分類の役割差を整理する
3. 「標準分類として存在するもの」と「repo 独自に持つべき粒度」を分けて提案する

## 前提と解釈

- 今回の依頼は実装変更よりも **調査と整理** が主目的
- ただし AGENTS.md の workflow に従い、plan は repo に残す
- `Electronic Technology` は TradingView の broad sector であり、ユーザーが知りたいのはその配下の実戦的な中テーマ粒度
- 外部に完全一致の唯一標準があるとは限らず、複数分類の重ね合わせになる可能性が高い

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
| --- | --- | --- |
| `docs/exec-plans/active/electronic-technology-middle-theme-research_20260601_1702.md` | CREATE | 本計画 |
| `docs/strategy/electronic-technology-middle-theme-research_20260601.md` | CREATE | repo 現行 taxonomy と外部分類の調査メモ |
| `docs/exec-plans/completed/electronic-technology-middle-theme-research_20260601_1702.md` | MOVE | 完了時に移動 |

## 実施内容

### A. repo 内の現行分類整理

- `src/core/theme-taxonomy.js`
- `config/screener/theme-taxonomy-us.json`
- `config/screener/external-theme-reference-us.json`
- `docs/reports/screener/daily-ranking.md`

を確認し、`Electronic Technology` に実際に使われている中テーマと小テーマを抽出する。

### B. 外部分類の確認

- `GICS`: 標準的な sector / industry / sub-industry の位置づけ確認
- `ICB`: Technology 配下の sector / subsector 粒度確認
- `Morningstar`: thematic taxonomy の broad theme / subtheme 確認
- `MSCI`: thematic exposure / thematic index の broad bucket 確認
- `Nasdaq`: semiconductor / AI / communications 系 index family の存在確認
- `S&P Kensho`: defense / space / smart grids などの実戦的テーマ粒度確認
- `moomoo`: concept / plate API の位置づけ確認

### C. 最終整理

- `標準分類`
- `テーマ分類`
- `repo 独自中テーマ`

の 3 層に分けて、ユーザーが見やすい「大分類 -> 中分類 -> 小分類」の候補表へ落とす。

## 実装ステップ

- [ ] repo 現行 taxonomy から `Electronic Technology` 配下の中テーマ / 小テーマを抽出する
- [ ] `daily-ranking.md` の現行結果から ET 周りの上位テーマを確認する
- [ ] 外部の標準分類とテーマ分類を公式ソースで確認する
- [ ] `docs/strategy/electronic-technology-middle-theme-research_20260601.md` に調査結果をまとめる
- [ ] 内容を自己レビューして、ユーザー向け要約を作る
- [ ] plan を `completed/` へ移動する

## テスト / 検証

- コード実装は行わないため自動テスト追加はなし
- 検証は以下で行う
  - repo 内ファイル根拠と外部公式ソースが整合していること
  - `Electronic Technology` の中テーマ一覧が、現行 taxonomy とユーザーの感覚的分類を橋渡しできていること

## 検証コマンド

```bash
rg -n "Electronic Technology|Semiconductor|Photonics|Defense|Components|Network" config/screener src/core docs/reports/screener
git diff -- docs/exec-plans/active/electronic-technology-middle-theme-research_20260601_1702.md docs/strategy/electronic-technology-middle-theme-research_20260601.md
```

## 影響範囲

- 影響あり
  - 今後の Heat 係数調整の論点整理
  - Phase2 の中テーマ設計見直し
- 影響なし
  - 現行 screener 実行ロジック
  - Phase2 スコア計算の現行結果

## リスク

1. 外部分類は provider ごとに目的が違い、1対1で綺麗に対応しない
2. `Electronic Technology` の中でも、半導体 / 通信 / 電子部品 / 防衛電子は一部 overlap する
3. 外部サイトのテーマ名は marketing 名称であり、breadth 計測単位としては粗い場合がある

## スコープ外

- Heat 係数の変更
- theme taxonomy の実装変更
- Phase3 / Phase4 への external confirmation 拡張実装

## 競合確認

- `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md` は説明系の別作業であり、今回の ET 中テーマ調査とは直接競合しない
