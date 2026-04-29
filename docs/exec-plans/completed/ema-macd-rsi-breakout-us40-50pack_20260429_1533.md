# EMA + MACD + RSI Breakout US40 50-Pack 実装計画

## 概要

`docs/references/pine/EMA + MACD + RSI Strategy + SL/EMA + MACD + RSI Strategy + SL.pine` を母体に、**ブレイクアウトで利益を伸ばす**ことを主眼にした 50 戦略を新規作成する。  
全戦略で以下を固定する。

- universe: `public-top10-us-40`（既存 40 銘柄）
- start date: `2015-01-01`
- end date: `2026-04-27`
- ベース戦略: EMA / MACD / RSI 合流エントリー + ロングのみ + stop 搭載

今回の実装は、既存の US40 pack と同じく **raw_source Pine を 50 本作成 → catalog / live presets / campaign に登録** する方針で進める。

## 対象ファイル

### 新規作成

| ファイル | 役割 |
|---|---|
| `docs/references/pine/ema-macd-rsi-breakout-us40-50pack/*.pine` | 下記 50 戦略 ID に対応する raw_source Pine |
| `config/backtest/campaigns/ema-macd-rsi-breakout-us40-50pack.json` | 40 symbols × 50 strategies の実行定義 |

### 変更

| ファイル | 変更内容 |
|---|---|
| `config/backtest/strategy-catalog.json` | 50 戦略を live / raw_source として追加 |
| `config/backtest/strategy-presets.json` | live preset projection に 50 戦略を反映 |
| `tests/campaign.test.js` | 新 campaign の 40 x 50 / SPY smoke / date override を追加 |
| `tests/strategy-catalog.test.js` | live count・expected live IDs を更新 |
| `tests/repo-layout.test.js` | catalog 件数期待値を更新 |

### 変更しないもの

- `docs/references/pine/EMA + MACD + RSI Strategy + SL/EMA + MACD + RSI Strategy + SL.pine`
- `config/backtest/universes/public-top10-us-40.json`
- night batch / runner / workflow 配線

## 戦略設計 50 本（実装候補）

各戦略の Pine ファイル名は `docs/references/pine/ema-macd-rsi-breakout-us40-50pack/<strategy-id>.pine` とする。

### Family A: ベース感度調整（5）

1. `emr-breakout-base-ema8-21-macd12-26-9-rsi50-stop8` — EMA を速めて初動寄りにする
2. `emr-breakout-base-ema10-24-macd12-26-9-rsi50-stop8` — EMA をやや鈍化してダマシ抑制
3. `emr-breakout-base-ema12-26-macd12-26-9-rsi52-stop8` — slow 寄り + RSI 閾値少し上げ
4. `emr-breakout-base-ema9-20-macd8-21-5-rsi50-stop8` — MACD も速めて短期ブレイク追従
5. `emr-breakout-base-ema15-30-macd12-26-9-rsi55-stop8` — より太い上昇だけ拾う

### Family B: クロス後ディレイ / 継続確認（5）

6. `emr-breakout-delay-1bar-close-above-signal-high` — 条件成立翌日に signal bar 高値超えで入る
7. `emr-breakout-delay-2bar-close-above-signal-high` — 2 日以内の高値更新で入る
8. `emr-breakout-delay-3bar-close-above-signal-high` — 3 日以内フォロースルー確認
9. `emr-breakout-delay-2bar-close-above-ema-fast` — 待機後も fast EMA 上維持を要求
10. `emr-breakout-delay-3bar-macd-hist-rising` — 待機中の MACD ヒストグラム改善も要求

### Family C: 価格ブレイクアウト確認（5）

11. `emr-breakout-confirm-close-above-5d-high` — エントリー前に 5 日高値終値突破
12. `emr-breakout-confirm-close-above-10d-high` — 10 日高値突破で強い伸びだけ拾う
13. `emr-breakout-confirm-intraday-above-20d-high` — 20 日高値更新を条件化
14. `emr-breakout-confirm-breakout-and-rsi55` — 高値更新 + RSI 55 以上
15. `emr-breakout-confirm-breakout-and-macd-positive` — 高値更新 + MACD ヒストグラム正

### Family D: 大局トレンド・地合いフィルタ（5）

16. `emr-breakout-trend-price-above-ema200` — 価格が EMA200 上のみ
17. `emr-breakout-trend-ema50-above-ema200` — 中期上昇トレンド限定
18. `emr-breakout-trend-ema200-rising-20bars` — EMA200 上向き限定
19. `emr-breakout-trend-price-above-ema200-rsi55` — 大局上昇 + 強い RSI
20. `emr-breakout-trend-ema50-200-and-macd-positive` — トレンド + MACD 正領域

### Family E: ストップ幅チューニング（5）

21. `emr-breakout-stop6-base-exit` — hard stop を 6% に縮小
22. `emr-breakout-stop7-base-exit` — hard stop を 7% に縮小
23. `emr-breakout-stop9-base-exit` — hard stop を 9% に拡張
24. `emr-breakout-stop10-base-exit` — hard stop を 10% に拡張
25. `emr-breakout-stop8-signal-low-buffer` — 8% と signal bar 安値の広い方を採用

### Family F: 建値移動・損失圧縮（5）

26. `emr-breakout-breakeven-at-plus4` — 含み益 4% 到達で建値ストップ
27. `emr-breakout-breakeven-at-plus6` — 含み益 6% 到達で建値ストップ
28. `emr-breakout-breakeven-at-plus8` — 含み益 8% 到達で建値ストップ
29. `emr-breakout-breakeven-plus1-after-plus6` — +6% 到達後は +1% 利益確保
30. `emr-breakout-breakeven-plus2-after-plus8` — +8% 到達後は +2% 利益確保

