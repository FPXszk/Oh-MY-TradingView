# Exec-plan: yahoo-finance-fundamentals-repair_20260604_1128

作成日時: 2026-06-04 11:28 JST

目的: 現在 401 で壊れている Yahoo Finance fundamentals 取得経路を調査し、**日本株・米国株の両方で実用的に取得できる経路へ置き換える**。併せて EDINET の位置づけ（無料/登録要否/役割）をユーザーに説明できる状態にする。

## 成功条件

- `getSymbolFundamentals()` の Yahoo 経路が、少なくとも日本株・米国株の代表銘柄で 401 ではなく値を返す
- 既存の返却 contract（`marketCap`, `trailingPE`, `revenueGrowth`, `earningsGrowth`, `returnOnEquity`, `debtToEquity` など）を可能な範囲で維持できる
- どの指標が Yahoo 新経路で取れて、どれが取れないかを明示できる
- EDINET の無料/登録要否/運用コストを公式情報ベースで説明できる

## 前提とスコープ

- 今回は Yahoo fundamentals 修正を主対象とする
- 日本株 daily screener 全体の provider 置換までは行わない
- Yahoo の非公開 endpoint を使う以上、安定性リスクは残る。そのリスクは説明する

## 変更・確認対象ファイル

| ファイル | 区分 | 用途 |
|---|---|---|
| `docs/exec-plans/active/yahoo-finance-fundamentals-repair_20260604_1128.md` | CREATE | 本計画 |
| `src/core/market-intel.js` | MODIFY | Yahoo fundamentals 実装を `quoteSummary` から使える経路へ差し替え |
| `tests/market-intel.test.js` | MODIFY | Yahoo fundamentals の mock / contract を新経路へ更新 |
| `tests/market-intel-analysis.test.js` | MODIFY候補 | fundamentals mock 前提に影響があれば更新 |
| `docs/exec-plans/completed/yahoo-finance-fundamentals-repair_20260604_1128.md` | MOVE | 完了時移動 |

## 実装ステップ

- [x] Step 1: Yahoo の現行 401 原因と代替 endpoint を再確認する
  - 確認: `quoteSummary` は US/JP とも 401、`fundamentals-timeseries` は 200
- [x] Step 2: `market-intel.js` の Yahoo fundamentals 実装を差し替える
  - 確認: 必須返却フィールドを新経路で埋める
- [x] Step 3: テストを新経路に合わせて更新する
  - 確認: `tests/market-intel.test.js` が通る
- [x] Step 4: 代表銘柄で US/JP 実取得確認を行う
  - 確認: `AAPL` と `6806.T` などで成功レスポンス
- [x] Step 5: EDINET の説明と、Yahoo/EDINET の役割分担を整理して報告する
  - 確認: 無料/登録要否/向き不向きを説明できる

## テスト・検証方針

- `node --test tests/market-intel.test.js`
- 必要時 `node --test tests/market-intel-analysis.test.js`
- 実地確認:
  - `getSymbolFundamentals('AAPL')` with Yahoo mode
  - `getSymbolFundamentals('6806.T')` with Yahoo mode

## リスク・注意点

- Yahoo fundamentals は公式 developer API ではなく、今後の仕様変更リスクがある
- 代替 endpoint で全く同じ指標セットを 1 発取得できるとは限らない
- `marketCap` や `trailingPE` など一部指標は別 endpoint 併用になる可能性がある
