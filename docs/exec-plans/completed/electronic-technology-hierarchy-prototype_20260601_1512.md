# Electronic Technology hierarchy prototype 実装計画

## ゴール

`Electronic Technology` セクターだけを対象に、次を一度 end-to-end で動かせるようにする。

1. `Phase2`: 中テーマランキング
2. `Phase3`: 小テーマランキング
3. `Phase4`: 上位 hierarchy を通過した個別銘柄ランキング

今回の完了条件:

1. `runFundamentalScreener()` が `Electronic Technology` focused hierarchy 集計を返せる
2. Markdown レポートに ET 向け `Phase2 / Phase3 / Phase4` 節を表示できる
3. focused run を実際に一度動かし、生成レポートを確認できる

## 前提と解釈

- 依頼の中心は **ET 限定の試作** であり、全 sector 向け hierarchy 化ではない
- 通常の daily screener は壊さず、focused run 用オプションを足す
- `Phase1` は broad sector ranking を維持しつつ、`Phase2-4` だけ ET override を許容する
- hierarchy の ranking は v1 として、`breadth + 平均 rankScore + 平均 perf3m` ベースの簡潔な集計に留める

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
|---|---|---|
| `docs/exec-plans/active/electronic-technology-hierarchy-prototype_20260601_1512.md` | CREATE | 本計画 |
| `src/core/fundamental-screener.js` | MODIFY | focused sector override と ET hierarchy 集計 payload を追加 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | ET hierarchy の Markdown 節を追加し、runtime env を受け取る |
| `tests/fundamental-screener.test.js` | MODIFY | focused ET hierarchy payload を固定する |
| `tests/daily-screener-report.test.js` | MODIFY | ET hierarchy Markdown を固定する |
| `docs/reports/screener/electronic-technology-ranking.md` | CREATE候補 | focused run の生成物 |
| `docs/exec-plans/completed/electronic-technology-hierarchy-prototype_20260601_1512.md` | MOVE | 完了時に移動 |

## 実装内容

### A. focused hierarchy payload

- `runFundamentalScreener()` に次の focused run オプションを追加する
  - `forcePhase1Sectors`
  - `hierarchyFocusSector`
  - `hierarchyTopMiddleThemeCount`
  - `hierarchyTopSmallThemeCount`
  - `hierarchyTopStockCount`
- `hierarchyFocusSector` がある場合、
  - その sector の rows を抽出
  - 中テーマ ranking
  - 小テーマ ranking
  - 上位小テーマ通過銘柄 ranking
  を返す

### B. Markdown 出力

- focused hierarchy がある場合だけ
  - `## Phase2 中テーマランキング`
  - `## Phase3 小テーマランキング`
  - `## Phase4 個別銘柄ランキング`
  を出す
- 見出しに対象 sector 名を明記する

### C. focused run 実行

- 環境変数で ET focused run を起動できるようにする
- 生成先は通常 report を壊さないよう、別 path を使う

## 実装ステップ

- [ ] focused hierarchy の ranking 仕様を `fundamental-screener` 内で定義する
- [ ] `src/core/fundamental-screener.js` に focused sector override と hierarchy payload を追加する
- [ ] `tests/fundamental-screener.test.js` に ET hierarchy payload テストを追加する
- [ ] `scripts/screener/run-fundamental-screening.mjs` に ET hierarchy Markdown を追加する
- [ ] `tests/daily-screener-report.test.js` に ET hierarchy Markdown テストを追加する
- [ ] `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js` を実行する
- [ ] focused ET run を実行して report を生成する
- [ ] 差分確認後、計画を completed に移動する

## テスト戦略

- RED:
  - ET hierarchy payload が存在しないこと
  - Markdown に Phase2/3/4 hierarchy 節が出ないこと
- GREEN:
  - focused run 用の最小拡張で payload / Markdown を通す
- REFACTOR:
  - 集計 helper は `fundamental-screener.js` 内に閉じ、既存 scoring ロジックを崩さない

## 検証

```bash
node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js
SCREENER_FORCE_PHASE1_SECTORS="Electronic Technology" SCREENER_HIERARCHY_SECTOR="Electronic Technology" SCREENER_REPORT_PATH="docs/reports/screener/electronic-technology-ranking.md" node scripts/screener/run-fundamental-screening.mjs
git diff --check
```

## 影響範囲

- 影響あり
  - focused screener payload
  - Markdown 出力
- 影響なし
  - 通常 run の hard gate
  - taxonomy 判定ロジック本体

## リスク

1. ET hierarchy 用 ranking を作る際、1 銘柄だけの小テーマが上に来すぎる可能性がある
2. ET を強制 Phase2 対象にすると、実際の Phase1 上位 sector とズレる日がある
3. theme overlap により `small theme` の primary 判定がやや人工的になるケースがある

## スコープ外

- 全 sector への hierarchy 拡張
- daily workflow 本番置換
- moomoo breadth 統合

## 競合確認

- `docs/exec-plans/active/` に別の説明系 plan はあるが、今回の focused prototype 実装とは直接競合しない
