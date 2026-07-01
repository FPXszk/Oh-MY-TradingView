# 日本株スクリーニングを米国株Industry形式へ寄せる計画

作成日時: 2026-07-02 01:37 JST

## ゴール

日本株スクリーニングのメインレポートを、現在の米国株スクリーニングと同じ「Sector -> Industry -> Industry横断の個別銘柄ランキング -> Sector別Top銘柄」形式へ寄せる。TradingView の `sector` / `industry` を主分類にし、みんかぶ・株探・自前taxonomy由来のテーマ分類は補助タグとして残す。

## 前提

- `EDINET` 補完、日本語会社名、JPX Prime allowlist、TOPIX相当ベンチマーク、LINE通知、GitHub Actions の大枠は維持する。
- 既存の日本株ワークフローを作り直すのではなく、米国株側で動いている Industry 階層、Phase4、Phase5、unified scoring の市場対応範囲を Japan に広げる。
- 外部サイトの新規スクレイピングは追加しない。
- 既存の米国株レポート形式とテストを壊さない。
- 既存の未コミット変更 `docs/reports/screener/daily-ranking.md` は今回の計画作成時点で既に存在しているため、今回の作業では不用意に触らない。

## 変更予定ファイル

- `src/core/fundamental-screener.js`
  - market capability helper を追加する。
  - Industry階層、Phase4候補、Phase5 Sector別Top銘柄、unified scoring を Japan にも開放する。
  - Japan では US 専用補完を適用せず、既存の EDINET 補完と TradingView/Moomoo ベースの指標を維持する。
  - T/Fスコア分解の population size guard を必要最小限で確認・修正する。
- `scripts/screener/run-fundamental-screening.mjs`
  - `industryRanking` / `unifiedPhase4Ranking` / `phase5SectorTopStocks` の存在ベースでレポートを出すようにし、日本株でも米国株形式の Phase2/Phase4/Phase5 を表示する。
  - 日本株の旧テーマ主導表示はメインから外し、テーマは補助列として扱う。
  - 日本株では Rule of 40 算出状況セクションをデフォルト非表示にする。
  - Phase4/Phase5 の T/F 表示に正しい population size を渡す。
- `.github/workflows/daily-screener-japan.yml`
  - JPX Prime / TSE / EDINET / 出力先は維持する。
  - `SCREENER_SELECTED_SECTOR_COUNT` など、日本株の新形式に必要な env を最小限追加する。
- `tests/daily-screener-report.test.js`
  - 日本株で Industry 形式の Phase2/Phase4/Phase5 が出ることを確認する。
  - 旧テーマ主導見出しがメインに出ないこと、テーマ補助列が出ることを確認する。
  - Rule of 40 算出状況が日本株で目立たないことを確認する。
- `tests/fundamental-screener.test.js`
  - Japan で Industry階層、Phase4候補、Phase5、unified scoring が有効になることを確認する。
  - EDINET補完が維持されることを既存テストに沿って確認・補強する。
  - T/Fスコア分解の異常な負値を防ぐテストを追加または更新する。
- `docs/reports/screener/daily-ranking-jp.md`
  - 実行確認で日本株レポートを再生成する。
- `docs/reports/screener/daily-ranking-jp-run.json`
  - 実行確認で日本株メタデータを再生成する。

## 影響範囲

- 日本株スクリーニングのレポート構成がテーマ深掘り型から Industry 主分類型に変わる。
- 日本株の Phase4 は単一トップセクターではなく、採用 Industry を横断した上位銘柄ランキングになる。
- 日本株の Phase5 は Sector別Top銘柄を表示し、unified scoring の候補として Sector別Top3 を使う。
- 米国株は既存形式を維持する。共通化による副作用が出ないよう、テストで確認する。

## 実装ステップ

- [x] Step 1: 現行コードの分岐とテストを確認する
  - 確認: `market === DEFAULT_MARKET` / `market === 'america'` の対象箇所を、Japanへ開放すべきものとUS専用のまま残すものに分類する。
- [x] Step 2: market capability helper を追加する
  - 確認: Industry階層、Sector別Top銘柄、unified scoring の有効市場が `america` / `japan` で明示される。
- [x] Step 3: Japan で Industry universe と Phase4候補を生成する
  - 確認: `result.industryRanking` / `phase4CandidateRows` / `finalStockRanking` が Japan でも生成される。
- [x] Step 4: Japan で Phase5 Sector別Top銘柄と unified scoring を有効化する
  - 確認: Phase5表示Top5とunified scoring候補Top3の契約が分離されたまま維持される。
- [x] Step 5: レポート生成を存在ベースの Industry 形式へ変更する
  - 確認: Japan で `Phase2 Industryランキング`、`Phase4 個別銘柄ランキング`、`Phase5 Sector別 個別銘柄ランキング` が出る。
- [x] Step 6: 日本株のテーマタグ補助列と Rule of 40 表示縮小を実装する
  - 確認: テーマ分類はランキング主軸ではなく補助列として表示され、Rule of 40 算出状況セクションは日本株でデフォルト非表示になる。
- [x] Step 7: T/Fスコア分解の population size を確認・修正する
  - 確認: unified scoring後のPhase4は `unifiedRankedRows.length` を基準にし、極端な負値が出ない。
- [x] Step 8: テストを追加・更新する
  - 確認: 日本株Industry表示、旧テーマ主導非表示、Japan unified scoring、EDINET補完維持、T/F負値防止をテストで押さえる。
- [x] Step 9: ローカル検証を実行する
  - 確認: `npm run test:unit` が通る。
  - 確認: 日本株レポート生成コマンドを実行し、`docs/reports/screener/daily-ranking-jp.md` が新形式になる。
- [x] Step 10: レビュー、計画移動、コミット、プッシュ
  - 確認: 変更差分が計画範囲内であることを確認し、計画を `docs/exec-plans/completed/` に移動して Conventional Commits で main にコミット・プッシュする。

## 検証コマンド

```powershell
npm run test:unit
```

```powershell
$env:SCREENER_WORKFLOW_LABEL="daily-screener-japan"
$env:SCREENER_REPORT_PATH="docs/reports/screener/daily-ranking-jp.md"
$env:SCREENER_METADATA_PATH="docs/reports/screener/daily-ranking-jp-run.json"
$env:SCREENER_RESULT_LIMIT="90"
$env:SCREENER_MARKET="japan"
$env:SCREENER_EXCHANGES="TSE"
$env:SCREENER_SYMBOL_ALLOWLIST_KEY="jpx-prime"
$env:SCREENER_SELECTED_SECTOR_COUNT="5"
$env:SCREENER_SCOPE_LABEL="JPX Prime domestic stocks snapshot (2026-03-31)"
$env:SCREENER_CURRENCY_SYMBOL="¥"
node scripts/screener/run-fundamental-screening.mjs
```

## リスクと注意点

- Japan に Phase5 を開放する際、US専用補完を誤って適用すると指標が壊れるため、補完処理は市場別に分けて扱う。
- 旧テーマ分類を削除しない。主分類から外し、補助タグとして残す。
- `docs/reports/screener/daily-ranking.md` には既存の未コミット変更があるため、米国株レポートの再生成が必要になった場合は事前に差分を確認する。
- EDINET_API_KEY がローカルに無い場合、EDINET disabled の状態でもレポート構成を確認し、補完維持はテストで確認する。
