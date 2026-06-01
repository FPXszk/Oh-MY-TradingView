# Electronic Technology Hierarchy Config / Phase2-4 Handoff 20260601_1753

## 今回やったこと

- `Electronic Technology` の中テーマを、ユーザー指定の 8 分割へ整理した
- その 8 中テーマの下に置く小テーマも確定した
- これを今後 `Producer Manufacturing` などにも横展開できるように、**ロジック直書きではなく外部 config 化する方針**で合意した
- さらに、hierarchy の表示を
  - `Phase1`: セクター順位
  - `Phase2`: Phase1 1位セクターの中テーマ順位
  - `Phase3`: Phase2 上位半分の中テーマに属する小テーマ順位
  - `Phase4`: Phase3 上位 3 小テーマに属する個別株順位
  へ寄せる計画を作成した

## 確定した Electronic Technology の 8 中テーマ

1. `AI Compute`
2. `Memory`
3. `Semiconductor Equipment`
4. `Connectivity / Networking`
5. `Optical / Photonics`
6. `Electronic Components`
7. `Defense / Space Electronics`
8. `Industrial / Power Electronics`

## 確定した小テーマ

### `AI Compute`

- `AI Accelerators`
- `AI Servers / Systems`
- `AI Interconnect / CXL / Data Center Fabric`

### `Memory`

- `HBM / DRAM`
- `NAND / Storage`
- `Memory Controllers / Interface IP`

### `Semiconductor Equipment`

- `Wafer Fab Equipment`
- `Test / Metrology / Inspection`
- `Advanced Packaging / Assembly`

### `Connectivity / Networking`

- `Ethernet Switching / Routing`
- `RF / Mobile Connectivity`
- `Carrier / Optical Networking`
- `Wireless Infrastructure`

### `Optical / Photonics`

- `Optical Transceivers`
- `Coherent Optics / Fiber`
- `Laser / Photonics`

### `Electronic Components`

- `MLCC / Passive Components`
- `Connectors / Interconnect`
- `Sensors / Precision Components`

### `Defense / Space Electronics`

- `Secure Comms / Sensors`
- `Drone / Autonomy Electronics`
- `Satellite / Space Communications`

### `Industrial / Power Electronics`

- `Factory Automation / Motion Control`
- `Industrial Electrification`
- `Grid Equipment / Power Conversion`
- `Power Cooling / Thermal Management`

## 重要な方針

### 1. 外部定義ファイルを新設する

次担当は `config/screener/theme-hierarchy-us.json` を新設する前提でよい。

意図:

- `Electronic Technology` の hierarchy 正本をそこへ置く
- 他セクターも同じ schema で後から追加できるようにする
- 今回は `Producer Manufacturing` などは **空 placeholder でよい**

### 2. 既存 11 テーマを 8 テーマへ畳み直す

統合の意図は次の通り。

- `Connectivity Silicon` + `Network Infrastructure`
  -> `Connectivity / Networking`
- `Defense Tech` + `Space`
  -> `Defense / Space Electronics`
- `Industrial Automation` + `Power & Grid`
  -> `Industrial / Power Electronics`

### 3. hierarchy を出すのは 1 位セクターだけ

ユーザー意図としては、全セクターに常時 hierarchy を出すのではなく、

- `Phase1` で 1 位に選ばれたセクター
- かつ config に hierarchy 定義があるセクター

に対してのみ、`Phase2 -> Phase3 -> Phase4` を出したい。

つまり、まず ET 実装でよいが、将来的には「1位になった他セクターでも同じ仕組みが動く」形が狙い。

### 4. Phase3 と Phase4 の絞り込み

- `Phase3`
  - Phase2 の中テーマランキングの **上位半分**
  - 丸めは今の計画では `Math.ceil(n / 2)` 案
- `Phase4`
  - Phase3 の小テーマランキング **上位 3 小テーマ**
  - その所属銘柄だけを最終ランキング

## 今回作った計画

計画ファイル:

- [electronic-technology-hierarchy-config-and-phase234_20260601_1750.md](/home/fpxszk/code/Oh-MY-TradingView/docs/exec-plans/active/electronic-technology-hierarchy-config-and-phase234_20260601_1750.md:1)

この plan はすでに `main` へ commit / push 済み。

## 実装で触る前提の主ファイル

- `config/screener/theme-hierarchy-us.json`
  - 新規
- `config/screener/theme-taxonomy-us.json`
- `config/screener/external-theme-reference-us.json`
- `src/core/theme-taxonomy.js`
- `src/core/fundamental-screener.js`
- `scripts/screener/run-fundamental-screening.mjs`
- `tests/theme-taxonomy.test.js`
- `tests/fundamental-screener.test.js`
- `tests/daily-screener-report.test.js`

## 実装前に見ておくとよい既存資料

- [electronic-technology-middle-theme-research_20260601.md](/home/fpxszk/code/Oh-MY-TradingView/docs/strategy/electronic-technology-middle-theme-research_20260601.md:1)
  - ET の中テーマ整理メモ
- [hierarchical-theme-taxonomy-architecture_20260601.md](/home/fpxszk/code/Oh-MY-TradingView/docs/strategy/hierarchical-theme-taxonomy-architecture_20260601.md:1)
  - Phase1-4 の設計意図
- [electronic-technology-hierarchy-handoff_20260601_1535.md](/home/fpxszk/code/Oh-MY-TradingView/docs/sessions/electronic-technology-hierarchy-handoff_20260601_1535.md:1)
  - 旧 focused hierarchy prototype の handoff

## 直近コミット

- `8adb690`
  - `docs: summarize electronic technology middle theme research`
- `a4d04cb`
  - `docs: electronic-technology-hierarchy-config-and-phase234_20260601_1750`

## 次の担当が最初にやること

1. `theme-hierarchy-us.json` の schema を決めて ET を投入
2. ET の既存 taxonomy を 11 -> 8 中テーマへ畳み直す
3. `focusedHierarchy` を `Phase1 1位セクターのみ` 発火へ変更
4. `Phase3=上位半分 middle themes`、`Phase4=上位3 small themes` をテストで固定
5. 実行して `docs/reports/screener/daily-ranking.md` を確認

## 補足

- 今回は **計画まで**。実装はまだ入っていない
- ユーザーは「次の人に引き継いで、その人に実装させる」前提
