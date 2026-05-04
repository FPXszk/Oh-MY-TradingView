# Exec-plan: us-jp-screener-scope-and-workflows_20260505_0221

## 概要

目的: 日次スクリーナーを以下の条件に合わせて改修し、GitHub Actions で再実行する。

- 米国版: **OTC 除外 + NASDAQ / NYSE のみ**
- 日本株版: **東証プライムのみ**
- 両方とも「流行りセクター・モメンタム強い銘柄」を拾いやすくするため、**粗利率しきい値を 40% → 30%** に下げる

現状確認:

- 現在の `src/core/fundamental-screener.js` は `scanner.tradingview.com/america/scan` 固定で、`markets: ['america']` / `types: ['stock']` を使っている
- 取引所 whitelist は存在せず、`exchange` は集計表示のみなので OTC がそのまま残る
- 日次 workflow は `.github/workflows/daily-screener.yml` 1本で、レポート path と WSL 同期 script も米国版 path 固定

今回の実装方針:

- fundamental screener を **market / exchange allowlist / gross margin threshold / report path** で切り替えられるよう最小限パラメータ化する
- 既存の米国 workflow は即実用案に更新する
- 日本株版は別 workflow / 別レポートとして新設する

## 変更ファイル

- `docs/exec-plans/active/us-jp-screener-scope-and-workflows_20260505_0221.md` (この計画)
- `src/core/fundamental-screener.js` (market / exchange / gross margin の設定化)
- `src/cli/commands/screener.js` (必要なら新オプション反映)
- `src/tools/screener.js` (必要なら新オプション反映)
- `scripts/screener/run-fundamental-screening.mjs` (米国版 runner の設定化)
- `scripts/screener/` 配下の日本版 runner 追加または共通化用ファイル (実装方式に応じて作成)
- `.github/workflows/daily-screener.yml` (米国版 workflow の更新)
- `.github/workflows/` 配下の日本版 workflow 新規作成
- `scripts/windows/github-actions/sync-daily-screener-report-to-wsl.ps1` (必要なら report path 可変化)
- `tests/fundamental-screener.test.js` (市場 / 取引所 / 粗利率しきい値の回帰追加)
- `tests/daily-screener-report.test.js` (米国版 / 日本版の出力と workflow 契約の回帰追加)
- `package.json` (新規 test file を増やす場合のみ)

## スコープ

含む:

- 米国版スクリーナーの universe 見直し（OTC 除外、NASDAQ/NYSE 限定）
- 日本株版 workflow とレポート出力の追加
- 粗利率しきい値 30% への調整
- 既存テスト更新と workflow 再実行

含まない:

- S&P500 構成銘柄ベースのユニバース導入
- 東証スタンダード / グロース対応
- 指標体系そのものの全面刷新
- 既存 Minervini screener の市場拡張

## 実装ステップ

- [ ] fundamental screener を設定化する
  - `market`、`scannerUrl`、`exchangeAllowlist`、`grossMarginMinPct`、表示用ラベルを切り替え可能にする
  - 既定値は後方互換を保ちつつ、workflow から明示指定できるようにする

- [ ] 米国版 workflow を即実用案へ更新する
  - OTC を除外し、NASDAQ / NYSE のみ許可
  - 粗利率しきい値を 30% に下げる
  - 既存 `daily-ranking.md` / metadata / WSL publish フローを維持する

- [ ] 日本株版 workflow を追加する
  - TradingView の日本 market scope を使い、東証プライムのみ通す
  - 日本版レポート / metadata / artifact 名 / WSL 反映 path を分離する
  - 既存米国版と衝突しない命名にする

- [ ] テストと workflow 再実行
  - `tests/fundamental-screener.test.js` に市場・取引所制御の回帰を追加する
  - `tests/daily-screener-report.test.js` に米国版 / 日本版 report & workflow 契約を追加する
  - `npm test` 実行
  - 米国版 workflow と日本版 workflow を dispatch して成功確認する

## テスト戦略

- RED:
  - 既存テストに exchange allowlist / market 切替 / 粗利率 30% 条件を要求する失敗ケースを追加
  - 日本版 workflow / report path が未実装であることを回帰テストで固定
- GREEN:
  - パラメータ化を最小限実装し、既存米国版出力を壊さずに新条件を通す
  - 日本版 workflow を追加し、両 workflow の publish/metadata 契約を満たす
- REFACTOR:
  - script / workflow の重複が強い箇所だけ共通化し、不要な抽象化は避ける

## 検証コマンド

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `npm test`
- `gh workflow run "Daily Fundamental Screener" --ref main`
- `gh workflow run "<日本版 workflow 名>" --ref main`
- `gh run list --workflow "Daily Fundamental Screener" --limit 5`
- `gh run list --workflow "<日本版 workflow 名>" --limit 5`

## リスク・注意点

- TradingView Scanner の日本 market scope / 東証プライム識別子が、想定した market 名や exchange 名と異なる可能性がある
- 日本版 path を WSL publish するには、既存 sync script の hardcode を安全に可変化する必要がある
- 粗利率 30% への緩和で候補数は増えるが、ノイズも増えるためレポート見え方が変わる
- Yahoo revenueGrowth の `null` は現実装上 still pass なので、今回もその仕様を維持するか要注意

## 競合確認

- `docs/exec-plans/active/` には `repo-structure-align-and-archive-rules_20260424_2015.md` と `run-night-batch_20260429_2344.md` がある
- 今回のスクリーナー市場スコープ変更とは直接競合しない

---

作成者: Copilot
作成日時: 2026-05-05T02:21:00+09:00
