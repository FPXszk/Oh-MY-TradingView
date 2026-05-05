# Exec-plan: momentum-fundamental-screening-indicator-research_20260505_2042

## 概要

目的: `docs/strategy/deep-research-instruction.md` に従い、「今まさにモメンタムがあり、ファンダメンタルが最強の銘柄」を日次スクリーニングするための指標セットを、学術論文・実証研究・実務資料・コミュニティ情報を根拠付きで整理する。

今回の成果物は **調査ドキュメントのみ** とし、スクリーナーのコード・閾値・GitHub Actions の動作は変更しない。実装提案はレポート内の優先順位として残す。

## 前提

- 現行スクリーナーは `src/core/fundamental-screener.js` と `src/core/sector-momentum.js` を中心に、TradingView Scanner API と Yahoo Finance 補完で日次ランキングを作っている。
- 現行の主な評価軸は `Perf.3M`、`ROE`、`FCFマージン`、Yahoo Finance の `revenueGrowth` を rank-sum し、前段で RSI、相対出来高、52週高値比率、SMA50/200、EPS、P/FCF、粗利率などをフィルターしている。
- `docs/strategy/deep-research-instruction.md` は追加候補を仮説として扱うよう明記しているため、論文・実証研究で弱いものは弱いと評価する。
- Twitter/X を参照する場合は `twitter-cli` スキルの手順に従う。外部調査の docs 固定化は `tradingview-research-capture` の方針に従う。

## 変更ファイル

| 種別 | ファイル | 内容 |
|---|---|---|
| 作成 | `docs/exec-plans/active/momentum-fundamental-screening-indicator-research_20260505_2042.md` | 本計画。PLAN ステップのみで先に commit / push する |
| 作成 | `docs/strategy/momentum-fundamental-screening-indicators-research_20260505.md` | 最終レポート本体。40候補＋現行指標を根拠付きで評価し、推奨セットを提示する |
| 作成 | `docs/research/momentum-fundamental-screening-indicators_20260505.md` | research keep-set 用の要約。概要、調査対象、採用/不採用判断、プロジェクト接続点を記録する |
| 更新 | `docs/research/manifest.json` | 新規 research 要約を `keep` に追加する |
| 更新 | `docs/references/design-ref-llms.md` | 参照した外部資料を番号連番で追記する |
| 移動 | `docs/exec-plans/active/momentum-fundamental-screening-indicator-research_20260505_2042.md` → `docs/exec-plans/completed/momentum-fundamental-screening-indicator-research_20260505_2042.md` | REVIEW 後、COMMIT ステップで完了済みに移す |

## 影響範囲

- 影響は docs のみに限定する。
- `src/`、`scripts/`、`.github/workflows/`、既存 screener レポートの生成処理は変更しない。
- 将来の実装候補として、TradingView Scanner API / Yahoo Finance で取得できる指標と、現時点では取得困難な指標を分けて提案する。

## 範囲外

- 実際のスクリーナー閾値変更
- 新しい API 依存やパッケージ追加
- バックテスト campaign の実行
- 既存 active plan の整理
- `docs/strategy/deep-research-instruction.md` の変更

## 実装ステップ

- [x] 現行スクリーナーの棚卸しを確定する
  - 確認: `src/core/fundamental-screener.js`、`src/core/sector-momentum.js`、`src/core/sector-screening-profiles.js`、`scripts/screener/run-fundamental-screening.mjs` の現行指標・データ取得元・ランキング式をレポートへ反映する。

- [x] 学術・実証研究を調査する
  - 確認: 指定文献（Jegadeesh & Titman、Moskowitz & Grinblatt、Novy-Marx、Fama-French、Piotroski、Sloan、PEAD、AQR など）を中心に、著者・年・掲載誌/公開元・主要結論を記録する。

- [x] 実務資料・コミュニティ・OSS を調査する
  - 確認: AQR / Alpha Architect / Robeco / Verdad / Kenneth French / Reddit / Twitter(X) / Substack / GitHub などを参照し、信頼性と採否を明記する。

