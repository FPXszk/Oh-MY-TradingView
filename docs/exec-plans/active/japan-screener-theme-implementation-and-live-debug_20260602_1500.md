# Exec-plan: japan-screener-theme-implementation-and-live-debug_20260602_1500

## 概要

目的: 既存の Japan daily screener を、前回合意した方針どおり **TradingView broad screener + repo 独自 JP theme taxonomy** へ拡張し、実際に GitHub Actions workflow を動かして debug し、結果を durable session log と handoff に残す。

今回の期待動作:

- Japan レポートに theme ranking が出る
- 4桁コードだけでなく **`8035 (Tokyo Electron)` のようにコード + 会社名** で表示される
- ユーザーが例示した `キオクシア`、`村田製作所`、`ソフトバンク` が、少なくとも taxonomy / 表示 / ranking の観点で適切に扱える
  - ただし live market data に依存するため、**常に最終上位に入ること自体は保証しない**
  - 代わりに、入らない場合は「なぜ落ちたか」を live output から説明できる状態にする
- `Daily Fundamental Screener Japan` workflow を実行し、report publish まで通す
- 実装内容、run id、結果、残課題、再開ポイントを `docs/sessions/` に残す

## 変更・作成ファイル

| ファイル | 種別 | 役割 |
|---|---|---|
| `docs/exec-plans/active/japan-screener-theme-implementation-and-live-debug_20260602_1500.md` | CREATE | 本計画 |
| `config/screener/theme-taxonomy-jp.json` | CREATE | 日本株向け中テーマ / 小テーマ / symbol / keyword 定義 |
| `config/screener/theme-hierarchy-jp.json` | CREATE | JP focused hierarchy 用の中テーマ / 小テーマ構成 |
| `config/screener/external-theme-reference-jp.json` | CREATE | みんかぶ等を参照した external confirmation 対応表 |
| `src/core/theme-taxonomy.js` | MODIFY | JP taxonomy / hierarchy / external reference 追加、market-aware 分岐追加 |
| `src/core/fundamental-screener.js` | MODIFY | JP でも theme ranking / focused hierarchy を返す、表示用 name を保持 |
| `scripts/screener/run-fundamental-screening.mjs` | MODIFY | Japan report に theme ranking を出す、4桁コードへ会社名を併記する |
| `tests/theme-taxonomy.test.js` | MODIFY | JP taxonomy 判定テスト追加 |
| `tests/fundamental-screener.test.js` | MODIFY | JP market で theme ranking / focused hierarchy / 表示名 payload を固定 |
| `tests/daily-screener-report.test.js` | MODIFY | JP report の theme 章とコード+会社名表示を固定 |
| `docs/sessions/japan-screener-theme-implementation-and-live-debug_20260602_1500.md` | CREATE | durable session log |
| `docs/sessions/japan-screener-theme-handoff_20260602_1500.md` | CREATE | 次回再開用 handoff |
| `docs/exec-plans/completed/japan-screener-theme-implementation-and-live-debug_20260602_1500.md` | MOVE | 完了時に移動 |

## 影響範囲

- `.github/workflows/daily-screener-japan.yml`
  - 基本は read-only verification 対象
  - 必要時のみ env や publish まわりを最小修正
- `docs/reports/screener/daily-ranking-jp.md`
  - workflow rerun により更新される
- `docs/reports/screener/daily-ranking-jp-run.json`
  - workflow rerun により更新される
- 共有ロジックのため US 向け screener report に副作用が出ないことも確認する

## 範囲外

- US screener taxonomy の再設計
- TradingView を捨てて日本株 source を全面置換すること
- 4桁コードが live ranking に入らなかった銘柄を無理に掲載すること
- みんかぶ live scraping 基盤の恒久整備
  - 今回は repo 内 taxonomy の初期導入を優先する

## 実装方針

### 1. JP theme taxonomy は repo asset を正本にする

- `theme-taxonomy-jp.json` に初期テーマ群を持つ
- 初期候補:
  - Semiconductor
  - Semiconductor Equipment
  - Components / Passive / Sensors
  - Telecom / Platform
  - AI / Data Center
  - Defense / Security
  - Electric Wire / Grid
  - Trading House
  - Battery / Power

