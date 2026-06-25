# TradingView Heatmapと米国株スクリーナーのセクター整合性調査

調査日: 2026-06-26 JST

## 概要

米国株スクリーナーのPhase1/Phase2大セクター分類とTradingView Stock Heatmapを比較した。

結論は次のとおり。

- **Phase1、Phase2、TradingView Stock Heatmap、TradingView公式の米国セクター一覧は、同じ20セクターで完全一致する。**
- Phase1はTradingView scanner APIの`sector`フィールドを加工せず、そのまま集計キーとして使っている。
- Phase2は同じ`sector`文字列をscanner APIのfilterへ渡している。20セクターすべてに対応するプロファイルがある。
- `Electronic Technology / Semiconductors`は追加セクターではない。`Electronic Technology`の中を`industry`で分けるPhase2プロファイル表示名である。
- Stock Heatmapも内部的にTradingView scanner backendへPOSTし、`sector`でグループ化し、表示名には`sector.tr`を使っている。
- TradingView公式説明では、このsector/industry分類は**FactSet Industries and Economic Sectors**モデルであり、主な売上を生む事業を基準とする階層分類である。

したがって、現状のPhase1/Phase2大セクター分類は、**TradingView Stock Heatmap基準として問題ない**。repo内の正本は、引き続きTradingView scannerのraw `sector`値とするのが妥当である。

## 調査対象

- `src/core/sector-momentum.js`
- `src/core/fundamental-screener.js`
- `src/core/sector-screening-profiles.js`
- `docs/reports/screener/daily-ranking.md`
- `https://www.tradingview.com/heatmap/stock/`
- TradingView公式Help CenterのSector & Industry説明
- TradingView公式米国セクター一覧
- Stock Heatmapが読み込む公式JavaScript bundleとscanner request

## Phase1の現状

### 分類データの取得元

`src/core/sector-momentum.js`の`STOCK_COLUMNS`は`sector`をTradingView scannerへ要求する。

取得先:

```text
POST https://scanner.tradingview.com/america/scan
```

主なrequest条件:

```json
{
  "markets": ["america"],
  "symbols": { "query": { "types": ["stock"] }, "tickers": [] },
  "columns": ["name", "sector", "..."],
  "filter": [
    {
      "left": "market_cap_basic",
      "operation": "egreater",
      "right": 1000000000
    }
  ]
}
```

`normalizeStockRow()`は次のようにscanner応答をそのまま格納する。

```js
sector: row.d[STOCK_COL['sector']] ?? 'Unknown'
```

`runStockAggregation()`は`row.sector`をMapのキーとして集計する。独自の名前変換、GICS変換、セクター統合は行っていない。

```js
const key = row.sector ?? 'Unknown';
```

Phase1はこのグループ単位で12M/6M/3M、SMA、52週高値接近率などを集計し、順位合計で並べている。

### Phase1のセクター一覧

2026-06-26 JSTにscanner APIをNASDAQ/NYSE、時価総額10億ドル超で全ページ取得した。

- scanner reported: 4,026件
- NASDAQ/NYSE対象: 2,660件
- sector数: 20

| # | TradingView scanner sector |
|---:|---|
| 1 | Commercial Services |
| 2 | Communications |
| 3 | Consumer Durables |
| 4 | Consumer Non-Durables |
| 5 | Consumer Services |
| 6 | Distribution Services |
| 7 | Electronic Technology |
| 8 | Energy Minerals |
| 9 | Finance |
| 10 | Health Services |
| 11 | Health Technology |
| 12 | Industrial Services |
| 13 | Miscellaneous |
| 14 | Non-Energy Minerals |
| 15 | Process Industries |
| 16 | Producer Manufacturing |
| 17 | Retail Trade |
| 18 | Technology Services |
| 19 | Transportation |
| 20 | Utilities |

現在の`docs/reports/screener/daily-ranking.md`のPhase1にも、同じ20セクターが表示されている。

## Phase2の現状

