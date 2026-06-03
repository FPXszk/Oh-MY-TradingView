# Exec-plan: japan-screener-phase2-theme-flow-fix_20260604_1015

## 概要

目的: 日本株 daily screener の Phase2 表示とテーマ分類を、今回のユーザー意図に合わせて整理する。

期待動作:

- `Unclassified` が日本株 Phase2 テーマランキングに出ない
- 日本株の Phase2 は「Phase1 上位セクター → その1位セクターに紐づくみんかぶテーマランキング → 上位テーマ群の個別銘柄」という一本の流れになる
- `Electronic Technology` のような TradingView セクター名を、みんかぶ由来のテーマランキングと混同しない表示になる
- 既存 US screener の theme / hierarchy 出力に副作用を出さない
- ロジック説明に必要な根拠を local 出力と test で確認できる

## 変更・作成ファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/japan-screener-phase2-theme-flow-fix_20260604_1015.md` | CREATE | 本計画 |
| `src/core/theme-taxonomy.js` | MODIFY | JP theme 分類の補完と Unclassified 排除方針の実装 |
| `config/screener/theme-taxonomy-jp.json` | MODIFY | 日本株 theme 定義の不足補完 |
| `src/core/fundamental-screener.js` | MODIFY | JP Phase2 theme 集計を top sector 起点へ寄せ、focused hierarchy との整合を取る |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | 日本株レポートの Phase2 見出しと説明文を意図どおりに修正 |
| `tests/theme-taxonomy.test.js` | MODIFY | JP で Unclassified を出さない分類テストを追加 |
| `tests/fundamental-screener.test.js` | MODIFY | JP Phase2 flow が top sector 起点になることを固定 |
| `tests/daily-screener-report.test.js` | MODIFY | 日本株レポートの Phase2/3/4 見出しと表示内容を固定 |
| `docs/exec-plans/completed/japan-screener-phase2-theme-flow-fix_20260604_1015.md` | MOVE | 完了時に移動 |

## 影響範囲

- `docs/reports/screener/daily-ranking-jp.md`
  - local 再生成で表示確認
- `docs/reports/screener/daily-ranking-jp-run.json`
  - 必要に応じて local payload 確認
- 日本株 workflow が publish する report 見た目
- US market の theme ranking / hierarchy 出力

## 範囲外

- TradingView Phase1 セクターランキング自体の算出方法変更
- みんかぶ scrape 基盤の全面刷新
- 日本株 taxonomy の大規模拡張
- workflow 実機 rerun / GitHub Actions 検証
  - 今回はまずローカル実装とテストでロジックを直す

## 実装方針

### 1. 日本株 Phase2 の母集団を top sector に揃える

- 現状の `themeRanking` は全 Phase2 通過銘柄を集計している
- 日本株では top sector の通過銘柄だけをテーマ集計対象にする
- これで Phase2 テーマランキングとその下の中テーマ/小テーマ/個別銘柄の流れを一致させる

### 2. `Unclassified` を日本株で残さない

- top sector で現実に出ている分類漏れ銘柄を taxonomy 側で吸収する
- それでもラベルが付かない銘柄は、top sector 用の既知テーマへ最小限のフォールバックを入れる

### 3. 見出しを役割ベースで整理する

- Phase2: みんかぶテーマランキング
- Phase3: 上位テーマ群の小テーマ
- Phase4: 上位テーマ群の個別銘柄
- `Electronic Technology` は top sector として説明文に残し、テーマ名としては見せない

## 実施ステップ

- [ ] Step 1: 現行 JP theme 集計と report 出力の差し込み点を確定する
  - 確認: `themeRanking` と `focusedHierarchy` の母集団差分をコード上で特定

- [ ] Step 2: RED として JP Phase2 flow の期待を tests に追加する
  - 確認: `Unclassified` が出る現状を failing test で再現
  - 確認: JP Phase2 theme ranking が top sector 起点である期待を固定

- [ ] Step 3: JP taxonomy / screener 集計ロジックを修正する
  - 確認: top sector でのテーマ分類が埋まる
  - 確認: Phase2 と focused hierarchy の対象が揃う

- [ ] Step 4: report 文言と見出しを日本株向け意図に合わせる
  - 確認: `Electronic Technology` は top sector の説明にだけ現れる
  - 確認: みんかぶテーマランキングの流れが Markdown 上で読める

- [ ] Step 5: local test / report 再生成で検証する
  - 確認: `node --test tests/theme-taxonomy.test.js tests/fundamental-screener.test.js tests/daily-screener-report.test.js` が通る
  - 確認: `SCREENER_MARKET=japan ... node scripts/screener/run-fundamental-screening.mjs` で `daily-ranking-jp.md` の Phase2 表示が意図どおりになる

- [ ] Step 6: REVIEW / COMMIT
  - 確認: plan を `completed/` に移動し、変更一式を main に commit / push する

## テスト戦略

- RED
  - `tests/theme-taxonomy.test.js`
  - `tests/fundamental-screener.test.js`
  - `tests/daily-screener-report.test.js`
- GREEN
  - taxonomy / screener / report 実装
- REFACTOR
  - 日本株分岐に必要な最小 helper 整理のみ

## 検証コマンド

- `node --test tests/theme-taxonomy.test.js tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `SCREENER_MARKET=japan SCREENER_EXCHANGES=TSE SCREENER_SYMBOL_ALLOWLIST_KEY=jpx-prime node scripts/screener/run-fundamental-screening.mjs`

## リスク・注意点

- taxonomy を広げすぎると誤分類が増えるため、今回は実データで漏れている経路だけを埋める
- 既存 report test は US/JP 両方を持つため、見出し変更の副作用に注意する
- `docs/reports/screener/daily-ranking.md` に既存差分があるため巻き込まない

## 競合確認

- active plan:
  - `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md`
  - `docs/exec-plans/active/japan-screener-theme-implementation-and-live-debug_20260602_1500.md`
  - `docs/exec-plans/active/japan-screener-granularity-and-source-feasibility_20260602_1447.md`
- 今回は既存 Japan theme 実装の修正計画であり、競合ではなく follow-up

---

作成者: Codex
作成日時: 2026-06-04T10:15:00+09:00
