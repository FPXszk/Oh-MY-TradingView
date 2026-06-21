# USスクリーナー FCF補完・時価総額ゲート・NBIS対応 実行計画

## ゴール

米国 daily screener について、次の状態を実現する。

1. TradingView の FCF 系指標が欠損した銘柄を、利用可能な補助データで補完してから評価する
2. 米国ランキング掲載対象を原則として時価総額 $30B 以上に絞り、それ未満はレポート表に出さない
3. NBIS のような AI cloud / neocloud 銘柄を Technology Services 側から候補に入れられるようにする
4. Phase1 → 中テーマ → 小テーマ → 個別株の流れが、上位セクター複数件を対象にした意図どおりの構造か確認し、必要最小限の調整を入れる

## 前提と解釈

- 「30 billion以上」は US screener の Phase4 個別銘柄掲載対象に対する hard gate として扱う。
- $30B 未満は除外候補として内部的に検出できても、daily-ranking の Phase4 表には掲載しない。
- FCF は重要指標なので、TradingView 欠損時は補助データで `fcfTtm`, `fcfMargin`, `pFcf`, `cashConversion`, `ruleOf40` を可能な範囲で埋める。
- 補助データの優先順位は、既存の取得経路に合わせて Moomoo / TradingView 追加列 / 公式開示由来の手動・静的補助データの順に検討する。
- NBIS の足元は TradingView 上 `Technology Services / Packaged Software` なので、Electronic Technology だけを対象にする実装では拾えない。AI cloud / neocloud を Technology Services 側のテーマとして扱う。
- CRWV は比較対象として見られるようにするが、EPS や52週高値位置など既存条件を満たさない場合は無理に通さない。

## 変更ファイル一覧

| ファイル | 操作 | 内容 |
|---|---|---|
| `docs/exec-plans/active/us-screener-fcf-supplement-marketcap-nbis_20260622_0048.md` | CREATE | 本計画 |
| `src/core/fundamental-screener.js` | MODIFY | US FCF 欠損補完、$30B gate、補完メタデータ、NBIS評価経路の反映 |
| `src/core/sector-screening-profiles.js` | MODIFY | US market cap threshold を $30B へ引き上げ、必要なら Technology Services / AI cloud profile の扱いを調整 |
| `src/core/theme-taxonomy.js` | MODIFY | 必要最小限で AI Cloud / Neocloud テーマ分類を通す |
| `config/screener/theme-taxonomy-us.json` | MODIFY | NBIS / CRWV を AI cloud / neocloud 小テーマに追加 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | 補完済み FCF の表示・注記、$30B gate の説明、複数セクター階層表示の整合 |
| `.github/workflows/daily-screener.yml` | MODIFY | 必要なら `SCREENER_FORCE_PHASE1_SECTORS` または関連 env を追加し、Technology Services を候補に含める |
| `tests/fundamental-screener.test.js` | MODIFY | FCF 欠損補完、$30B 未満除外、NBISが候補化できることを固定 |
| `tests/daily-screener-report.test.js` | MODIFY | レポートから $30B 未満が消えること、補完注記が出ることを固定 |
| `tests/theme-taxonomy.test.js` | MODIFY | AI cloud / neocloud 分類を固定 |
| `docs/reports/screener/daily-ranking.md` | MODIFY | 実行結果更新 |
| `docs/reports/screener/daily-ranking-run.json` | MODIFY | 実行メタデータ更新が発生する場合のみ |
| `docs/exec-plans/completed/us-screener-fcf-supplement-marketcap-nbis_20260622_0048.md` | MOVE | 完了時に移動 |

## 実装内容

### A. FCF 欠損補完

- TradingView の `free_cash_flow_margin_ttm`, `free_cash_flow_ttm`, `cash_f_operating_activities_ttm`, `price_free_cash_flow_ttm` が欠けた銘柄を抽出する。
- 既存の Moomoo 補助経路を確認し、使える値があれば `fcfTtm`, `fcfMargin`, `pFcf`, `cashConversion` に反映する。
- Moomoo で十分に埋まらない銘柄は、まず最小限の静的補助データ構造を用意し、NBIS の公式Q1 2026由来の operating cash flow / capex / cash balance を補助メタとして持てる形にする。
- FCF の定義は `operating cash flow - purchases of property/equipment/intangibles` を基本にし、公式開示の表記差異は補助メタに source として残す。
- 補完値を使った場合は `fundamentalSupplement` のようなメタデータを行に付与し、レポートで「補完済み」と分かるようにする。

### B. $30B 時価総額 gate

- US profile の `marketCapMinUsd` を $30B へ引き上げる。
- server-side filter と client-side / report-side の両方で $30B 未満が混入しないことを確認する。
- Japan screener には影響させない。

### C. NBIS / Technology Services / AI cloud 対応

