# EMA + MACD + RSI Entry Quality Focus-8 200-Pack 実装計画

## 概要

`docs/references/pine/EMA + MACD + RSI Strategy + SL/EMA + MACD + RSI Strategy + SL.pine`
を母体に、**TP は使わずエントリー品質だけを改善する** 200 戦略を設計・実装する。

主目的は以下の 2 点。

1. ダマシで入る回数を減らす
2. 無駄なトレードを減らし、勝率と期待値の両方を改善できる候補を広く探索する

今回の計画では、**10 family / 合計 200 本** を作る。
`EMA + MACD + RSI Strategy + SL` の原本は **control / baseline** として 200 本の中に含める。

## 前提・スコープ

- 対象 universe は `focus-8`
  - 想定銘柄: AAPL / BTCUSD / MSTR / NVDA / PLTR / QQQ / SPY / TSLA
  - 理由: 直近 run と比較しやすく、ユーザー指定とも一致する
- ロング専用のまま進める
- **Take Profit / partial exit / trailing exit は今回の探索対象外**
- 主に **entry 条件** と **entry 前フィルタ** を変更する
- baseline 原本ファイルは変更せず、raw_source 派生ファイルを新規作成する

## 対象ファイル

### 新規作成

| ファイル | 役割 |
|---|---|
| `docs/references/pine/emr-entry-quality-focus8-200pack/*.pine` | 199 本の新規 raw_source Pine（baseline は既存 source を流用） |
| `config/backtest/campaigns/emr-entry-quality-focus8-200pack.json` | focus-8 × 200 strategies の実行定義 |
| `scripts/generate-emr-entry-quality-focus8-200pack.py` | 200 戦略の Pine / catalog / presets / campaign 生成補助 |
| `docs/exec-plans/active/emr-entry-quality-focus8-200pack_20260503_2155.md` | この計画 |

### 変更

| ファイル | 変更内容 |
|---|---|
| `config/backtest/strategy-catalog.json` | 200 戦略を live / raw_source として追加 |
| `config/backtest/strategy-presets.json` | live preset projection に 200 戦略を反映 |
| `tests/campaign.test.js` | 新 campaign の配線と件数を追加 |
| `tests/strategy-catalog.test.js` | live count / expected IDs を更新 |
| `tests/repo-layout.test.js` | strategy count と campaign existence を更新 |

### 変更しないもの

- `docs/references/pine/EMA + MACD + RSI Strategy + SL/EMA + MACD + RSI Strategy + SL.pine`
- `config/backtest/universes/focus-8.json`
- Night Batch workflow / runner / readiness 系
- TP / stop / trailing の個別最適化

## 戦略 family（承認対象）

> 本数配分は、**「ダマシを減らす」「無駄打ちを減らす」** に効きやすい family を厚くしている。  
> 特に **Confluence / Delay / Breakout structure / Fakeout guard** を増やす。

### Family A: Baseline / 感度調整（10）

baseline を含む control 群。EMA / MACD / RSI の感度だけを変えて、原戦略がどこで過敏かを見る。

- A1: baseline 原本（1）
- A2: EMA 感度変更（3）
- A3: MACD 感度変更（2）
- A4: RSI 閾値・RSI EMA 長さ変更（4）

### Family B: Confluence 厳格化（25）

「クロスしたから入る」を弱め、整列の強さを段階化して一定以上だけ入る。

- B1: 3 指標同時整列必須（5）
- B2: MACD histogram 強さゲート（5）
- B3: RSI 50 / 55 / 60 強度ゲート（5）
- B4: close > fast / slow EMA の組み合わせ（5）
- B5: confluence score 4 / 5 / 6 以上（5）

### Family C: ディレイ / フォロースルー確認（25）

シグナル当日に飛びつかず、1〜3 bar 待機して継続を確認してから入る。

- C1: 1 bar 待機 + 高値更新（5）
- C2: 2 bar 待機 + 高値更新（5）
- C3: 3 bar 待機 + 高値更新（5）
- C4: 終値ベース follow-through（5）
- C5: 待機中の RSI / MACD 劣化禁止（5）

### Family D: 価格構造ブレイク確認（25）

指標クロスではなく「本当に価格が抜けたか」を追加確認する。

- D1: 5 / 10 日高値更新（5）
- D2: 20 / 55 日高値更新（5）
- D3: swing high 更新（5）
- D4: Donchian 上限抜け（5）
- D5: breakout + 終値強さ / ベース圧縮条件（5）

### Family E: 大局トレンド / レジーム限定（20）

弱い相場では入らず、上昇トレンド地合いだけに限定する。

- E1: close > EMA200（5）
- E2: EMA50 > EMA200（5）
- E3: EMA200 / slow EMA の傾き条件（5）
- E4: ADX 併用の trend regime（5）

### Family F: 出来高確認（20）

出来高が伴わない上抜けを外す。

- F1: volume > SMA(volume, n)（5）
- F2: relative volume 1.2 / 1.5 / 2.0（5）
- F3: volume spike + OBV 上昇（5）
- F4: CMF / MFI 補助確認（5）

