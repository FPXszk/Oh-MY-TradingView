# Exec-plan: ema-breakout-winrate-stopout-50pack_20260430_2126

## 概要

目的: `Night Batch Self Hosted #77` の結論を受け、**NVDA 依存の検証は行わず**、`極端に低い勝率の改善` と `ブレイクアウト前の stop loss で本命上昇を取り逃がす問題の切り分け` を最優先にした次回 50 戦略 backtest campaign を実装する。

前提:

- 比較の連続性を保つため、対象 universe は引き続き `public-top10-us-40` を使う
- date range は `2015-01-01` から直近 campaign と同じ終端までを維持する
- ベース戦略は run77 上位だった `emr-breakout-trend-price-above-ema200` と `emr-breakout-confirm-close-above-10d-high` の系統を主軸とする
- 今回は「勝率が低い理由」と「早すぎる損切り」の切り分けが主目的なので、NVDA 除外集計や銘柄依存検証は範囲外とする

## 変更ファイル

- `docs/exec-plans/active/ema-breakout-winrate-stopout-50pack_20260430_2126.md` (本計画の作成)
- `config/backtest/campaigns/ema-breakout-winrate-stopout-us40-50pack.json` (新しい 50-pack campaign 定義)
- `config/backtest/strategy-presets.json` (新規 preset 50 本の登録)
- `docs/references/pine/ema-breakout-winrate-stopout-us40-50pack/*.pine` (新規 Pine source 50 本)
- 必要に応じて `config/night_batch/bundle-foreground-reuse-config.json` または関連 run 手順 docs (この campaign を既定実行に切り替える場合のみ)
- `docs/exec-plans/completed/ema-breakout-winrate-stopout-50pack_20260430_2126.md` (COMMIT step で移動)

## 影響範囲

- 新 campaign により、EMA breakout 系の比較軸が「PF 最大化」から「勝率改善と早期 stopout 回避」へ移る
- `strategy-presets.json` に 50 本追加されるため、preset catalog と source_path 整合性に影響する
- Pine source を 50 本追加するため、命名規則と共通ロジック差分の一貫性が重要になる

## 50 戦略の設計方針

### A. Anchor 5本

run77 の比較基準として残す:

1. `trend-price-above-ema200` anchor
2. `confirm-close-above-10d-high` anchor
3. `trend-ema50-above-ema200` anchor
4. `confirm-close-above-5d-high` anchor
5. `trend-price-above-ema200-rsi55` anchor

### B. Entry 厳格化で勝率改善を狙う 10本

狙い: 弱い初動を減らし、勝率を押し上げる

1. breakout close が 20 日高値を終値で上抜く
2. breakout close が 20 日高値 + 0.5 ATR を上抜く
3. breakout 日の出来高が 20 日平均超
4. breakout 日の出来高が 1.5 倍超
5. RSI 55 以上 + MACD histogram 正
6. RSI 60 以上 + price above EMA200
7. signal 後 1 日待機し高値更新で entry
8. signal 後 2 日待機し高値更新で entry
9. 10 日高値突破 + 終値が fast EMA 上
10. 20 日高値突破 + 終値が前日高値上

### C. 初期 stop 遅延 / 緩和で stopout 取り逃がしを切る 10本

狙い: breakout 前のノイズで切られないかを確認する

1. hard stop 発動を entry 後 3 bar 遅延
2. hard stop 発動を entry 後 5 bar 遅延
3. hard stop 発動を 含み益 +2% 到達後まで遅延
4. hard stop 発動を breakout high 更新後まで遅延
5. 初期 3 bar は signal bar 安値のみ参照
6. 初期 5 bar は ATR 1.5 ベース stop
7. 初期 5 bar は ATR 2.0 ベース stop
8. 初期 stop を swing low - 0.5 ATR に変更
9. 初期 stop を signal low - 1.0 ATR に変更
10. 初期 stop を fixed 8% と signal low buffer の広い方に加え 3 bar grace を付与

### D. Stop 後の再突入可否を検証する 10本

狙い: 一度 cut された後の本命上昇を取り戻せるか確認する