- `config/screener/theme-taxonomy-us.json` に AI Cloud / Neocloud 小テーマを追加し、`NBIS`, `CRWV` を分類対象にする。
- Phase1 採用は現状 `SCREENER_SELECTED_SECTOR_COUNT=3` で上位3セクターを選ぶ設計なので、固定1本ではないことを確認する。
- ただし強いセクター上位に Technology Services が入らない局面でも NBIS を見たい場合に備え、`SCREENER_FORCE_PHASE1_SECTORS` または明示的な追加セクター方式で `Technology Services` を含める最小変更を検討する。
- CRWV は比較対象として分類されるが、EPS > 0 / 52週高値位置 / FCF など既存条件に反する場合は落とす。

### D. 階層表示の整理

- 現状は Phase1 上位3セクターを候補取得に使うが、hierarchy 表示は `hierarchyFocusSector` 未指定時に1位セクターへ寄る。
- ユーザーのイメージに近づけるには、複数セクターの中テーマ・小テーマを統合ランキングするか、セクター別に階層を出す必要がある。
- 今回は FCF 補完を優先し、階層表示の大改造は避ける。必要最小限として「Phase1上位3を候補取得に使っていること」と「階層表示のフォーカス」をレポート上で誤解しにくくする。

## 実装ステップ

- [ ] 現行 Phase1 採用ロジックと hierarchy focus の表示差をテスト・コードで確認する
- [ ] $30B gate の RED テストを追加する
- [ ] FCF 欠損補完の RED テストを追加する
- [ ] AI Cloud / Neocloud taxonomy の RED テストを追加する
- [ ] US profile / screener 本体へ $30B gate を実装する
- [ ] FCF 補完処理と補完メタデータを実装する
- [ ] NBIS が Technology Services 経由で候補化できる最小変更を実装する
- [ ] レポート表示と説明文を更新する
- [ ] ローカルテストと live screener 実行で検証する
- [ ] 差分レビュー後、plan を `completed/` に移動する

## テスト戦略

- RED
  - `$30B` 未満の US 銘柄が matched / Phase4 に残らないテストを追加する。
  - TradingView FCF 欠損行に補助データがある場合、`fcfMargin`, `pFcf`, `ruleOf40` が補完されるテストを追加する。
  - NBIS が AI Cloud / Neocloud に分類され、Technology Services profile の候補として評価されるテストを追加する。
- GREEN
  - 既存構造に沿った小さな関数追加でテストを通す。
  - Moomoo / 公式補助データが使えない場合でも null のまま安全に継続する。
- REFACTOR
  - Phase1/Phase2/Phase3 の大規模再設計は行わず、必要な説明と最小補助関数に留める。

## 検証コマンド

```bash
node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js tests/theme-taxonomy.test.js
node scripts/screener/run-fundamental-screening.mjs
git diff --check
```

必要に応じて、NBIS 単体評価を次で確認する。

```bash
node --input-type=module -e "import { evaluateSymbolsAgainstFundamentalScreener } from './src/core/fundamental-screener.js'; console.log(JSON.stringify(await evaluateSymbolsAgainstFundamentalScreener({ symbols: ['NASDAQ:NBIS'], _deps: { exchangeAllowlist: ['NASDAQ','NYSE'], resultLimit: 90 } }), null, 2));"
```

## 影響範囲

- 影響あり
  - US daily screener の候補銘柄数と Phase4 掲載銘柄
  - US ranking score の FCF / PFCF / Rule40 欠損扱い
  - NBIS / CRWV など Technology Services 内の AI cloud 銘柄の分類
  - レポートのフィルター説明
- 影響なし
  - Japan screener の EDINET 補完
  - Portfolio Health Check
  - backtest / Pine Script 系

## リスク

1. 公式開示由来の FCF は四半期値であり、TradingView の TTM 指標と期間が揃わない可能性がある。
2. NBIS の operating cash flow は顧客前払いの影響が大きく、通常の成熟企業の FCF margin と同列比較すると過大評価になる可能性がある。
3. $30B gate により小型高モメンタム銘柄はかなり消える。これは今回の意図どおりだが、候補数は減る。
4. Technology Services を強制採用すると、強いセクター順という Phase1 の思想が少し弱まる。採用方式は「上位セクター + 明示テーマ例外」として説明する。

## スコープ外

- Phase1/Phase2/Phase3 の全面的な再設計
- 外部ニュースをスコアに直接入れる実装
- CRWV を条件未達でも通す例外処理
- GitHub Actions runner / LINE 通知の変更

## 競合確認

- `docs/exec-plans/active/japan-screener-granularity-and-source-feasibility_20260602_1447.md` は Japan 側の粒度検討であり、今回の US FCF 補完とは直接競合しない。
- `docs/exec-plans/active/japan-screener-theme-implementation-and-live-debug_20260602_1500.md` は Japan 側のテーマ実装であり、今回の US taxonomy 追加とはファイルが一部似るが market が異なる。
- `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md` は説明ドキュメント計画であり、今回の実装とは直接競合しない。
