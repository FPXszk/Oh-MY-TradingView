# Exec-plan: sector-specific-screening-profiles_20260505_1432

## 概要

目的: 現在の `runFundamentalScreener` が全セクターへ一律適用しているファンダメンタル閾値を、**実データで検証した sector-aware 条件**へ置き換える。  
対象は **US / Japan の Phase2 銘柄スクリーニング** で、Phase1 はそのまま使いつつ、Phase2 で **セクター別条件** と **除外セクター** を適用する。

今回の事前調査で確認した重要点:

- 既存 Phase2 の実フィールドは `sector`, `industry`, `RSI`, `Perf.3M`, `relative_volume_10d_calc`, `market_cap_basic`, `earnings_per_share_diluted_ttm`, `return_on_equity`, `gross_margin_ttm`, `free_cash_flow_margin_ttm`, `free_cash_flow_ttm`
- TradingView Scanner API は **`sector` / `industry` の server-side `equal` filter** が使える
- したがって、今回の実装は **広域 1 本取り + client-side 切り分け** よりも、**sector/group ごとの request 分割** の方が素直で、400 件 cap の偏りも減らせる
- 半導体サンプルでは stock `subtype` は全て `common` で、**fabless / IDM / foundry 判定には使えない**
- そのため Semiconductor の business-model 分岐は **symbol-based override** が必要
- 現状の US run では:
  - `MU` は **ほぼ P/FCF だけで落ちている**（現行値だと約 `63.2`）
  - `QCOM` は **相対出来高だけ**で落ちている
  - `AMD` は **ROE と P/FCF** で落ちている
  - `NVDA` は現時点の live data では **RSI / relative volume / Perf.3M / P/FCF** を満たしていない
- 現状の Japan run では global server-side 条件が強すぎて、Japan market 全体で **2銘柄**しか残らず、`TSE + jpx-prime` に絞ると **実質 `8035` だけ**になる
- `8035` は現行条件下では **P/FCF ≈ 65.2** が主因で最終落ち
- `SNDK` は現行 Scanner taxonomy では **`industry=Computer Peripherals`** で、`Semiconductors` ではない

## 変更ファイル

- `docs/exec-plans/active/sector-specific-screening-profiles_20260505_1432.md`（この計画のみ）
- `src/core/sector-screening-profiles.js`
  - 新規作成
  - US / Japan の sector group 定義
  - sector / industry 条件
  - 閾値セット
  - Financials / Real Estate / Utilities の Phase2 除外ルール
- `src/core/semiconductor-business-models.js`
  - 新規作成
  - fabless / IDM / foundry の symbol override
  - `MU`, `INTC`, `TSM`, `NVDA`, `AMD`, `QCOM` などの判定 SoT
- `src/core/fundamental-screener.js`
  - 現行の global 一括 request を、sector-aware profile ごとの request + merge に変更
  - sector ごとの server-side filter 適用
  - Semiconductor の P/FCF 分岐
  - JP 用 profile 適用
  - 除外セクターの Phase2 skip
- `scripts/screener/run-fundamental-screening.mjs`
  - report template の全面刷新は行わず、**criteria 表示だけは sector-aware 実装に合わせて正す**
  - 除外セクターや active profile の説明を最小限追加
- `tests/fundamental-screener.test.js`
  - sector-aware profile 適用テスト
  - Semiconductor business-model 分岐テスト
  - Financials / Real Estate / Utilities 除外テスト
  - JP サンプルの緩和確認テスト
- `tests/daily-screener-report.test.js`
  - criteria / note 表示が sector-aware 実装と矛盾しないことを確認

## 影響範囲

- `tv screener fundamental`
- `scripts/screener/run-fundamental-screening.mjs`
- `.github/workflows/daily-screener.yml`
- `.github/workflows/daily-screener-japan.yml`

workflow ファイル自体は基本的に変更しない想定だが、実装結果として report の criteria 記述内容は変わる。

## 範囲外