1. stopout 後 10 bar 以内に 10 日高値再突破で 1 回だけ re-entry
2. stopout 後 15 bar 以内に 20 日高値再突破で re-entry
3. stopout 後 fast EMA reclaim で re-entry
4. stopout 後 MACD positive reclaim で re-entry
5. stopout 後 RSI 55 reclaim で re-entry
6. stopout 後 breakout high 終値更新で re-entry
7. grace stop + 10 日高値 re-entry
8. ATR stop + breakout high re-entry
9. signal low stop + EMA200 trend 維持時のみ re-entry
10. re-entry は half size 想定の保守 variant

### E. Exit 再設計で勝率改善を狙う 10本

狙い: entry を維持しつつ、負け方を制御して勝率を押し上げる

1. +6% 到達で建値化
2. +4% 到達で stop を -2% まで引き上げ
3. +8% 到達で half 利確 + EMA20 trail
4. +10% 到達で half 利確 + EMA20 trail
5. close below EMA10 exit
6. close below EMA15 exit
7. MACD bearish cross after +6%
8. RSI loss 55 after +8%
9. ATR14x2.5 trailing
10. chandelier 22x2.5 だが初期 5 bar grace 付き

### F. 混成 5本

run77 の問題意識を直接当てる本命候補:

1. EMA200 trend + 10 日高値 confirm + 3 bar grace stop
2. EMA200 trend + 20 日高値 confirm + signal low - ATR buffer
3. 10 日高値 confirm + stopout 後 breakout reclaim re-entry
4. EMA200 trend + +6% 建値化 + close below EMA15 exit
5. EMA200 trend + volume confirm + 5 bar delayed stop

## 実装ステップ

- [ ] run77 の上位 / 低勝率 / stop 系 preset を基準に、新 50 本の ID 命名規則を確定する
- [ ] `docs/references/pine/ema-breakout-winrate-stopout-us40-50pack/` に新規 Pine source 50 本を作成する
- [ ] `config/backtest/strategy-presets.json` に 50 本を追加し、`source_path` と説明文を整合させる
- [ ] `config/backtest/campaigns/ema-breakout-winrate-stopout-us40-50pack.json` を追加し、US40 universe / smoke / full 条件を定義する
- [ ] 可能なら smoke 向けに少数戦略で compile / artifact 生成まで確認する
- [ ] 必要に応じて次回 run 用の config 参照先をこの campaign に差し替える

## テスト戦略

- RED: なし。新 campaign / preset 追加タスク
- GREEN: `strategy-presets.json` と新 campaign JSON の構文整合、参照 Pine file の存在確認、最低限の smoke 実行確認
- REFACTOR: なし。追加分のみで閉じる

## 検証コマンド

- `node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('config/backtest/strategy-presets.json','utf8')); console.log('ok')"`
- `node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('config/backtest/campaigns/ema-breakout-winrate-stopout-us40-50pack.json','utf8')); console.log('ok')"`
- `rg 'emr-breakout-winrate-stopout' config/backtest/strategy-presets.json docs/references/pine/ema-breakout-winrate-stopout-us40-50pack`
- 必要なら `node scripts/backtest/run-finetune-bundle.mjs --host 127.0.0.1 --ports 9223 --phases smoke --us-campaign ema-breakout-winrate-stopout-us40-50pack`

## リスク・注意点

- `re-entry` を含めると Pine 実装の分岐が増えるため、過剰に抽象化せず差分を明確に保つ必要がある
- `勝率改善` を狙って confirm を増やしすぎると trade 数不足で過学習寄りになる可能性がある
- `stop 遅延` は DD を悪化させる可能性が高いため、勝率だけでなく DD / PF も同時監視が必要
- `docs/exec-plans/active/run-night-batch_20260429_2344.md` が残っているため、night batch 実行対象の切替は競合に注意する

## 範囲外

- NVDA 除外や銘柄依存の再集計
- US40 universe 自体の見直し
- 既存 run77 ドキュメントの再編集

---

作成者: Codex
作成日時: 2026-04-30T21:26:00+09:00