### Family G: 固定 TP / 分割利確（5）

31. `emr-breakout-tp8-full-exit` — +8% で全利確
32. `emr-breakout-tp10-full-exit` — +10% で全利確
33. `emr-breakout-tp12-full-exit` — +12% で全利確
34. `emr-breakout-tp8-half-then-trail-ema20` — +8% で半分利確、その後 EMA20 追尾
35. `emr-breakout-tp10-half-then-trail-ema20` — +10% で半分利確、その後 EMA20 追尾

### Family H: トレーリング利確（5）

36. `emr-breakout-trail-atr14x2` — ATR14 × 2 追尾
37. `emr-breakout-trail-atr14x25` — ATR14 × 2.5 追尾
38. `emr-breakout-trail-atr14x3` — ATR14 × 3 追尾
39. `emr-breakout-trail-chandelier-22x25` — Chandelier 22 / 2.5
40. `emr-breakout-trail-chandelier-22x3` — Chandelier 22 / 3

### Family I: 利益保護エグジット（5）

41. `emr-breakout-profit-protect-close-below-ema10` — 利が乗った後は EMA10 割れで降りる
42. `emr-breakout-profit-protect-close-below-ema15` — 利が乗った後は EMA15 割れで降りる
43. `emr-breakout-profit-protect-close-below-ema20` — 利が乗った後は EMA20 割れで降りる
44. `emr-breakout-profit-protect-macd-bear-after-plus6` — +6% 以降は MACD ベアクロスで利確
45. `emr-breakout-profit-protect-rsi-loss-55-after-plus8` — +8% 以降は RSI 55 割れで利確

### Family J: 勢い継続の厳格化（5）

46. `emr-breakout-strength-rsi55-and-rsi-over-rsiema` — RSI 55 以上で継続要求
47. `emr-breakout-strength-rsi60-and-rsi-over-rsiema` — RSI 60 以上でより厳格に
48. `emr-breakout-strength-macd-hist-rising-3bars` — MACD ヒストグラム 3 本連続改善
49. `emr-breakout-strength-all-align-and-close-above-fast-ema` — 3 指標整列 + fast EMA 上終値
50. `emr-breakout-strength-all-align-and-breakout-5d-high` — 3 指標整列 + 5 日高値突破

## 実装方針

1. 既存ベース Pine を複製し、全 50 戦略で **Date Range を inline で固定**する  
   `startDate = timestamp(2015, 1, 1, 0, 0)`  
   `endDate = timestamp(2026, 4, 27, 0, 0)`
2. campaign 側でも `date_override` を同じ期間に固定し、Pine 内固定日付と実行定義のズレをなくす
3. 50 戦略はすべて `raw_source` として `strategy-catalog.json` に live 追加する
4. `strategy-presets.json` の live projection も同期更新する
5. smoke phase は既存 US40 pack と同じく `SPY` 1 銘柄で 50 本を 1 回ずつ確認する

## 実装ステップ

- [x] ベース Pine・既存 US40 pack・catalog/campaign/test 配線を調査
- [ ] 50 戦略案の最終 naming と family 分割を固定
- [ ] `docs/references/pine/ema-macd-rsi-breakout-us40-50pack/` に 50 本の Pine を追加
- [ ] `config/backtest/strategy-catalog.json` に 50 戦略を追加
- [ ] `config/backtest/strategy-presets.json` に 50 live preset を反映
- [ ] `config/backtest/campaigns/ema-macd-rsi-breakout-us40-50pack.json` を追加
- [ ] `tests/campaign.test.js` に新 campaign の matrix / smoke / date assertions を追加
- [ ] `tests/strategy-catalog.test.js` の live count / live IDs を更新
- [ ] `tests/repo-layout.test.js` の catalog count を更新
- [ ] 実装レビュー
- [ ] commit/push 前に plan を `docs/exec-plans/completed/` へ移動

## テスト戦略（RED → GREEN → REFACTOR）

### RED

- `tests/campaign.test.js` に新 campaign の 40 x 50 / smoke 50 / date `2026-04-27` 期待を先に追加
- `tests/strategy-catalog.test.js` に live count と live IDs の期待更新を先に入れる
- `tests/repo-layout.test.js` の catalog count 期待値を先に更新する

### GREEN

- 50 Pine / catalog / live presets / campaign を追加して上記テストを通す

### REFACTOR

- family ごとに条件分岐が重複しすぎる場合のみ、Pine 内コメントや共通ブロックの整理を行う
- 既存ベースファイルや無関係な strategy family には手を入れない

## 検証コマンド

- `node --test tests/campaign.test.js tests/strategy-catalog.test.js tests/repo-layout.test.js`
- `npm test`

## リスク / 注意点

- `strategy-catalog.json` と `strategy-presets.json` は live ID の整合が必須で、片側だけ更新すると複数テストが崩れる
- raw_source 戦略は Pine 側の固定期間と campaign 側の `date_override` がズレると比較条件が崩れる
- 50 本を一気に入れるため、命名規則と family 境界を先に固定しないと差分レビューが難しくなる
- 既存 active plan `repo-structure-align-and-archive-rules_20260424_2015.md` とは対象が別で、直接の競合はない

## スコープ外

- 新しいポジションサイジング機構の導入
- universe の入れ替えや銘柄追加
- intraday timeframe 対応
- バックテスト結果の評価レポート自動生成ルール追加
