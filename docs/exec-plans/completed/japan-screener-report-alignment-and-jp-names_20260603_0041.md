# Exec-plan: japan-screener-report-alignment-and-jp-names_20260603_0041

## 概要

目的: 日本株スクリーニングのレポートを、できるだけ米国株レポートと同じ読み味・章立て・表現に寄せつつ、残っている旧テンプレ由来のズレを解消する。あわせて、日本株の相対強度基準を `SPY` 前提から日本株向けへ整理し、4桁コードの後ろに付ける会社名を英語ではなく正式な日本語社名へ差し替える。

今回のゴール:

- `docs/reports/screener/daily-ranking-jp.md` のタイトル・見出し・補足文が、不要な日本株専用テンプレ残りを減らし、US レポートに近い構成になる
- 日本株レポートでも Phase1 相対強度の基準が表示され、`SPY差` ではなく日本株向け benchmark 表現になる
- 日本株の銘柄表示が `8035 (東京エレクトロン株式会社)` のような日本語社名優先になる
- 既存の JP taxonomy / theme ranking / hierarchy 出力は維持する
- セッションログから再開文脈を追えるよう、今回の変更方針を plan に明示する

## 直前セッションからの引き継ぎ

- `docs/exec-plans/active/japan-screener-theme-implementation-and-live-debug_20260602_1500.md`
  - 日本株レポートに theme ranking とコード+社名表示を入れる方針はすでに固まっている
- 現在の `docs/reports/screener/daily-ranking-jp.md`
  - theme ranking / hierarchy は出ているが、タイトルや補足文の一部が US とズレたまま
  - 会社名は英語 TradingView 名のまま
- `src/core/sector-momentum.js`
  - benchmark snapshot は現状 `america` 市場でのみ `SPY` を参照している

## 変更・作成ファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/japan-screener-report-alignment-and-jp-names_20260603_0041.md` | CREATE | 本計画 |
| `src/core/sector-momentum.js` | MODIFY | 日本株向け benchmark を扱えるようにし、相対強度表示の元データを返す |
| `src/core/fundamental-screener.js` | MODIFY | 日本株 row に日本語社名を注入し、必要なら benchmark 情報を透過する |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | JP レポートのタイトル/見出し/benchmark 表記/社名表示を US に寄せて整える |
| `tests/daily-screener-report.test.js` | MODIFY | 日本株レポートの新しい title / benchmark / 日本語社名表示を固定する |
| `tests/fundamental-screener.test.js` | MODIFY | 日本株 row の日本語社名、および benchmark 付き sectorMomentum を固定する |
| `config/screener/jpx-company-names-ja.json` | CREATE | JPX Prime 銘柄コードと正式日本語社名の対応表 |
| `docs/exec-plans/completed/japan-screener-report-alignment-and-jp-names_20260603_0041.md` | MOVE | 完了時に移動 |

## 影響範囲

- `docs/reports/screener/daily-ranking-jp.md`
  - レイアウトと文言が更新される
- `docs/reports/screener/daily-ranking-jp-run.json`
  - 実行結果に benchmark まわりの表示差分が反映されうる
- US 側の `daily-ranking.md`
  - 共通描画ロジック変更の副作用がないことを確認する

## 範囲外

- 日本株 taxonomy の全面再設計
- 日本株のテーマ source 自体の再調査
- FCF / EPS YoY 欠損の根本解消
- 日本語社名データの自動更新パイプライン整備
  - 今回は repo 同梱の静的マップでまず成立させる
- GitHub Actions の live rerun
  - 今回はローカル検証を優先し、必要最小限の範囲に留める

## 実装方針

### 1. benchmark は「概念として TOPIX、実装シンボルは TOPIX 連動 ETF」を採る

- 日本株全体の広い市場基準として `TOPIX` を既定採用する
- TradingView scanner の benchmark 取得は tradable symbol が必要なので、TOPIX 連動 ETF をプロキシとして使う
- レポート文言は ETF ティッカー名より「TOPIX基準」と読める形を優先する

### 2. 日本語社名は repo 同梱マップで安定供給する

- JPX の上場一覧を元に `config/screener/jpx-company-names-ja.json` を追加する
- 日本株 row は `companyNameJa -> companyName` の優先順で表示に使う
- US 銘柄や JP マップ未登録銘柄には影響させない

### 3. 日本株レポートの文言は US の正本へ寄せる

- title を日本株専用の長い見出しから、US と同型の日付ベースへ寄せる
- benchmark がある場合だけ、Phase1 に基準行を出す
- benchmark 名に応じて列見出しの `SPY差` を market-aware な表現へ切り替える

## 実施ステップ

- [ ] Step 1: 現行 JP レポートと US レポートの差分を、生成コード上の条件分岐として整理する
  - 確認: title / Phase1 benchmark 行 / 列見出し / 日本語社名表示の差し込み点を特定する

- [ ] Step 2: RED として日本株レポートの期待をテストへ追加・更新する
  - 確認: 日本語社名表示
  - 確認: 日本株 benchmark 表示
  - 確認: US に近い title / 見出し

- [ ] Step 3: 日本語社名マップを追加し、JP row へ注入する
  - 確認: `8035`, `6981`, `9984`, `7203` などの代表銘柄で日本語社名が出る

- [ ] Step 4: sector momentum を日本株 benchmark 対応に拡張する
  - 確認: Japan でも benchmark snapshot が返る
  - 確認: 相対強度差分が計算される

- [ ] Step 5: Markdown 生成を market-aware に整える
  - 確認: JP レポートの見出しが US に近づく
  - 確認: `SPY差` 固定文言が日本株で残らない

- [ ] Step 6: テストとローカル生成で確認する
  - 確認: 対象テストが通る
  - 確認: `daily-ranking-jp.md` を再生成して見た目を確認する

- [ ] Step 7: REVIEW / COMMIT
  - 確認: plan を `completed/` へ移動し、変更一式を `main` に commit / push する

## テスト戦略

- RED
  - `tests/daily-screener-report.test.js`
  - `tests/fundamental-screener.test.js`
- GREEN
  - benchmark / 日本語社名 / Markdown 出力修正
- REFACTOR
  - 共通描画 helper のみ最小整理。不要な抽象化は追加しない

## 検証コマンド

- `node --test tests/daily-screener-report.test.js tests/fundamental-screener.test.js`
- `SCREENER_MARKET=japan SCREENER_EXCHANGES=TSE SCREENER_SYMBOL_ALLOWLIST_KEY=jpx-prime node scripts/screener/run-fundamental-screening.mjs`

## リスク・注意点

- TradingView で採れる日本株 benchmark ticker の種類によっては、将来取得不能になる可能性がある
- 日本語社名マップは静的ファイルのため、JPX 側の社名変更には追随更新が必要
- `docs/reports/screener/daily-ranking.md` に既存未コミット差分があるため、今回のコミットに巻き込まない

## 競合確認

- active plan:
  - `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md`
  - `docs/exec-plans/active/japan-screener-granularity-and-source-feasibility_20260602_1447.md`
  - `docs/exec-plans/active/japan-screener-theme-implementation-and-live-debug_20260602_1500.md`
- 今回はその続きの narrower scope plan として追加する

---

作成者: Codex
作成日時: 2026-06-03T00:41:00+09:00
