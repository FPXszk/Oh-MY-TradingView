# Exec-plan: us-jp-screener-marketcap-bands-and-jp-score-breakdown_20260604_1019

## 概要

目的: 米国株・日本株の daily screener で、時価総額に `(L) (M+) (M) (M-) (S)` の区分ラベルを付けてサイズ感を一目で分かるようにし、日本株の `総合点` 表示にも米国株と同じ `T/F` 内訳を追加する。最後に US/JP 両 workflow を実際に動かして、publish 後のレポートを確認する。

今回のゴール:

- US/JP 両方の `時価総額` 列を `"$83.0B (L)"` のような表示へ変更する
- 区分ルールはシンプル版 `(L) (M+) (M) (M-) (S)` で統一する
- 日本株でも `総合点 (T/F)` を表示し、技術寄り / ファンダ寄りの内訳を見られるようにする
- `Daily Fundamental Screener` と `Daily Fundamental Screener Japan` を `workflow_dispatch` で実行し、publish-to-WSL 後のレポートで変更を確認する

## 前提と解釈

- 時価総額区分は US/JP 共通で USD ベースの `marketCapUsd` に対して付与する
- シンプル版の境界は次で固定する
  - `(L)`: `>= $10B`
  - `(M+)`: `$5B - < $10B`
  - `(M)`: `$2B - < $5B`
  - `(M-)`: `$1B - < $2B`
  - `(S)`: `< $1B`
- 日本株も既に `marketCapUsd` と `$` 表示を使っているため、区分記号だけ共通追加すればよい
- 日本株の `総合点` でも、既存 ranking block から計算できる `T/F` 内訳をそのまま使う

## 変更・作成ファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/us-jp-screener-marketcap-bands-and-jp-score-breakdown_20260604_1019.md` | CREATE | 本計画 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | 時価総額帯ラベル表示と、日本株 `総合点 (T/F)` 表示を追加する |
| `tests/daily-screener-report.test.js` | MODIFY | US/JP レポートに新表示が出ることを固定する |
| `tests/fundamental-screener.test.js` | MODIFY候補 | 必要なら日本株でも `rankBreakdown` 前提が崩れていないことを補強する |
| `docs/exec-plans/completed/us-jp-screener-marketcap-bands-and-jp-score-breakdown_20260604_1019.md` | MOVE | 完了時に移動 |

## 影響範囲

- `docs/reports/screener/daily-ranking.md`
  - US レポートの `時価総額` と `総合点` 見え方が変わる
- `docs/reports/screener/daily-ranking-jp.md`
  - JP レポートの `時価総額` と `総合点` 見え方が変わる
- `docs/reports/screener/daily-ranking-run.json`
- `docs/reports/screener/daily-ranking-jp-run.json`
  - live workflow 実行後の確認対象

## 範囲外

- スコア weight / ranking ロジック自体の変更
- theme hierarchy の再設計
- Portfolio Health Check 系 workflow
- 時価総額の円換算や市場別しきい値分岐

## 実装方針

### 1. 時価総額表記は formatter で一括対応する

- `fmtUsdMarketCap()` の戻り値へ区分ラベルを付ける
- `N/A` はそのまま `N/A`
- 既存の `$12.3B` などの略記は維持し、末尾に空白 + `(ラベル)` を付ける

### 2. `T/F` 内訳は market 分岐を外して共通化する

- `buildTotalScoreCell()` は日本株でも `rankBreakdown` があれば `T/F` を返す
- `総合点` ヘッダも US/JP 共通で `総合点 (T/F)` に揃える
- 指標説明の `総合点 (T/F)` 行も、日本株向け文言を US と揃える

### 3. live 確認は最新 `main` を workflow に流す

- 実装後に `main` へ push
- US/JP workflow を個別 dispatch
- 生成された report / metadata を WSL 側ファイルで確認する

## 実施ステップ

- [ ] Step 1: formatter と score header の差し込み点を確認する
  - 確認: `fmtUsdMarketCap`, `buildTotalScoreCell`, score header 文言

- [ ] Step 2: RED として US/JP レポートテストを更新する
  - 確認: 時価総額に `(L) (M+) (M) (M-) (S)` が付く
  - 確認: 日本株でも `総合点 (T/F)` が出る

- [ ] Step 3: 実装を最小変更で入れる
  - 確認: US 表示を壊さない
  - 確認: JP の会社名付きシンボル表示は維持

- [ ] Step 4: ローカルテストで確認する
  - 確認: `node --test tests/daily-screener-report.test.js`
  - 確認: 必要なら `node --test tests/fundamental-screener.test.js`
  - 確認: `git diff --check`

- [ ] Step 5: 修正を `main` へ commit / push する
  - 確認: workflow 実行対象が最新コードになる

- [ ] Step 6: US workflow を実行して成果物確認する
  - 確認: `daily-ranking.md` の時価総額にラベルが付き、日本株同様 `T/F` 形式が維持される

- [ ] Step 7: JP workflow を実行して成果物確認する
  - 確認: `daily-ranking-jp.md` の時価総額にラベルが付き、`総合点 (T/F)` が出る

- [ ] Step 8: REVIEW / COMMIT
  - 確認: plan を `completed/` へ移動し、結果共有できる状態にする

## テスト戦略

- RED
  - `tests/daily-screener-report.test.js` の期待値を先に更新する
- GREEN
  - `scripts/screener/run-fundamental-screening.mjs` の formatter / header を修正する
- Live verification
  - `gh workflow run "Daily Fundamental Screener" --ref main`
  - `gh workflow run "Daily Fundamental Screener Japan" --ref main`

## 検証コマンド

- `node --test tests/daily-screener-report.test.js`
- `node --test tests/fundamental-screener.test.js`
- `git diff --check`
- `gh workflow run "Daily Fundamental Screener" --ref main`
- `gh workflow run "Daily Fundamental Screener Japan" --ref main`
- `gh run watch <run-id>`
- `gh run view <run-id>`

## リスク・注意点

- `$1B` 未満の銘柄は現行ベース条件では基本通らないが、fixture 上は `(S)` も扱えるようにしておく
- `T/F` 内訳は ranking block が揃っている前提なので、欠損 fixture では total only へフォールバックする可能性がある
- live 実行で publish が走るため、`main` の screener レポート生成物が更新される

## 競合確認

- active plan:
  - `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md`
  - `docs/exec-plans/active/japan-screener-granularity-and-source-feasibility_20260602_1447.md`
  - `docs/exec-plans/active/japan-screener-theme-implementation-and-live-debug_20260602_1500.md`
- 今回は表示フォーマットと live verification に限定し、直接競合しない

---

作成者: Codex
作成日時: 2026-06-04T10:19:00+09:00
