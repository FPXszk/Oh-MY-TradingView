# Exec-plan: japan-screener-live-verify-and-kioxia-tune_20260604_1048

## 概要

目的: 日本株 daily screener を実際に動かしてレポート生成まで確認し、`キオクシア (285A)` が現状の相場感に対して不自然に落ちている場合は、日本株向けの閾値・重み・必要最小限のテーマ/プロファイル条件を調整して、上位候補に入る状態まで持っていく。

前提:

- ユーザーの「記憶シェア」は `キオクシア` を指すものとして進める
- 今回は「理論上正しい」ではなく、**実際に workflow / local 実行でレポート出力を確認すること**を成功条件に含める

期待動作:

- `Daily Fundamental Screener Japan` workflow が成功し、`docs/reports/screener/daily-ranking-jp.md` が publish される
- 直近レポートで Phase2 表示が崩れていない
- `キオクシア (285A)` の不採用理由を live output から説明できる
- 必要な調整後、`キオクシア` が日本株スクリーニング結果の上位候補に入る
- US 側 screener には副作用を出さない

## 変更・作成ファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/japan-screener-live-verify-and-kioxia-tune_20260604_1048.md` | CREATE | 本計画 |
| `src/core/sector-screening-profiles.js` | MODIFY | 日本株プロファイル閾値・対象セクター条件の調整 |
| `src/core/fundamental-screener.js` | MODIFY | 必要時のみ日本株ランキング/選抜ロジックを最小修正 |
| `src/core/theme-taxonomy.js` | MODIFY | 必要時のみキオクシア分類やフォーカス導線を補完 |
| `config/screener/theme-taxonomy-jp.json` | MODIFY | 必要時のみキオクシア周辺テーマ定義を補強 |
| `tests/fundamental-screener.test.js` | MODIFY | 日本株でキオクシアが妥当に残る条件を固定 |
| `tests/daily-screener-report.test.js` | MODIFY | 日本株レポート表示が崩れないことを固定 |
| `tests/theme-taxonomy.test.js` | MODIFY | 必要時のみ JP taxonomy の補強を固定 |
| `docs/exec-plans/completed/japan-screener-live-verify-and-kioxia-tune_20260604_1048.md` | MOVE | 完了時に移動 |

## 影響範囲

- `.github/workflows/daily-screener-japan.yml`
  - 原則 read-only verification
- `docs/reports/screener/daily-ranking-jp.md`
  - workflow / local 実行で更新される
- `docs/reports/screener/daily-ranking-jp-run.json`
  - run metadata と live report の確認対象
- 日本株向け profile summary / report 文言

## 範囲外

- US screener の閾値見直し
- みんかぶ scrape 基盤の全面改修
- 日本株 taxonomy の大規模拡張
- workflow publish 以外の unrelated CI 修正

## 実装方針

### 1. まず live 実行で「今どう落ちているか」を確定する

- workflow を dispatch して artifact / publish / report を確認する
- 必要なら local 実行でも payload を見て、`285A` の落ち方を分解する

### 2. キオクシアが落ちる理由を段階別に見る

- Phase1 セクター採用外なのか
- Phase2 client filter 落ちなのか
- 通過後の ranking で上位に届いていないのか
- theme / hierarchy 側で不利なのか

### 3. 日本株専用の最小調整に留める

- まず `JP_PROFILES` の threshold を調整する
- それで足りなければ、日本株だけ ranking block / sector gating を最小修正する
- theme taxonomy は分類漏れやフォーカス不整合がある場合のみ触る

## 実施ステップ

- [ ] Step 1: 現行日本株 workflow / profile / ranking ロジックを確認する
  - 確認: `daily-screener-japan.yml`, `sector-screening-profiles.js`, `fundamental-screener.js`

- [ ] Step 2: `Daily Fundamental Screener Japan` workflow を実行し、レポート生成を live 確認する
  - 確認: run success / artifact / publish / `daily-ranking-jp.md` 更新
  - 確認: Phase2 表示の崩れ有無

- [ ] Step 3: キオクシアの現状を local / live output で診断する
  - 確認: `285A` が Phase1 / Phase2 / ranking のどこで落ちたか
  - 確認: 不採用理由を具体的な数値で説明できる

- [ ] Step 4: RED として日本株向け期待を tests に追加する
  - 確認: 調整前だと `285A` が十分に上位へ残らない期待を固定

- [ ] Step 5: 日本株専用の閾値 / 重み / 最小ロジック調整を実装する
  - 確認: US 側は不変
  - 確認: `285A` が上位候補に入る

- [ ] Step 6: local 実行で再検証する
  - 確認: テスト green
  - 確認: local report 生成成功

- [ ] Step 7: workflow を再実行して live 確認する
  - 確認: publish 済みレポートで `285A` の位置を確認

- [ ] Step 8: REVIEW / COMMIT
  - 確認: plan を `completed/` に移動し、変更一式を main に commit / push する

## テスト戦略

- RED
  - `tests/fundamental-screener.test.js`
  - `tests/daily-screener-report.test.js`
  - 必要時: `tests/theme-taxonomy.test.js`
- GREEN
  - 日本株 profile / ranking 調整
- REFACTOR
  - 日本株分岐に必要な最小 helper のみ

## 検証コマンド

- `node --test tests/theme-taxonomy.test.js tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `SCREENER_MARKET=japan SCREENER_EXCHANGES=TSE SCREENER_SYMBOL_ALLOWLIST_KEY=jpx-prime node scripts/screener/run-fundamental-screening.mjs`
- `gh workflow run "Daily Fundamental Screener Japan" --ref main`
- `gh run watch <run-id>`
- `gh run view <run-id>`

## リスク・注意点

- live market / TradingView 側の momentary fetch failure で rerun が必要になる可能性がある
- キオクシアを通すための緩和が広すぎると、日本株全体のノイズが増える
- `docs/reports/screener/daily-ranking.md` に既存未コミット差分があるため巻き込まない

## 競合確認

- active plan:
  - `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md`
  - `docs/exec-plans/active/japan-screener-theme-implementation-and-live-debug_20260602_1500.md`
  - `docs/exec-plans/active/japan-screener-granularity-and-source-feasibility_20260602_1447.md`
- 今回はその follow-up の live verification / tuning 計画

---

作成者: Codex
作成日時: 2026-06-04T10:48:00+09:00