### 2. みんかぶは external confirmation layer として使う

- みんかぶテーマ名を `external-theme-reference-jp.json` に写像する
- live HTML に毎回強依存する構造は避ける

### 3. Japan report は「コード + 会社名」を標準にする

- すべての主要 ranking table で `#### (Company Name)` 表示へ寄せる
- symbol-only 表示を残すなら補助列に限定する

### 4. 期待銘柄は taxonomy と live debug の両面で確認する

- `Kioxia`, `Murata Manufacturing`, `SoftBank`
  - taxonomy に意図どおり分類されるか
  - live workflow で出ない場合は threshold / phase / sector 採用状況を session log に残す

## 実施ステップ

- [ ] Step 1: 現行 JP screener code / tests / workflow を読み、theme 追加の差し込み点を確定する
  - 確認: `fundamental-screener.js`, `theme-taxonomy.js`, `run-fundamental-screening.mjs`, 既存 JP tests

- [ ] Step 2: RED として JP taxonomy / report の期待をテストへ追加する
  - 確認: JP で theme ranking が出ない現状 failing test を作る
  - 確認: `8035 (Tokyo Electron)` のような表示期待を test で固定する

- [ ] Step 3: JP taxonomy / hierarchy / external reference を実装する
  - 確認: unit tests が通る
  - 確認: Kioxia / Murata / SoftBank の分類期待を test で固定できる

- [ ] Step 4: JP screener payload と Markdown 出力を拡張する
  - 確認: JP report に theme ranking / 必要なら focused hierarchy が出る
  - 確認: 4桁コード表示が会社名付きになる

- [ ] Step 5: local 実行で Japan report を再生成し、出力を確認する
  - 確認: `SCREENER_MARKET=japan ... node scripts/screener/run-fundamental-screening.mjs` が成功する
  - 確認: 期待銘柄の掲載有無と理由を確認できる

- [ ] Step 6: GitHub Actions `Daily Fundamental Screener Japan` を dispatch して live debug する
  - 確認: run success / artifact / publish / WSL sync
  - 確認: live report と metadata の更新

- [ ] Step 7: session log と handoff を作成する
  - 確認: 実装内容、run id、結果、残課題、再開手順が `docs/sessions/` に残る

- [ ] Step 8: REVIEW / COMMIT
  - 確認: plan を `completed/` へ移動し、変更一式を main に commit / push する

## テスト戦略

- RED
  - `tests/theme-taxonomy.test.js`
  - `tests/fundamental-screener.test.js`
  - `tests/daily-screener-report.test.js`
- GREEN
  - taxonomy / screener / report 実装
- REFACTOR
  - US/JP 共通化できる helper だけ整理し、不要な抽象化は増やさない

## 検証コマンド

- `node --test tests/theme-taxonomy.test.js tests/fundamental-screener.test.js tests/daily-screener-report.test.js`
- `SCREENER_MARKET=japan SCREENER_EXCHANGES=TSE SCREENER_SYMBOL_ALLOWLIST_KEY=jpx-prime node scripts/screener/run-fundamental-screening.mjs`
- `gh workflow run "Daily Fundamental Screener Japan" --ref main`
- `gh run watch <run-id>`
- `gh run view <run-id>`

## リスク・注意点

- live market data 次第で期待銘柄が上位に入らない可能性がある
- Kioxia が TradingView / TSE symbol としてどう表現されるかを live で確認する必要がある
- `docs/reports/screener/daily-ranking.md` に既存未コミット差分があるため、US report 側は巻き込まない
- JP taxonomy を急ぎで広げすぎると誤分類が増えるため、初回は主要テーマに絞る

## 競合確認

- active plan:
  - `docs/exec-plans/active/screener-architecture-flow-doc_20260601_1430.md`
  - `docs/exec-plans/active/japan-screener-granularity-and-source-feasibility_20260602_1447.md`
- 今回は別 plan 追加で、直接競合はない

---

作成者: Codex
作成日時: 2026-06-02T15:00:00+09:00