- [x] 指標別詳細レポートを作成する
  - 確認: 各指標に「定義・計算式」「経済的意味」「根拠論文または実証研究」「有効性評価（◎/○/△/✕）」「TradingView Scanner API または Yahoo Finance 取得可否」「追加推奨度と優先順位」を入れる。

- [x] 推奨指標セットを整理する
  - 確認: 必須指標、追加推奨上位5件、削除推奨、セクター別調整、実装優先順位を、日次自動スクリーナーの制約に合わせて提示する。

- [x] 参照台帳と research manifest を更新する
  - 確認: `docs/references/design-ref-llms.md` に外部資料を追記し、`docs/research/manifest.json` に `momentum-fundamental-screening-indicators_20260505.md` を追加する。

- [x] レビューと検証を行う
  - 確認: 論理破綻、過剰な推奨、根拠不足、取得不可指標の混入、文書構造の不足を手動レビューする。
  - 確認: repo layout / archive policy のテストを実行する。

## テスト・検証コマンド

- `node --test tests/strategy-docs.test.js tests/archive-latest-policy.test.js`
- `node --test tests/repo-paths.test.js`
- `git diff -- docs/strategy/momentum-fundamental-screening-indicators-research_20260505.md docs/research/momentum-fundamental-screening-indicators_20260505.md docs/research/manifest.json docs/references/design-ref-llms.md`
- `rg -n "N/A|TODO|要出典|一般的" docs/strategy/momentum-fundamental-screening-indicators-research_20260505.md docs/research/momentum-fundamental-screening-indicators_20260505.md`

## 検証結果

- `node --test tests/strategy-docs.test.js tests/archive-latest-policy.test.js`: pass
- `rg -n "N/A|TODO|要出典|一般的" ...`: no matches
- `node -e "JSON.parse(...docs/research/manifest.json...)"`: pass
- `git diff --check`: pass
- `node --test tests/repo-paths.test.js`: fail。`config/backtest/campaigns/**/strongest-overlay-us-50x9.json` が現行 tree に存在しない既存 fixture 不整合で、今回の docs-only 変更とは別件として扱う。

## 成功条件

- `docs/strategy/` 配下に、指示された最終アウトプット形式を満たす Markdown レポートが存在する。
- 現行指標と追加候補が、日次モメンタム × ファンダメンタル・スクリーナーの観点で評価されている。
- 根拠文献・実務資料・コミュニティ情報が、採用判断と取得可否に接続されている。
- 外部参照が `docs/references/design-ref-llms.md` に記録され、research 要約が manifest keep-set に含まれている。
- 今回の docs に直接関係する検証コマンドが成功し、既存不整合がある場合は切り分けて記録される。
- 最終的に main ブランチへ commit / push される。

## リスク・注意点

- 指示は「使えるソースは全て使うこと」としているが、有料 DB やログイン必須資料はアクセスできない可能性がある。その場合はアクセス可能な一次情報・著者ページ・公開要旨・実務解説で補完し、限界を明記する。
- TradingView Scanner API は非公式で、フィールド名や取得可否が変わるリスクがある。取得可否は現行実装と既存 docs を根拠にし、必要に応じて Scanner API の軽い確認に留める。
- Reddit / Twitter(X) は一次研究ではないため、信頼できる専門家・研究機関・実務家の補助情報として扱い、論文根拠と混同しない。
- 調査成果は長くなるため、本文は表で圧縮しつつ、重要論点は個別コメントで補足する。

## 競合確認

- `docs/exec-plans/active/run-night-batch_20260429_2344.md`
- `docs/exec-plans/active/night-batch-rerun-focus8-200pack_20260505_0300.md`
- `docs/exec-plans/active/repo-structure-align-and-archive-rules_20260424_2015.md`

いずれも night-batch / repo structure 系であり、今回の docs-only deep research とは直接競合しない。

---

作成者: Codex
作成日時: 2026-05-05T20:42:00+09:00
