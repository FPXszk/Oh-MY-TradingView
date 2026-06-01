# Electronic Technology Hierarchy Handoff 20260601_1535

## 今回やったこと

- `Electronic Technology` 向け v1 taxonomy を実装済みの前提で、ET 限定の hierarchy prototype を追加
- `Phase2 中テーマランキング`
- `Phase3 小テーマランキング`
- `Phase4 個別銘柄ランキング`
  を通常 screener を壊さずに focused run として出せるようにした

## 追加した focused run オプション

- `SCREENER_FORCE_PHASE1_SECTORS`
- `SCREENER_HIERARCHY_SECTOR`
- `SCREENER_HIERARCHY_TOP_MIDDLE_THEMES`
- `SCREENER_HIERARCHY_TOP_SMALL_THEMES`
- `SCREENER_HIERARCHY_TOP_STOCKS`

使い方例:

```bash
SCREENER_FORCE_PHASE1_SECTORS="Electronic Technology" \
SCREENER_HIERARCHY_SECTOR="Electronic Technology" \
SCREENER_HIERARCHY_TOP_MIDDLE_THEMES="3" \
SCREENER_HIERARCHY_TOP_SMALL_THEMES="5" \
SCREENER_HIERARCHY_TOP_STOCKS="20" \
SCREENER_EXCHANGES="NASDAQ,NYSE" \
SCREENER_REPORT_PATH="docs/reports/screener/electronic-technology-ranking.md" \
node scripts/screener/run-fundamental-screening.mjs
```

## 変更ファイル

- `src/core/fundamental-screener.js`
  - ET focused hierarchy payload を追加
  - `focusedHierarchy.middleThemeRanking`
  - `focusedHierarchy.smallThemeRanking`
  - `focusedHierarchy.stockRanking`
- `scripts/screener/run-fundamental-screening.mjs`
  - ET focused hierarchy 節を Markdown 出力
- `tests/fundamental-screener.test.js`
  - focused ET hierarchy payload テストを追加
- `tests/daily-screener-report.test.js`
  - focused ET hierarchy Markdown テストを追加
- `docs/reports/screener/electronic-technology-ranking.md`
  - focused run の生成結果

## テスト結果

実行コマンド:

```bash
node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js
git diff --check
```

結果:

- hierarchy payload / Markdown 追加後もテスト通過
- `git diff --check` も通過

## live run 結果

実行時刻:

- 2026-06-01 15:27 JST

生成ファイル:

- `docs/reports/screener/electronic-technology-ranking.md`

run summary:

- `totalScanned=126`
- `serverFiltered=82`
- `phase1Filtered=82`
- `clientFiltered=45`
- `matched=45`

## hierarchy の見え方

### Phase1

- `Electronic Technology` が 1位

### Phase2 中テーマランキング

上位は次の並びだった。

1. `Memory`
2. `Network Infrastructure`
3. `Semiconductor Equipment`

補足:

- `Optical / Photonics` は 6位
- `AI Compute` は 7位
- `Connectivity Silicon` は 8位

### Phase3 小テーマランキング

上位は次の並びだった。

1. `Memory / NAND/Storage`
2. `Memory / HBM/DRAM`
3. `Network Infrastructure / Ethernet Switching`
4. `Semiconductor Equipment / Test & Metrology`

### Phase4 個別銘柄ランキング

上位は次の並びだった。

1. `SNDK`
2. `MU`
3. `CSCO`
4. `NTAP`
5. `LOGI`

## 現時点の読み

- この prototype は「ET 内でどこが strongest pocket か」を見る用途には使える
- ただし今の ranking は `平均 rankScore + 平均 perf3m` 寄りなので、ユーザー意図の
  - `強い銘柄がどれだけ多いか`
  - `1銘柄ヒーロー依存ではないか`
  をまだ十分には表現していない
- その影響で `AI Compute` が感覚より下に出る日がありうる

## 次に見るとよさそうな点

1. `Phase2 / Phase3` の順位ロジックを breadth 寄りに調整する
   - 例: top stock count
   - 52w 高値圏比率
   - 上位スコア銘柄数
   - 1銘柄集中ペナルティ
2. `Network Infrastructure` を ET の primary tree に残すか再検討する
   - `Communications` 側に寄せるか
3. `Optical / Photonics` と `AI Compute` が現状順位で低めに出る理由を分解する
4. 同じ focused hierarchy を `Communications` に横展開する

## 関連コミット

- taxonomy 実装: `3f4473e` `feat: refine electronic technology theme taxonomy`
- hierarchy prototype: `139d5f6` `feat: add electronic technology hierarchy screener`