### プロファイルの基準

`src/core/sector-screening-profiles.js`は、Phase1で選択されたsector文字列と`phase1Labels`を完全一致で照合する。

有効になったプロファイルは、同じsector文字列を`requestScopes[].sector`としてscanner filterへ渡す。

```json
{
  "left": "sector",
  "operation": "equal",
  "right": "Electronic Technology"
}
```

つまりPhase2も、独自分類ではなくTradingView scannerの`sector`フィールドを直接利用している。

### Phase2のsector対応状況

- US profile数: 21
- unique `phase1Labels`: 20
- unique `requestScopes[].sector`: 20

Phase1の20セクターすべてにPhase2プロファイルが存在する。

| 比較 | 差分 |
|---|---|
| Phase1にあり、Phase2にない | なし |
| Phase2にあり、Phase1にない | なし |
| 名称違い | なし |

### `Electronic Technology / Semiconductors`について

これはTradingView sectorを追加しているわけではない。

- `phase1Labels`: `Electronic Technology`
- scanner request scope: `Electronic Technology`
- profile label: `Electronic Technology / Semiconductors`
- 行の振り分け: TradingView `industry`や銘柄別business model判定

同一sector内で閾値を分けるためのrepo固有プロファイル名であり、大セクター集合には影響しない。

## TradingView Heatmap分類の取得可否

### UIでの確認

公式Stock HeatmapをS&P 500、Group by Sectorで表示すると、scannerと同じ名称のセクター群が描画される。

Heatmap本体はcanvas描画であり、セクター名を通常のDOMテキスト一覧として安定取得することはできなかった。画面目視だけに依存するより、内部scanner応答を取得する方が正確である。

### network / JavaScriptからの取得

Heatmapが読み込む公式bundle:

```text
https://static.tradingview.com/static/bundles/market_heatmap.3048d74bc435ceb63f0b.js
```

調査時点のbundleでは、株式Heatmapのsector groupingが次の列で定義されている。

```text
groupKeys: ["sector"]
translatedKeys: ["sector.tr"]
```

同bundleはscanner backendの`scan`へPOSTし、次のquery labelを付加する。

```text
label-product=heatmap-stock
```

S&P 500 Heatmapのdatasetは次のsymbolsetで表現されている。

```text
SYML:SP;SPX
```

再現できたrequest:

```text
POST https://scanner.tradingview.com/america/scan?label-product=heatmap-stock
```

最小body例:

```json
{
  "columns": [
    "name",
    "description",
    "sector",
    "sector.tr",
    "industry",
    "market_cap_basic",
    "change"
  ],
  "markets": ["america"],
  "symbols": {
    "symbolset": ["SYML:SP;SPX"]
  },
  "range": [0, 1000],
  "sort": {
    "sortBy": "market_cap_basic",
    "sortOrder": "desc"
  }
}
```

応答は503行で、raw分類は`sector`、UI向け翻訳済みラベルは`sector.tr`に入る。

このendpointはHeatmap UIで実際に利用されているが、公開・安定APIとして文書化されたものではない。調査・整合性確認には利用できるが、長期互換性は保証されない。

## TradingViewの分類基準

TradingView公式Help Centerは、企業のsector/industry分類に**FactSet Industries and Economic Sectors**モデルを使用すると明記している。

特徴:

- proprietaryな階層分類
- 企業を主な売上を生む事業で分類
- 多角化企業も主力事業に基づいてsector/industryへ配置

したがって、現状の20セクターはGICS 11セクターではなく、FactSetのEconomic Sectors分類である。

## scanner sectorとHeatmap sectorの一致確認

比較した集合:

1. Phase1 scanner: NASDAQ/NYSE、時価総額10億ドル超、2,660銘柄
2. Phase2 unique request scope
3. Stock Heatmap S&P 500 scanner response: 503行
4. TradingView公式米国セクター一覧ページ

すべて同じ20セクターだった。

