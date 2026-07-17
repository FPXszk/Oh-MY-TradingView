# Japan screener profile refinement plan 20260717_1605

## Goal

日本株スクリーナーを作り直さず、現在の米国株型 Phase1 / Phase2 Industry / Phase4 / Phase5 / 統合スコアリング構造を前提に、まず同日スクリーニング実行で現在地を保存し、その結果を見ながら日本株向けプロファイルを細分化する。

## Scope

### 作成・変更するファイル

- `docs/exec-plans/active/japan-screener-profile-refinement_20260717_1605.md`
  - この実装計画。実装完了時に `docs/exec-plans/completed/` へ移動する。
- `src/core/sector-screening-profiles.js`
  - 日本株プロファイルを現在の 5 グループから、TradingView sector / industry に沿った細分化プロファイルへ分割する。
  - 既存の米国株プロファイル、Industry 階層、Phase4 / Phase5 / 統合スコアリングの骨格は変更しない。
- `tests/fundamental-screener.test.js`
  - 日本株プロファイル分割後の profile summary、Finance / Utilities の扱い、Industry / Phase4 / Phase5 の既存契約を更新・追加する。
- `tests/daily-screener-report.test.js`
  - レポート上のプロファイル表示と日本株実行メタ情報の期待値を更新する。
- `docs/reports/screener/daily-ranking.md`
  - 米国株の同日再実行レポート。既存の未コミット変更があるため、差分を確認して今回の実行結果として扱える場合だけ含める。
- `docs/reports/screener/daily-ranking-run.json`
  - 米国株の実行メタデータ。実行パスで更新される場合だけ含める。
- `docs/reports/screener/daily-ranking-jp.md`
  - 日本株の同日再実行レポート。
- `docs/reports/screener/daily-ranking-jp-run.json`
  - 日本株の実行メタデータ。

### 削除しないファイル

- `AGENTS.md`
- `.github/copilot-instructions.md`
- `.github/workflows/daily-screener.yml`
- `.github/workflows/daily-screener-japan.yml`
- `config/screener/jpx-prime-symbols.json`
- `config/screener/jpx-company-names-ja.json`
- `src/core/fundamental-screener.js`
- `src/core/edinet.js`

今回の主目的はプロファイル細分化なので、JPX allowlist 自動更新、EDINET 補完位置の再設計、Finance / Utilities 専用スコアの本格実装、定期 schedule 追加は別タスクに分ける。

## Current Evidence

- 日本株の Industry / Phase4 / Phase5 / 統合スコアリングは `src/core/fundamental-screener.js` で `japan` に対して有効化済み。
- 日本株プロファイルは `src/core/sector-screening-profiles.js` の `JP_PROFILES` で 5 グループに集約されている。
- 日本株 Phase2 は `JP_PHASE2_EXCLUDED = new Set(['Finance', 'Utilities'])` により Finance / Utilities を除外している。
- 日本株 GitHub Actions は `workflow_dispatch` のみで、`SCREENER_SCOPE_LABEL` は `JPX Prime domestic stocks snapshot (2026-03-31)`。
- 現在の作業ツリーには既存の未コミット差分として `docs/reports/screener/daily-ranking.md` と `artifacts/` がある。今回の変更に無関係な artifacts は含めない。

## Implementation Steps

- [ ] 実行前の状態を保存する
  - 確認: `git status --short --branch` で既存差分を把握し、計画外ファイルをステージしない。
- [ ] 米国株・日本株スクリーニングを同日にローカル実行する
  - 米国株: `SCREENER_MARKET=america` 相当の PowerShell 環境変数を設定し、`node scripts/screener/run-fundamental-screening.mjs` を実行する。
  - 日本株: `.github/workflows/daily-screener-japan.yml` と同等の `SCREENER_MARKET=japan`, `SCREENER_EXCHANGES=TSE`, `SCREENER_SYMBOL_ALLOWLIST_KEY=jpx-prime`, `SCREENER_SELECTED_SECTOR_COUNT=5`, `SCREENER_RESULT_LIMIT=90` で実行する。
  - 確認: `docs/reports/screener/daily-ranking.md` と `docs/reports/screener/daily-ranking-jp.md` の生成日、EDINET 状態、取得件数、Phase4 / Phase5 行数を確認する。
