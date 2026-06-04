# Exec-plan: japan-screener-hirose-samco-investigation_20260604_1049

作成日時: 2026-06-04 10:49 JST

目的: 現行の日本株スクリーニング結果で 3位 `6806 (ヒロセ電機)` と 4位 `6387 (サムコ)` が上位に入っている理由を、**実際の出力結果とランキング算出ロジックに基づいて調査し、説明可能な根拠を整理する**。

## 成功条件

- `docs/reports/screener/daily-ranking-jp.md` 上で対象 2 銘柄の順位・テーマ・スコア内訳を確認できる
- `src/core/fundamental-screener.js` など関連コードから、順位に効いたブロックや評価軸を説明できる
- 「大型株でなくても入る理由」と「この 2 銘柄固有で強かった点」を切り分けて報告できる

## 前提とスコープ

- 対象は **現行の日本株 daily screener の調査** に限定する
- 既存レポートや生成ロジックの読み取りが中心で、プロダクトコードの修正は今回のスコープ外とする
- 追加で検証が必要な場合のみ、既存の実行コマンドで再生成または JSON 出力確認を行う

## 変更・確認対象ファイル

| ファイル | 区分 | 用途 |
|---|---|---|
| `docs/exec-plans/active/japan-screener-hirose-samco-investigation_20260604_1049.md` | CREATE | 本計画 |
| `docs/reports/screener/daily-ranking-jp.md` | READ | 現行順位・表示指標・スコア確認 |
| `docs/reports/screener/daily-ranking-jp-run.json` | READ | いつの run か確認 |
| `src/core/fundamental-screener.js` | READ | 総合点・ブロック別順位の算出根拠確認 |
| `src/core/theme-taxonomy.js` | READ候補 | どのテーマに分類されたかの補足確認 |
| `scripts/screener/run-fundamental-screening.mjs` | READ候補 | レポート出力列と表示ロジック確認 |
| `tests/fundamental-screener.test.js` | READ候補 | rank breakdown の期待仕様確認 |

## 実装ステップ

- [ ] Step 1: 現行レポートと run metadata を確認する
  - 確認: 3位/4位が本当に `ヒロセ電機` / `サムコ` であること、対象 run の日時と SHA
- [ ] Step 2: 対象 2 銘柄の表示値を比較して、何が強いかを抽出する
  - 確認: 時価総額、モメンタム、52w 位置、収益性、成長、バリュエーション、ATR、総合点 (T/F)
- [ ] Step 3: ランキング算出コードを読んで、サイズより優先される評価軸を特定する
  - 確認: weight、rank-sum の方式、market cap が hard gate か補助情報か
- [ ] Step 4: 2 銘柄固有の上位理由と、スクリーナー設計上の一般理由を分けて整理する
  - 確認: 「なぜ大型株でなくても入るのか」と「なぜこの 2 銘柄なのか」を別々に説明できる
- [ ] Step 5: ユーザー向けに要点を簡潔に報告する
  - 確認: 根拠ファイルと残る不確実性を添えて説明できる

## テスト・検証方針

- 基本は read-only 調査
- 必要時のみ既存コマンドで再生成または局所確認
  - `node scripts/screener/run-fundamental-screening.mjs`

## リスク・注意点

- レポート表示値だけでは rank breakdown の詳細順位まで見えない可能性がある
- 既存 active plan と同じ日本株スクリーナー領域だが、今回は調査のみで実装変更は避ける
- もし現行結果とコード仕様に齟齬が見つかった場合は、その時点で実装修正か追加調査かを切り分ける