- 依頼前メッセージにあった **レポートの見やすさテンプレート全面見直し**
  - 今回は **フィルタ実装だけ**に絞る
  - ただし criteria 表示が嘘になるのは避けるため、最小限の表示修正は含む
- Phase1 セクターモメンタム ranking ロジック自体の再設計
- 新しい外部 API の追加
- 金融/REIT/Utilities 向けの専用会計指標（ROA, FFO など）を新規導入する対応

## 実装方針

### 1. US

- Group A/B/C/D/E をそのまま鵜呑みにせず、**live sample data を通した最小修正版**を profile module に定義する
- Semiconductor は `industry=Semiconductors` を主軸にしつつ、Scanner taxonomy と user expectation のズレがある銘柄（例: `SNDK`）は **explicit override** を検討する
- business model 判定は Scanner field では取れないので、**symbol override** で `P/FCF` ceiling を分岐する

### 2. Japan

- Japan は current global threshold で universe が潰れているため、**別 profile set** を作る
- 少なくとも今回 live probe で確認した
  - `Producer Manufacturing`
  - `Electronic Technology`
  - `Process Industries`
  - `Communications`
  - `Distribution Services`
  - `Finance`
  を見て、JP 側の会計実態に合う threshold に寄せる
- `Finance` は US と同様に Phase2 除外候補として扱う

### 3. 実装方式

- `sector` / `industry` が server-side で切れるので、profile ごとに request を発行して merge する
- 共通 client-side 条件は
  - `close > SMA200`
  - `close > SMA50`
  - `52週高値比率`
  などの price-based 条件へ寄せる
- sector-specific な profitability / valuation 条件は profile ごとに評価する

## 実施ステップ

- [ ] RED: sector-aware 条件の期待値をテストへ落とす
  - US sample: `MU`, `QCOM`, `AMD`, `NVDA`, `INTC`, `SNDK`, `TSM`
  - JP sample: `8035`, `7203`, `9984`, `4063`, `8001`, `8002`, `8306`
  - 除外 sector: Financials / Real Estate / Utilities

- [ ] profile / classifier module を新設する
  - sector group 定義
  - threshold テーブル
  - semis business-model override

- [ ] `runFundamentalScreener` を sector-aware 実装へ差し替える
  - per-profile scanner request
  - merged candidate normalization
  - ranking / Yahoo enrichment / exclusion との整合

- [ ] report の criteria / note を整合させる
  - global 一律条件のままに見えないように修正

- [ ] repo tests で収束させる

## テスト戦略

- **RED**
  - `tests/fundamental-screener.test.js` に sector-aware failure / pass ケースを追加
  - `MU` が現行 global 条件では落ち、sector-aware 条件ではどう扱うべきかを固定
  - Japan が current global 条件では 0 件化しやすいことを踏まえ、JP profile で sample がどう変わるかを固定

- **GREEN**
  - profile module / classifier module / screener orchestration を実装してテスト通過

- **REFACTOR**
  - threshold 定義を `fundamental-screener.js` から追い出し、profile module へ閉じ込める
  - hardcode は semis business-model override の最小範囲に限定する

## 検証コマンド

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `npm run test:unit`

## リスク・注意点

- TradingView taxonomy と投資家の慣用 sector 分類が一致しない
  - 例: `SNDK` は current Scanner 上では `Computer Peripherals`
- Yahoo `revenueGrowth` は live probe で null が多く、現行 code も null pass になっている
  - sector-aware 実装でも revenue growth 条件の意味づけに注意が必要
- JP は TSE でも sector ごとの margin / ROE 水準差が大きく、US group の単純移植は危険
- per-profile request にすると API call 数が増えるため、request 数と candidate merge の整理が必要

## 競合確認

- `docs/exec-plans/active/run-night-batch_20260429_2344.md`
- `docs/exec-plans/active/night-batch-rerun-focus8-200pack_20260505_0300.md`
- `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md`

いずれも直接のファイル競合はない。

---

作成者: Copilot
作成日時: 2026-05-05T14:32:00+09:00
