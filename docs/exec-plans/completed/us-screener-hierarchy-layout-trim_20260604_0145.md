# Exec-plan: us-screener-hierarchy-layout-trim_20260604_0145

## 概要

目的: 米国株スクリーニングレポートの hierarchy 表示を、ユーザー指定の読み順に合わせて 2 点だけ整理する。

今回のゴール:

- `docs/reports/screener/daily-ranking.md` から、上段の `Phase2 テーマランキング` を削除する
- 米国株の `Phase4 個別銘柄ランキング` と `Phase2 セクター別ランキング` では、シンボルを `NVDA` のようにティッカーのみ表示し、`(Company Name)` を付けない
- 日本株の `7203 (トヨタ自動車)` 表示は維持する
- 章立ては「セクタランキング → 1位セクターの中テーマランキング → その配下の小テーマランキング → 個別銘柄ランキング」で読める形にする

## 直前セッションからの引き継ぎ

- `docs/exec-plans/completed/japan-screener-report-alignment-and-jp-names_20260603_0041.md`
  - 日本株側は hierarchy の上段中テーマ表を出さず、個別銘柄は日本語社名付きで出す方針に整理済み
- `docs/exec-plans/completed/japan-screener-phase2-theme-flow-fix_20260604_1015.md`
  - 直近では日本株の hierarchy 流れを実データ寄りに調整していた
- 今回はその続きとして、米国株側だけを日本株側に近い読み味へ寄せる

## 変更・作成ファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/us-screener-hierarchy-layout-trim_20260604_0145.md` | CREATE | 本計画 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | US レポートの hierarchy 見出しとシンボル表示を調整する |
| `tests/daily-screener-report.test.js` | MODIFY | US は上段テーマ表なし・ティッカーのみ、JP は社名付き維持を固定する |
| `docs/exec-plans/completed/us-screener-hierarchy-layout-trim_20260604_0145.md` | MOVE | 完了時に移動 |

## 影響範囲

- `docs/reports/screener/daily-ranking.md`
  - US レポートの章構成とシンボル表記が変わる
- `docs/reports/screener/daily-ranking-jp.md`
  - 変更を入れない前提だが、共通描画関数の副作用がないことを確認する

## 範囲外

- hierarchy の採点ロジック変更
- テーマ taxonomy の再設計
- 日本株レポートの章構成再変更
- セクター別ランキング以外の銘柄表示ルール変更

## 実装方針

### 1. US の上段テーマ表は section ごと削除する

- `Phase2 テーマランキング` は US だけ出力しない
- `Phase2 中テーマランキング` / `Phase3 小テーマランキング` / `Phase4 個別銘柄ランキング` はそのまま残す

### 2. シンボル表示は market-aware に分ける

- 日本株は現行どおり `symbol (companyNameJa)` を維持する
- 米国株は company name を付けず `symbol` のみ返す
- 影響箇所は hierarchy stock table / sector ranking table / top reasons のうち、今回使っている共通 formatter の出力だけに限定する

## 実施ステップ

- [ ] Step 1: 現行 US / JP の symbol formatter 利用箇所を整理する
  - 確認: 今回の 2 要件に関係する出力箇所だけを触る

- [ ] Step 2: RED として US レポート期待値を更新する
  - 確認: US で `Phase2 テーマランキング` が出ない
  - 確認: US の `**NVDA**` 形式が維持される
  - 確認: JP の `**7203 (トヨタ自動車)**` は残る

- [ ] Step 3: Markdown 生成ロジックを最小変更で修正する
  - 確認: 小テーマランキングと個別銘柄ランキングの流れは維持
  - 確認: 共通 formatter の変更が JP 側を壊さない

- [ ] Step 4: テストで確認する
  - 確認: 対象テストが通る
  - 確認: 必要ならレポート再生成で見た目も確認する

- [ ] Step 5: REVIEW / COMMIT
  - 確認: plan を `completed/` へ移動し、変更一式を `main` に commit / push する

## テスト戦略

- RED
  - `tests/daily-screener-report.test.js` の US 期待値を更新して失敗を先に作る
- GREEN
  - `scripts/screener/run-fundamental-screening.mjs` の出力を最小変更で合わせる
- REFACTOR
  - 今回は formatter の責務分離以上の抽象化は入れない

## 検証コマンド

- `node --test tests/daily-screener-report.test.js`
- `git diff --check`

## リスク・注意点

- symbol formatter は複数 section で共有されているため、意図せず US 全 section の表記が変わる可能性がある
- US と JP で `Phase2 テーマランキング` の有無が分かれるため、market 条件の枝を増やしすぎないよう注意する
- `docs/reports/screener/daily-ranking.md` は生成物なので、必要なら再生成差分が出る

## 競合確認

- active plan:
  - `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md`
  - `docs/exec-plans/active/japan-screener-granularity-and-source-feasibility_20260602_1447.md`
  - `docs/exec-plans/active/japan-screener-theme-implementation-and-live-debug_20260602_1500.md`
- 今回は US レポート表示だけの narrow scope で、上記 plan と直接競合しない

---

作成者: Codex
作成日時: 2026-06-04T01:45:00+09:00
