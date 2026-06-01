# 階層型テーマ taxonomy と 4-phase screener 再設計リサーチ計画

## ゴール

現行の `Phase1 sector -> Phase2 matched stock -> theme後付け` ではなく、ユーザー意図に沿った

1. Phase1: 強いセクターのランキング
2. Phase2: その配下の中テーマランキング
3. Phase3: その配下の小テーマランキング
4. Phase4: 上位 sector / 中テーマ / 小テーマに属する個別株の最終採点

へ再設計するため、まず **中テーマ / 小テーマの適切な粒度** と **データソースごとの役割分担** を調査・整理する。

今回の完了条件:

1. 現行実装とユーザー意図の差分を文章で明確化できる
2. 中テーマ / 小テーマをどの粒度で持つべきか、リサーチ根拠付きで整理できる
3. TradingView / moomoo / 外部分類体系をどう役割分担させるか提案できる
4. 次の実装に進めるための 4-phase architecture 案を提示できる

## 前提と解釈

- 依頼の中心はコード変更そのものではなく、**taxonomy 設計とアーキテクチャ再設計の前段リサーチ**
- 現行の `config/screener/theme-taxonomy-us.json` は試作版であり、そのまま正本とみなさない
- `sector` は broad market alignment の上位軸として残し、その下に repo custom の `中テーマ` / `小テーマ` をぶら下げる方向で検討する
- 外部調査は、可能な範囲で公式または一次情報を優先する

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
|---|---|---|
| `docs/exec-plans/active/hierarchical-theme-taxonomy-research_20260601_1439.md` | CREATE | 本計画 |
| `docs/strategy/theme-sector-taxonomy-and-moomoo-screening-research_20260531.md` | MODIFY候補 | 既存 research に続編として、階層型 taxonomy と 4-phase architecture の考察を追記する候補 |
| `docs/strategy/` 配下の新規 research doc | CREATE候補 | 既存 doc が試作 taxonomy 調査と混ざりすぎる場合、新しい dated research doc を作る |

## 実装内容

### A. 現行実装の再整理

- `sector` がどこで決まり、どこまでが hard gate かを再確認する
- `theme` が後付け集計に留まっていることを確認する
- 現行 taxonomy の medium/subtheme 定義が、ユーザー意図の `大テーマ / 中テーマ / 小テーマ` に対してどこで不足しているかを洗い出す

### B. 外部リサーチ

- broad sector の正本候補:
  - GICS / ICB などの一般的分類体系
- 中テーマ / 小テーマの粒度ヒント:
  - テーマ投資サイトの見せ方
  - 半導体 / 通信 / 電力などで一般に使われるサブ分類
- データソース制約:
  - TradingView で直接取れる `sector` / `industry` 粒度
  - moomoo の `plate` / `concept` / `industry` 粒度

### C. taxonomy 粒度案の作成

- `sector -> middle theme -> small theme` の 3 層を試案化する
- 少なくとも `Electronic Technology` / `Technology Services` / `Communications` / `Utilities` / `Producer Manufacturing` のような主要強セクターについて、
  - どこまでを中テーマにするか
  - どこから小テーマに落とすか
  - symbol allowlist / keyword / industry のどれを主判定にするか
  を整理する

### D. 4-phase architecture の提案

- Phase1: sector breadth / strength ranking
- Phase2: selected sector 内の middle theme breadth / persistence ranking
- Phase3: selected middle theme 内の small theme breadth / persistence ranking
- Phase4: 上位 hierarchy に属する個別株の technical / fundamental scoring

## 実装ステップ

- [ ] 現行 implementation と既存 research の relevant 部分を整理する
- [ ] Web で broad sector / theme taxonomy / moomoo/TradingView 粒度の一次情報を確認する
- [ ] 中テーマ / 小テーマの粒度基準を文章化する
- [ ] 代表セクターの hierarchy 試案を作る
- [ ] 4-phase architecture を詳細にまとめる
- [ ] 必要なら `docs/strategy/` に research doc を追記または新規作成する

## テスト戦略

- 今回は research / docs タスクのため自動テストは追加しない
- 代わりに、taxonomy 粒度案が
  - 現行 source code の制約
  - 既存 moomoo integration 調査
  - 外部一次情報
  と矛盾しないことを cross-check する

## 検証

```bash
git diff -- docs/strategy
```

必要時:

```bash
rg -n "theme|sector|plate|industry" src/core docs/strategy config
```

## 影響範囲

- 影響あり
  - スクリーニング設計ドキュメント
  - 今後の taxonomy 実装方針
- 影響なし
  - 現行の daily screener 実行ロジック
  - 現在の GitHub Actions workflow

## リスク

1. テーマ粒度を細かくしすぎると、breadth が薄くなりランキングの安定性が落ちる
2. 逆に粗すぎると、ユーザーが見たい market center の熱源が埋もれる
3. US 市場では moomoo concept plate が限定的なため、外部 taxonomy に寄せすぎると live data source とズレる

## スコープ外

- 今回の turn での taxonomy 実装
- スクリーナーロジックの本番置換
- workflow 実行や live rerun

## 競合確認

- `docs/exec-plans/active/` はこの計画のみで、競合する active plan は見当たらない