### Family G: ボラティリティ品質フィルタ（20）

ボラが低すぎる / 高すぎる局面を避け、伸びやすい帯だけに寄せる。

- G1: ATR / close の下限・上限帯（5）
- G2: Bollinger width 収縮後拡大（5）
- G3: Keltner squeeze release（5）
- G4: バー実体 / ATR 比とレンジ拡大条件（5）

### Family H: 追加モメンタム指標併用（10）

EMA / MACD / RSI だけでは拾うダマシを別指標で落とす。

- H1: ADX / +DI / -DI の組み合わせ（5）
- H2: Stoch RSI / CCI / ROC / Supertrend の補助利用（5）

### Family I: ダマシ回避ガード（25）

上抜けでも「入ってはいけない形」を定義して除外する。

- I1: 上ヒゲ / 実体比フィルタ（5）
- I2: ギャップアップ過大禁止（5）
- I3: 直前 n bar 急騰後の見送り（5）
- I4: close location value / 弱い終値の除外（5）
- I5: 直近 failed breakout / exhaustion bar 回避（5）

### Family J: プルバック後再加速エントリー（20）

初動クロスではなく、一度押してから再加速する「質の高い二段目」だけを狙う。

- J1: fast EMA への押し目後反発（5）
- J2: slow EMA タッチ後の再上抜け（5）
- J3: breakout 後 3〜5 bar の浅い pullback（5）
- J4: RSI / MACD 正常維持のままの再加速（5）

## 本数配分まとめ

| family | 本数 | 主目的 |
|---|---:|---|
| A Baseline / 感度調整 | 10 | 基準線と感度確認 |
| B Confluence 厳格化 | 25 | 雑な初動クロスを減らす |
| C Delay / Follow-through | 25 | 飛びつき抑制 |
| D Breakout structure | 25 | 価格面の裏取り |
| E Trend / Regime | 20 | 弱地合いの除外 |
| F Volume | 20 | 出来高のないダマシ回避 |
| G Volatility quality | 20 | ボラ帯の最適化 |
| H Extra momentum | 10 | 補助指標での選別 |
| I Fakeout guard | 25 | ダマシ形状の排除 |
| J Pullback resume | 20 | 二段目の質改善 |
| **合計** | **200** | — |

## 実装方針

1. baseline 原本は control として 1 本そのまま使う
2. 199 本は baseline から分岐した raw_source Pine として追加する
3. 200 本を手作業でばらばらに編集せず、**生成スクリプトで一貫生成**する
4. family ごとに命名規則を揃え、strategy ID から意図が読める状態にする
5. campaign は `focus-8` に固定し、まずはエントリー差分だけを観察する

## 実装ステップ

- [x] baseline・既存 pack・catalog / campaign / test 配線を調査
- [x] 10 family の方向性と 200 本配分を承認してもらう
- [x] 200 戦略の最終 naming を固める
- [x] 生成スクリプトを追加する
- [x] `docs/references/pine/emr-entry-quality-focus8-200pack/` に 199 本の新規 Pine を生成する
- [x] `config/backtest/strategy-catalog.json` を更新する
- [x] `config/backtest/strategy-presets.json` を更新する
- [x] `config/backtest/campaigns/emr-entry-quality-focus8-200pack.json` を追加する
- [x] `tests/campaign.test.js` を更新する
- [x] `tests/strategy-catalog.test.js` を更新する
- [x] `tests/repo-layout.test.js` を更新する
- [x] 既存テストを実行して配線を確認する
- [ ] plan を `docs/exec-plans/completed/` に移動してコミット / push する

## テスト戦略

### RED

- 新 campaign が未登録でテストが通らない状態を確認する
- live strategy count / expected IDs / campaign existence の差分をテストで明示する

### GREEN

- 200 本生成 + catalog / presets / campaign を同期してテストを通す

### REFACTOR

- 命名規則・family metadata・生成スクリプトの重複を整理する

## 実行後の検証コマンド

- `node --test tests/campaign.test.js tests/strategy-catalog.test.js tests/repo-layout.test.js`
- `npm test`

## リスク・注意点

- 200 本を手編集すると ID / source_path / campaign 配線のミスが出やすい
- volume 系条件は BTCUSD で出来高意味が株と異なるため、探索結果の解釈で注意が必要
- 追加指標を増やしすぎると「エントリー改善」より「別戦略化」になりやすい
- exit を触ると今回の目的から逸れるので、entry / pre-entry filter に限定する
- active plan 競合確認済み: `run-night-batch_20260429_2344.md` と `repo-structure-align-and-archive-rules_20260424_2015.md` は今回のスコープと重ならない

## 範囲外

- TP / trailing / profit protect の再検討
- baseline 原本そのものの書き換え
- Night Batch 実行結果の research 化
- universe を複数に増やすこと

---

作成者: Copilot
作成日時: 2026-05-03T21:55:33+09:00
