# Exec-plan: us-jp-screener-layout-sync-and-live-verification_20260604_1002

## 概要

目的: 米国株に入れた hierarchy 表示変更を日本株にも揃え、US/JP 両方の daily screener workflow を実際に GitHub Actions で動かして、生成レポートが期待どおりになっていることまで確認する。

今回のゴール:

- 日本株でも `Phase2` 中テーマ / `Phase3` 小テーマ / `Phase4` 個別銘柄ランキングを全表示ベースへ揃える
- US / JP ともに `Phase2 セクター別ランキング` を削除する
- US / JP ともに `上位3件の選定理由` を削除する
- `Daily Fundamental Screener` と `Daily Fundamental Screener Japan` を `workflow_dispatch` で実行する
- publish-to-WSL 後の `docs/reports/screener/daily-ranking.md` と `docs/reports/screener/daily-ranking-jp.md` を確認し、不要 section が消え、hierarchy が期待どおりに出ていることを確認する

## 前提と解釈

- 「日本株の方も同様に」は、US へ入れた hierarchy 全表示方針を JP にも適用する意図と解釈する
- 具体的には、JP でも `selectedMiddleThemes` / `selectedSmallThemes` / `stockRanking` を上位半分や上位3件で切らず、該当テーマ配下を全表示する
- ただし表示の会社名併記など、日本株固有の見せ方は維持する
- live 確認は workflow success だけでなく、publish 後の成果物内容確認まで含める

## 変更・作成ファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/us-jp-screener-layout-sync-and-live-verification_20260604_1002.md` | CREATE | 本計画 |
| `src/core/fundamental-screener.js` | MODIFY | JP も含めた hierarchy 選抜ルールを全表示方針へ揃え、criteria 文言を整える |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | US/JP 両方で `Phase2 セクター別ランキング` と `上位3件の選定理由` を消し、Phase3/4 説明文を実態へ揃える |
| `tests/fundamental-screener.test.js` | MODIFY | JP も hierarchy 全採用になることを固定する |
| `tests/daily-screener-report.test.js` | MODIFY | US/JP 両レポートから不要 section が消え、Phase2/3/4 が全表示になることを固定する |
| `docs/exec-plans/completed/us-jp-screener-layout-sync-and-live-verification_20260604_1002.md` | MOVE | 完了時に移動 |

## 影響範囲

- `docs/reports/screener/daily-ranking.md`
  - US レポートの live 出力確認対象
- `docs/reports/screener/daily-ranking-jp.md`
  - JP レポートの live 出力確認対象
- `docs/reports/screener/daily-ranking-run.json`
- `docs/reports/screener/daily-ranking-jp-run.json`
- `.github/workflows/daily-screener.yml`
- `.github/workflows/daily-screener-japan.yml`
  - workflow 自体は原則 read-only、dispatch と成果物確認が中心

## 範囲外

- テーマ taxonomy 定義の大規模見直し
- スコア weight / 指標自体の再設計
- Portfolio Health Check 系 workflow
- screener 以外の CI 修正

## 実装方針

### 1. hierarchy の選抜は market 共通で全表示へ寄せる

- デフォルトの `topMiddleThemeCount` / `topSmallThemeCount` / `topStockCount` を、US/JP ともに全件採用の向きへ揃える
- テスト fixture では、必要に応じて ranking 件数を増やして「本当に切られていない」ことを確認する

### 2. 不要 section はレポート描画から外す

- `Phase2 セクター別ランキング` は US/JP どちらでも出さない
- `上位3件の選定理由` も US/JP どちらでも出さない
- 既存の Phase2 通過銘柄のセクター内訳 section は現行テストで不要維持のため変更しない

### 3. live 確認は両 workflow を分けて追う

- まず修正を `main` へ push
- その後 US workflow と JP workflow を個別 dispatch
- それぞれ run ID / conclusion / publish 結果 / WSL 側レポート内容を確認する

## 実施ステップ

- [ ] Step 1: 現行 JP hierarchy と不要 section の差し込み点を確認する
  - 確認: `fundamental-screener.js`, `run-fundamental-screening.mjs`, 既存 JP tests

- [ ] Step 2: RED として US/JP テスト期待値を更新する
  - 確認: US/JP とも `Phase2 セクター別ランキング` が出ない
  - 確認: US/JP とも `上位3件の選定理由` が出ない
  - 確認: JP でも hierarchy が全表示になる

- [ ] Step 3: hierarchy 選抜ロジックと Markdown 描画を最小変更で修正する
  - 確認: JP 固有表示は維持
  - 確認: US の直前変更を壊さない

- [ ] Step 4: ローカルテストで確認する
  - 確認: `tests/fundamental-screener.test.js`
  - 確認: `tests/daily-screener-report.test.js`
  - 確認: `git diff --check`

- [ ] Step 5: 修正を `main` へ commit / push する
  - 確認: live workflow 実行対象が最新 `main` になる

- [ ] Step 6: US workflow を実行し、publish 成果物を確認する
  - 確認: `Daily Fundamental Screener` success
  - 確認: `daily-ranking.md` から不要 section が消えている

- [ ] Step 7: JP workflow を実行し、publish 成果物を確認する
  - 確認: `Daily Fundamental Screener Japan` success
  - 確認: `daily-ranking-jp.md` から不要 section が消えている
  - 確認: JP hierarchy が全表示の意図に沿う

- [ ] Step 8: REVIEW / COMMIT
  - 確認: plan を `completed/` に移動し、結果を共有できる状態にする

## テスト戦略

- RED
  - `tests/fundamental-screener.test.js`
  - `tests/daily-screener-report.test.js`
- GREEN
  - `src/core/fundamental-screener.js`
  - `scripts/screener/run-fundamental-screening.mjs`
- Live verification
  - `gh workflow run "Daily Fundamental Screener" --ref main`
  - `gh workflow run "Daily Fundamental Screener Japan" --ref main`

## 検証コマンド

- `node --test tests/fundamental-screener.test.js`
- `node --test tests/daily-screener-report.test.js`
- `git diff --check`
- `gh workflow run "Daily Fundamental Screener" --ref main`
- `gh workflow run "Daily Fundamental Screener Japan" --ref main`
- `gh run watch <run-id>`
- `gh run view <run-id>`

## リスク・注意点

- self-hosted Windows runner の空き状況次第で run 完了まで時間がかかる
- live 実行で publish が走るため、`main` のレポート生成物が更新される
- market 共通化の仕方が雑だと、日本株で意図しないテーマ件数増加や説明文の不整合が出る可能性がある

## 競合確認

- active plan:
  - `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md`
  - `docs/exec-plans/active/japan-screener-granularity-and-source-feasibility_20260602_1447.md`
  - `docs/exec-plans/active/japan-screener-theme-implementation-and-live-debug_20260602_1500.md`
- 今回は screener 出力整形と live verification に限定し、直接競合しない

---

作成者: Codex
作成日時: 2026-06-04T10:02:00+09:00
