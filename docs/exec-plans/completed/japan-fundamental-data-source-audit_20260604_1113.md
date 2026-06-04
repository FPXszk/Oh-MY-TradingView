# Exec-plan: japan-fundamental-data-source-audit_20260604_1113

作成日時: 2026-06-04 11:13 JST

目的: 日本株スクリーニングで使っているファンダメンタル指標が **実際にどの程度取れているか** を監査し、TradingView / moomoo / Yahoo Finance / その他候補のうち、**日本株でどのデータ源を主軸にするのが最適か** の結論を出す。併せて `Rule of 40` が日本株レポートで `N/A` 表示になっている理由と、表示だけなら可能かも確認する。

## 成功条件

- 現行日本株レポートと内部結果から、主要指標ごとの欠損状況を確認できる
- TradingView / moomoo / Yahoo Finance / 必要なら他候補について、日本株で取得できる指標範囲と欠損傾向を比較できる
- 現行ロジックで「スクリーニングが信頼できるか」の判断材料を提示できる
- 日本株で最適なデータ取得戦略を、理由つきで結論化できる
- `Rule of 40` が日本株で `N/A` になっている理由と、表示対応の可否を説明できる

## 前提とスコープ

- 今回は **調査と結論出しが主目的**。必要がなければプロダクトコードは変更しない
- ただし、欠損監査のための既存スクリプト実行や read-only な比較コマンドは行う
- 公式仕様や provider の現状は変わり得るため、外部情報はその場で確認する

## 変更・確認対象ファイル

| ファイル | 区分 | 用途 |
|---|---|---|
| `docs/exec-plans/active/japan-fundamental-data-source-audit_20260604_1113.md` | CREATE | 本計画 |
| `docs/reports/screener/daily-ranking-jp.md` | READ | 日本株レポートの表示値と欠損確認 |
| `docs/reports/screener/daily-ranking-jp-run.json` | READ | 対象 run metadata 確認 |
| `src/core/fundamental-screener.js` | READ | 指標利用箇所、rank block、Rule of 40 の扱い確認 |
| `src/core/moomoo.js` | READ候補 | moomoo 側の取得可能指標確認 |
| `src/core/market-intel.js` | READ候補 | Yahoo 系取得ロジック確認 |
| `scripts/screener/run-fundamental-screening.mjs` | READ | レポート表示ロジック、Rule of 40 表示確認 |
| `tests/fundamental-screener.test.js` | READ候補 | 日本株期待仕様確認 |
| `tests/daily-screener-report.test.js` | READ候補 | レポート表示仕様確認 |

## 実装ステップ

- [x] Step 1: 現行日本株レポートと内部結果の欠損状況を把握する
  - 確認: ROIC / GP/A / FCF / 売上YoY / EPS YoY / P/FCF / Rule40 などの欠損率
- [x] Step 2: 現行コードで各指標がどの provider 由来かを追跡する
  - 確認: TradingView 本体、moomoo 補助、Yahoo 補助の使い分けと日本株分岐
- [x] Step 3: 日本株サンプル銘柄で provider ごとの取得可否を比較する
  - 確認: 広瀬電機、サムコ、村田製作所、キオクシアなどで指標の埋まり具合を照合
- [x] Step 4: 外部情報を使って各 provider の日本株カバレッジと制約を確認する
  - 確認: 公式 docs / primary source / 実レスポンスでの制約
- [x] Step 5: Rule of 40 の `N/A` 表示理由と表示のみ可能かを切り分ける
  - 確認: 日本株でも値自体は算出可能か、現在の実装が非表示にしているだけか
- [x] Step 6: 日本株で最適なデータ取得戦略を結論化する
  - 確認: 主軸 provider、補完 provider、現行の問題点、必要なら次アクション

## テスト・検証方針

- 基本は read-only 調査
- 必要時のみ既存スクリプトを実行して内部 JSON / 結果を確認
- 外部 provider 比較では、可能な限り同一銘柄セットで照合する

## リスク・注意点

- Yahoo Finance は公式公開 API と言い切れない経路が多く、安定性評価では「取れる」だけでなく運用リスクも見る
- TradingView / moomoo は日本株の一部指標で null が出ても、実装上の落とし方と provider 側欠損を区別する必要がある
- 実装変更はスコープ外だが、明確な仕様ギャップが見つかった場合は改善候補として整理する
