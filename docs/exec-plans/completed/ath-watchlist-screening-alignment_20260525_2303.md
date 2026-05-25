# Exec-plan: ath-watchlist-screening-alignment_20260525_2303

## 概要

目的: TradingView の ATH ウォッチリストに入っている銘柄群を、現行の US / JP スクリーニング基準で個別評価し、

- どの銘柄が「最強」判定か
- なぜその順位か
- 現行 workflow で実際に検出できるか
- 検出できない期待銘柄がある場合、どのパラメータをどう調整すれば拾えるか

を、表形式の成果物として確認できるようにする。

現状確認:

- `tv workspace watchlist-list` で現在のアクティブウォッチリストから 34 銘柄を取得できる
- 現行 workflow は `.github/workflows/daily-screener.yml` と `.github/workflows/daily-screener-japan.yml` の 2 本に分かれている
- `src/core/fundamental-screener.js` は市場全体スクリーニング用であり、任意のウォッチリスト銘柄だけを同じ基準で採点・落選理由付き評価する入口はまだない

今回の実装方針:

- 現行 fundamental screener の判定・ランキングロジックを再利用しつつ、任意の ticker 集合を同一基準で評価する最小限の入口を追加する
- ATH ウォッチリスト分析用の script / report を追加し、US / JP workflow 出力と照合できるようにする
- 現行 workflow で期待銘柄が漏れる場合だけ、しきい値や sector-selection 条件を最小限調整して live 再検証する

## 変更ファイル

- `docs/exec-plans/active/ath-watchlist-screening-alignment_20260525_2303.md` (この計画)
- `src/core/fundamental-screener.js` (任意 ticker 群の評価と落選理由抽出を追加)
- `scripts/screener/` 配下の新規 script (ATH ウォッチリスト分析レポート生成)
- `docs/reports/screener/` 配下の新規レポート or JSON 成果物 (ATH 分析結果)
- `tests/fundamental-screener.test.js` (watchlist evaluation / detection gap の回帰)
- `tests/daily-screener-report.test.js` または新規 test (レポート整形や判定根拠の回帰)
- `.github/workflows/daily-screener.yml` (必要な場合のみパラメータ調整)
- `.github/workflows/daily-screener-japan.yml` (必要な場合のみパラメータ調整)

## スコープ

含む:

- ATH ウォッチリスト銘柄の live 取得
- 現行基準による各銘柄の pass / fail / fail reason / rank explanation の算出
- US / JP workflow の現行出力との照合
- 必要最小限の screening parameter 調整
- 調整後の local / workflow 再検証

含まない:

- Minervini screener の全面再設計
- ATH 以外のウォッチリストやフォルダ整理
- バックテスト戦略そのものの変更
- ユーザー未指定の新規指標追加

## 実装ステップ

- [ ] ATH ウォッチリスト評価の入口を追加する
  - 現行 fundamental screener の market 別 profile / rank 体系を再利用する
  - 任意 ticker 群を同一基準で採点し、pass / fail 理由と順位根拠を返せるようにする

- [ ] ATH 分析レポートを生成する
  - live 取得した 34 銘柄を US / JP に分けて評価する
  - 「最強順」テーブル、判定、workflow 検出有無、理由を 1 つの成果物にまとめる
  - 的確でない銘柄はそう明記する

- [ ] workflow 検出ギャップを埋める
  - 現行 US / JP workflow を実行または再生成して、期待銘柄が出るか確認する
  - 漏れる場合のみ、しきい値や sector-selection を最小限調整する
  - 調整後に再実行し、期待銘柄が検出されることを確認する

- [ ] テストと live 検証を完了する
  - unit test を追加・更新する
  - ATH 分析 script を local 実行する
  - 必要な workflow を live 実行し、結果 artifact / report を確認する

## テスト戦略

- RED:
  - watchlist ticker 群に対して pass / fail reason が返らない現状を test で固定する
  - 期待銘柄が workflow 出力と一致しないケースを最小サンプルで再現する
- GREEN:
  - 個別評価と report 生成を実装し、期待テーブルを生成できるようにする
  - 必要な workflow parameter 調整で期待銘柄を再検出できるようにする
- REFACTOR:
  - 既存 ranking / filter ロジックの重複だけ整理し、新規抽象化は最小限に留める

## 検証コマンド

- `node --test tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `npm test`
- `node src/cli/index.js workspace watchlist-list`
- `node scripts/screener/<ATH analysis script>.mjs`
- `SCREENER_MARKET=america SCREENER_EXCHANGES=NASDAQ,NYSE node scripts/screener/run-fundamental-screening.mjs`
- `SCREENER_MARKET=japan SCREENER_EXCHANGES=TSE SCREENER_SYMBOL_ALLOWLIST_KEY=jpx-prime node scripts/screener/run-fundamental-screening.mjs`
- `gh workflow run "Daily Fundamental Screener" --ref main`
- `gh workflow run "Daily Fundamental Screener Japan" --ref main`

## リスク・注意点

- 取得できたアクティブウォッチリストが、ユーザーの意図する ATH リストと一致しない可能性がある
- workflow 上位結果は market 全体 ranking なので、watchlist 内順位と一致しない可能性がある
- JP は sector selection と allowlist の影響が大きく、閾値緩和だけでは期待銘柄が出ない可能性がある
- 既存 worktree に plan file 削除差分があるため、commit 範囲を今回追加の plan のみに限定する必要がある

## 競合確認

- `docs/exec-plans/active/` に同系統の進行中 plan は見当たらない
- 既存 worktree には `docs/exec-plans/active/sbi-chrome-foreground-debug_20260525_2128.md` の削除差分があるため触らない

---

作成者: Codex
作成日時: 2026-05-25T23:03:00+09:00
