# USスクリーナー N/A指標補完 実行計画

## ゴール

米国 daily screener の Phase4 表について、TradingView だけで欠損した指標を既存の補助データ経路で可能な範囲まで補完し、N/A の理由を区別できるようにする。

## 前提と解釈

- 前回実装した `US FCF補完` は FCF 系のみを対象にしており、EPS YoY / ATR / beta / EV/EBITDA などの表内 N/A 全般は補完していない。
- `P/FCF` は FCF が正のときだけ意味のある倍率なので、FCF がマイナスまたはゼロの場合は、補完後も N/A のままにする。
- EPS YoY は Moomoo の `earningsGrowth` が取れる場合に補完する。TradingView EPS YoY と同じ完全定義とは限らないため、補完メタデータに source を残す。
- ATR% は現状 TradingView の `ATR` と `close` から計算している。TradingView 側の ATR 自体が欠損した場合、Moomoo fundamentals では埋まらないため、今回は補完アダプタの口だけ作り、取得可能データがある場合に埋める。
- N/A をゼロや中立値で埋めることはしない。信頼できる値がない場合は N/A のまま残す。

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
|---|---|---|
| `docs/exec-plans/active/us-screener-missing-metrics-supplement_20260622_0108.md` | CREATE | 本計画 |
| `src/core/fundamental-screener.js` | MODIFY | US missing metrics 補完レイヤーを追加し、Moomoo/注入アダプタで EPS YoY / P/FCF / ATR% 等を補完 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | レポートに missing metrics 補完の件数・方針を表示し、N/A説明を更新 |
| `tests/fundamental-screener.test.js` | MODIFY | Moomoo EPS YoY / P/FCF 補完、マイナスFCF時の P/FCF N/A維持、ATR注入補完を固定 |
| `tests/daily-screener-report.test.js` | MODIFY | 補完方針表示と N/A説明の更新を固定 |
| `docs/reports/screener/daily-ranking.md` | MODIFY | 実行結果更新 |
| `docs/exec-plans/completed/us-screener-missing-metrics-supplement_20260622_0108.md` | MOVE | 完了時に移動 |

## 実装内容

### A. US missing metrics 補完レイヤー

- `applyUsMissingMetricSupplements` を追加し、US rows に対して FCF補完後に実行する。
- 既存の `batchFetchMoomooGrowthMetrics` を拡張し、`earningsGrowthPct` だけでなく `pcfTtm` も受け取れるようにする。
- `_deps.getUsMissingMetricSupplementals` を追加し、ATR% など Moomoo fundamentals 以外から取れる値を注入できるようにする。
- 補完対象は次の順に扱う。
  - `epsGrowthTtm`: TradingView 欠損時のみ Moomoo `earningsGrowth` で補完
  - `pFcf`: TradingView欠損時のみ Moomoo `pcfTtm` または公式補完で計算。ただし値が正の場合のみ採用
  - `atrPct`: TradingView欠損時のみ注入アダプタ値を採用
  - `beta1y`, `evEbitda`, `debtToEquity`: 注入アダプタが値を返す場合のみ採用

### B. 補完メタデータ

- 行に `missingMetricSupplement` を付与し、どの source でどの key を埋めたかを残す。
- `sourceDetails.usMissingMetricSupplement` に補完行数・補完シンボル・補完フィールド内訳を出す。

### C. レポート表示

- source coverage に `US 指標補完` を追加する。
- フィルターガイドの EPS YoY 説明を「TradingView 欠損時は補助データで補完、なければ N/A」に更新する。
- Moomoo補助の説明から「EPS YoY は補完しない」という古い文言を削除する。

## 実装ステップ

- [ ] 既存の Moomoo 補助経路と Phase4 表の N/A列を確認する
- [ ] EPS YoY / P/FCF / ATR% 補完の RED テストを追加する
- [ ] US missing metrics 補完レイヤーを実装する
- [ ] レポートの補完件数・N/A説明を更新する
- [ ] ローカルテストと live screener 実行で検証する
- [ ] 差分レビュー後、plan を `completed/` に移動する

## テスト戦略

- RED
  - TradingView EPS YoY が null でも Moomoo `earningsGrowth` があれば `epsGrowthTtm` が埋まる。
  - TradingView P/FCF が null でも Moomoo `pcfTtm` が正なら `pFcf` が埋まる。
  - FCFがマイナスの銘柄は `P/FCF` を N/A のままにする。
  - 注入アダプタが `atrPct` を返した場合だけ ATR% が埋まる。
- GREEN
  - 既存の scoring / ranking pipeline に補完レイヤーを足し、ランキング前に値を反映する。
- REFACTOR
  - 大きな外部API統合は追加せず、既存Moomoo経路と注入可能な小さなアダプタに留める。

## 検証コマンド

```bash
node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js
node scripts/screener/run-fundamental-screening.mjs
git diff --check
```

## 影響範囲

- 影響あり
  - US daily screener の Phase4 表の EPS YoY / P/FCF / ATR% などの N/A表示
  - growth / riskValue block のランキング
  - レポートの補完方針説明
- 影響なし
  - Japan EDINET 補完
  - Phase1 sector momentum
  - taxonomy / theme hierarchy

## リスク

1. Moomoo EPS growth と TradingView EPS YoY の定義・期間が完全一致しない可能性がある。
2. Moomoo `PCF_TTM` は TradingView `P/FCF` と近似だが、完全一致しない可能性がある。
3. ATR% は fundamentals API ではなく価格時系列系の指標なので、今回の実装だけでは全銘柄を自動補完できない。
4. 補完でランキングが動くため、レポート掲載順が変わる可能性がある。

## スコープ外

- 全N/Aを必ず埋めるための有料データ/API契約追加
- ATR% の価格時系列API本実装
- 過去レポートの再生成
- Japan screener の補完仕様変更

## 競合確認

- `docs/exec-plans/active/japan-screener-granularity-and-source-feasibility_20260602_1447.md` は Japan 側調査であり直接競合しない。
- `docs/exec-plans/active/japan-screener-theme-implementation-and-live-debug_20260602_1500.md` は Japan テーマ実装であり直接競合しない。
- `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md` は説明ドキュメント計画であり直接競合しない。