- [ ] 実行結果から日本株プロファイル分割の初期対象を決める
  - 確認: Phase1 上位セクター、Industry 上位、Phase4 / Phase5 候補を見て、今回の細分化が実データに効く範囲に絞られていることを確認する。
- [ ] `src/core/sector-screening-profiles.js` の日本株プロファイルを細分化する
  - 初期分割候補: 半導体・電子部品、製造装置 / FA、素材・化学、商社、消費循環、IT / 通信、医薬品・医療、防御系。
  - Finance / Utilities は今回の本格対応対象外。ただし除外が明示され続けることをテストで保つ。
  - 確認: 既存の `getSectorScreeningPlan()` と `profileSummary()` の契約を変えず、呼び出し側に大きな変更を出さない。
- [ ] テストを更新する
  - 確認: `tests/fundamental-screener.test.js` で日本株 profile summary、request scope、Finance / Utilities 除外、Industry / Phase4 / Phase5 継続を検証する。
  - 確認: `tests/daily-screener-report.test.js` でレポートのプロファイル表示と EDINET 状態表示を検証する。
- [ ] レポートを再生成して差分をレビューする
  - 確認: 日本株レポートで細分化されたプロファイル名が表示され、Phase4 / Phase5 / 統合 Top40 が壊れていないことを確認する。
- [ ] レビューして計画を完了へ移動する
  - 確認: `git diff --check`、`npm run test:unit`、必要に応じて `npm run test:contract` を実行する。
  - 確認: `docs/exec-plans/active/japan-screener-profile-refinement_20260717_1605.md` を `docs/exec-plans/completed/` へ移動する。

## Validation Commands

- `git diff --check`
- `npm run test:unit`
- `npm run test:contract`
- `node scripts/screener/run-fundamental-screening.mjs` with US screener environment variables
- `node scripts/screener/run-fundamental-screening.mjs` with Japan screener environment variables

`test:e2e` は TradingView CDP / UI 挙動を変えないため、今回の既定検証からは外す。スクリーナーの runtime 契約に触れる差分が出た場合だけ追加する。

## Risks And Uncertainties

- EDINET API key がローカル環境に無い場合、日本株レポートは `EDINET: disabled (no API key)` のままになる。その場合は補完有効状態の本番相当検証は GitHub Actions か secret 設定済み環境で別途確認する。
- TradingView Scanner API の現在データに依存するため、同日実行結果は日中に変化する可能性がある。
- プロファイルを細かくしすぎると Phase2 request 数が増える。今回は既存構造を保ち、必要最小限の分割に留める。
- Finance / Utilities は収益構造が異なるため、通常プロファイルに混ぜない。今回の範囲では除外維持または明示的な未対応扱いに留める。

## Out Of Scope

- JPX Prime allowlist の公式データからの自動更新。
- EDINET 補完を TradingView フィルタ前へ移動する再設計。
- Finance / Utilities 専用スコアの正式実装。
- GitHub Actions の schedule 追加。
- 長期パフォーマンス検証、1週間後 / 1カ月後 / 3カ月後の成績保存。

## Completion Criteria

- 米国株・日本株の同日実行結果が保存され、EDINET 状態と Phase4 / Phase5 の現状が確認できている。
- 日本株プロファイルが 5 グループより細かく分割され、既存の Industry / Phase4 / Phase5 / 統合スコアリングが維持されている。
- 関連テストと差分チェックが通っている。
- 計画ファイルが `docs/exec-plans/completed/` に移動済み。
- 実装コミットが Conventional Commits 形式で `main` に push 済み。