| Sector | Phase1 | Phase2 | Heatmap S&P 500 | TradingView公式一覧 |
|---|:---:|:---:|:---:|:---:|
| Commercial Services | Yes | Yes | Yes | Yes |
| Communications | Yes | Yes | Yes | Yes |
| Consumer Durables | Yes | Yes | Yes | Yes |
| Consumer Non-Durables | Yes | Yes | Yes | Yes |
| Consumer Services | Yes | Yes | Yes | Yes |
| Distribution Services | Yes | Yes | Yes | Yes |
| Electronic Technology | Yes | Yes | Yes | Yes |
| Energy Minerals | Yes | Yes | Yes | Yes |
| Finance | Yes | Yes | Yes | Yes |
| Health Services | Yes | Yes | Yes | Yes |
| Health Technology | Yes | Yes | Yes | Yes |
| Industrial Services | Yes | Yes | Yes | Yes |
| Miscellaneous | Yes | Yes | Yes | Yes |
| Non-Energy Minerals | Yes | Yes | Yes | Yes |
| Process Industries | Yes | Yes | Yes | Yes |
| Producer Manufacturing | Yes | Yes | Yes | Yes |
| Retail Trade | Yes | Yes | Yes | Yes |
| Technology Services | Yes | Yes | Yes | Yes |
| Transportation | Yes | Yes | Yes | Yes |
| Utilities | Yes | Yes | Yes | Yes |

### 差分一覧

| 比較 | 不足 | 余分 | 名称違い |
|---|---|---|---|
| Phase1 vs Phase2 | なし | なし | なし |
| Phase1 scanner vs Heatmap | なし | なし | なし |
| scanner vs TradingView公式米国一覧 | なし | なし | なし |

判定: **完全一致**

## 注意点

分類体系は同じだが、対象ユニバースは同じではない。

- Phase1: NASDAQ/NYSE、時価総額10億ドル超
- Heatmap初期表示: S&P 500

このためsectorの種類は一致しても、構成銘柄数、sector面積、順位、パフォーマンスは一致しない。HeatmapとPhase1の値を比較するときは、同じdatasetとフィルターにそろえる必要がある。

また、`sector.tr`は表示用翻訳ラベルである。repoのfilterや集合比較には、ロケール依存しないraw `sector`を使うべきである。

## 採用 / 不採用の判断

### 採用

- repo内の大セクター正本をTradingView scanner raw `sector`とする。
- Phase1はraw `sector`の直接集計を維持する。
- Phase2の`phase1Labels`と`requestScopes[].sector`はraw `sector`との完全一致を維持する。
- Heatmapとの回帰確認には、`label-product=heatmap-stock`と対象dataset symbolsetを使ったscanner responseの集合比較を利用する。

### 不採用

- Heatmap canvasの目視ラベルだけを正本にすること。
- `sector.tr`をfilterやrepo内キーに使うこと。
- GICS 11セクター等へ読み替えること。
- `Electronic Technology / Semiconductors`を独立sectorとして数えること。

## 今後の推奨方針

1. **TradingView scanner raw `sector`をrepo内の正とする。**
2. Phase2 profile追加・変更時は、Phase1 scanner sector集合との差分テストを行う。
3. Heatmap整合性は、UI目視に加えてscanner POSTで機械確認する。
4. 比較時はdataset差を明示する。Phase1とS&P 500 Heatmapのパフォーマンス値が違っても分類不一致とは判断しない。
5. TradingViewまたはFactSetの分類変更を検知するため、20セクター集合を定期的に再取得して差分監視できる。

## このプロジェクトへの接続点

- `src/core/sector-momentum.js`: raw `sector`直接集計を維持。
- `src/core/sector-screening-profiles.js`: unique sector scope 20件をPhase1集合と同期。
- `src/core/fundamental-screener.js`: Phase2 scanner filterにraw `sector`を使用。
- `docs/reports/screener/daily-ranking.md`: Phase1表示はTradingView/FactSet sector名称。

今回、分類コードの変更は行っていない。
