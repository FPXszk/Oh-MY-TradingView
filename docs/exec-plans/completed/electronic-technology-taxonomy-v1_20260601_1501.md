# Electronic Technology v1 taxonomy 実装計画

## ゴール

`Electronic Technology` セクターについて、実銘柄ベースの `中テーマ / 小テーマ / 代表銘柄 / 判定ルール` を整理し、repo の theme taxonomy に実装反映する。

今回の完了条件:

1. `Electronic Technology` 向け v1 taxonomy ドキュメントを追加する
2. `config/screener/theme-taxonomy-us.json` に ET 向け refined taxonomy を反映する
3. 代表銘柄が期待テーマへ分類されることをテストで固定する

## 前提と解釈

- 依頼の中心は `Electronic Technology` の v1 実装であり、全セクター同時刷新ではない
- 今回は breadth が取りやすいテーマから優先し、薄いテーマは無理に独立させない
- 実装対象の中テーマは次の 5 つに絞る
  - `AI Compute`
  - `Memory`
  - `Semiconductor Equipment`
  - `Optical / Photonics`
  - `Connectivity Silicon`
- `Defense Electronics` は将来候補として文書には残しても、今回は taxonomy 実装の主対象外にする

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
|---|---|---|
| `docs/exec-plans/active/electronic-technology-taxonomy-v1_20260601_1501.md` | CREATE | 本計画 |
| `docs/strategy/electronic-technology-taxonomy-v1_20260601.md` | CREATE | ET 向け中テーマ / 小テーマ / 代表銘柄 / 判定ルールの整理 |
| `config/screener/theme-taxonomy-us.json` | MODIFY | ET 関連テーマの refined taxonomy を反映 |
| `tests/theme-taxonomy.test.js` | MODIFY | 代表銘柄の分類を固定する |
| `docs/exec-plans/completed/electronic-technology-taxonomy-v1_20260601_1501.md` | MOVE | 完了時に移動 |

## 実装内容

### A. ET v1 taxonomy ドキュメント

- `Electronic Technology` 配下の中テーマを定義する
- 各中テーマごとに
  - 小テーマ
  - 代表銘柄
  - 主判定ルール
  - 補助判定ルール
  - 今回の実装可否
  を表形式で整理する

### B. config 反映

- 既存の ET 関連テーマを見直し、必要な symbol / keyword を追加する
- `Optical Connectivity` は ET 観点が伝わるように `Optical / Photonics` へ寄せる
- `Connectivity Silicon` を新規追加する
- overlap が強すぎる symbol は最初の v1 では片側へ寄せ、tie を減らす

### C. theme classification テスト

- 少なくとも以下の代表ケースを固定する
  - `MU` -> `Memory` / `HBM/DRAM`
  - `STX` または `WDC` -> `Memory` / `NAND/Storage`
  - `KLAC` -> `Semiconductor Equipment` / `Test & Metrology`
  - `LITE` または `COHR` -> `Optical / Photonics` の該当 subtheme
  - `QRVO` または `SWKS` または `CRDO` -> `Connectivity Silicon`

## 実装ステップ

- [ ] 既存 ET 関連 theme を整理し、v1 の対象テーマを確定する
- [ ] `docs/strategy/electronic-technology-taxonomy-v1_20260601.md` を作成する
- [ ] `config/screener/theme-taxonomy-us.json` を更新する
- [ ] `tests/theme-taxonomy.test.js` を更新する
- [ ] `node --test tests/theme-taxonomy.test.js` を実行する
- [ ] 差分をレビューし、計画を completed へ移動する

## テスト戦略

- RED:
  - ET 代表銘柄の期待分類を新規テストで追加する
- GREEN:
  - config のみまたは最小差分で期待分類へ到達させる
- REFACTOR:
  - `src/core/theme-taxonomy.js` は原則触らず、config 主体で整える

## 検証

```bash
node --test tests/theme-taxonomy.test.js
git diff --check
```

## 影響範囲

- 影響あり
  - US theme taxonomy の ET 分類精度
  - 将来の Phase2 / Phase3 hierarchy 実装の土台
- 影響なし
  - current screener の hard gate
  - workflow 実行ロジック

## リスク

1. ET 内は symbol overlap が多く、AI compute / connectivity / optical の境界が曖昧な銘柄がある
2. 細かく切りすぎると小テーマの breadth が薄くなる
3. config だけで無理に表現すると、一部銘柄は誤分類または multi-theme の取りこぼしが残る

## スコープ外

- `Electronic Technology` 以外の taxonomy 再設計
- hierarchy ranking ロジック本体の実装
- report の Phase1-4 章立て変更

## 競合確認

- `docs/exec-plans/active/` には別の説明系 plan が残っているが、今回の taxonomy 実装とは直接競合しない
