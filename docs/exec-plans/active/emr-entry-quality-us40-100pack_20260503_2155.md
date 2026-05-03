# EMA + MACD + RSI Entry Quality US40 100-Pack 実装計画

## 概要

`docs/references/pine/EMA + MACD + RSI Strategy + SL/EMA + MACD + RSI Strategy + SL.pine`
を母体に、**TP は使わずエントリー品質だけを改善する** 100 戦略を設計・実装する。

主目的は以下の 2 点。

1. ダマシで入る回数を減らす
2. 無駄なトレードを減らし、勝率と期待値の両方を改善できる候補を広く探索する

今回の計画では、volume / volatility / 追加指標 / ブレイク確認 / プルバック再加速などを使った
**10 family × 10 strategies = 100 本** を作る。
`EMA + MACD + RSI Strategy + SL` の原本は **control / baseline** として 100 本の中に含める。

## 前提・スコープ

- 想定 universe は `public-top10-us-40`
  - 理由: 出来高フィルタを素直に使いやすく、過去の 50-pack と比較しやすい
- ロング専用のまま進める
- **Take Profit / partial exit / trailing exit は今回の探索対象外**
- 主に **entry 条件** と **entry 前フィルタ** を変更する
- baseline 原本ファイルは変更せず、raw_source 派生ファイルを新規作成する

## 対象ファイル

### 新規作成

| ファイル | 役割 |
|---|---|
| `docs/references/pine/emr-entry-quality-us40-100pack/*.pine` | 100 戦略の raw_source Pine |
| `config/backtest/campaigns/emr-entry-quality-us40-100pack.json` | 40 symbols × 100 strategies の実行定義 |
| `scripts/generate-emr-entry-quality-us40-100pack.py` | 100 戦略の Pine / catalog / presets / campaign 生成補助 |
| `docs/exec-plans/active/emr-entry-quality-us40-100pack_20260503_2155.md` | この計画 |

### 変更

| ファイル | 変更内容 |
|---|---|
| `config/backtest/strategy-catalog.json` | 100 戦略を live / raw_source として追加 |
| `config/backtest/strategy-presets.json` | live preset projection に 100 戦略を反映 |
| `tests/campaign.test.js` | 新 campaign の配線と件数を追加 |
| `tests/strategy-catalog.test.js` | live count / expected IDs を更新 |
| `tests/repo-layout.test.js` | strategy count と campaign existence を更新 |

### 変更しないもの

- `docs/references/pine/EMA + MACD + RSI Strategy + SL/EMA + MACD + RSI Strategy + SL.pine`
- `config/backtest/universes/public-top10-us-40.json`
- Night Batch workflow / runner / readiness 系
- TP / stop / trailing の個別最適化

## 戦略 family（承認対象）

### Family A: Baseline / 感度調整（10）

baseline を含む control 群。EMA / MACD / RSI の感度だけを変えて、原戦略がどこで過敏かを見る。

1. baseline 原本
2. EMA を速める
3. EMA を遅くする
4. MACD を速める
5. MACD を遅くする
6. RSI 閾値を 52 に上げる
7. RSI 閾値を 55 に上げる
8. EMA + MACD を同時に速める
9. EMA + MACD を同時に遅くする
10. RSI EMA 長さを変更してノイズ耐性を見る

### Family B: Confluence 厳格化（10）

「クロスしたから入る」を弱め、整列の強さを点数化して一定以上だけ入る。

- EMA / MACD / RSI の 3 要素同時整列
- MACD histogram 正領域必須
- RSI > 50 / 55 / 60
- close > fast EMA / slow EMA
- confluence score 4 / 5 / 6 以上

### Family C: ディレイ / フォロースルー確認（10）

シグナル当日に飛びつかず、1〜3 bar 待機して継続を確認してから入る。

- signal bar 高値ブレイク
- 1 / 2 / 3 bar 以内の上抜け
- 待機中に RSI / MACD が悪化しないこと
- 終値ベースでの follow-through を要求

### Family D: 価格構造ブレイク確認（10）

指標クロスではなく「本当に価格が抜けたか」を追加確認する。

- 5 / 10 / 20 / 55 日高値更新
- 直近 swing high 更新
- Donchian 上限抜け
- 前日高値 + 当日終値強さ

### Family E: 大局トレンド / レジーム限定（10）

弱い相場では入らず、上昇トレンド地合いだけに限定する。

- close > EMA200
- EMA50 > EMA200
- EMA200 上向き
- slow EMA の傾きが正
- ADX 併用でトレンド有無を選別

### Family F: 出来高確認（10）

出来高が伴わない上抜けを外す。

- volume > SMA(volume, n)
- relative volume > 1.2 / 1.5 / 2.0
- volume spike 必須
- OBV 上昇
- CMF / MFI を補助確認

### Family G: ボラティリティ品質フィルタ（10）

ボラが低すぎる / 高すぎる局面を避け、伸びやすい帯だけに寄せる。

- ATR / close の下限・上限
- Bollinger Band width の収縮後拡大
- Keltner squeeze release
- n 日レンジ拡大直後のみ
- 当日実体と ATR 比でバー品質を選別

### Family H: 追加モメンタム指標併用（10）

EMA / MACD / RSI だけでは拾うダマシを別指標で落とす。

- ADX / +DI / -DI
- Stoch RSI
- CCI
- ROC
- Supertrend 方向一致

### Family I: ダマシ回避ガード（10）

上抜けでも「入ってはいけない形」を定義して除外する。

- 上ヒゲ長すぎ禁止
- ギャップアップ過大禁止
- 直前 n bar 急騰後は見送り
- 直前陰線包み / 失速バー回避
- 終値位置（close location value）で弱いバー除外

### Family J: プルバック後再加速エントリー（10）

初動クロスではなく、一度押してから再加速する「質の高い二段目」だけを狙う。

- fast EMA への押し目後反発
- slow EMA タッチ後の再上抜け
- breakout 後 3〜5 bar の浅い pullback
- RSI 50 割れなしの押し目
- MACD 正領域維持のままの再加速

## 実装方針

1. baseline 原本は control として 1 本そのまま使う
2. 99 本は baseline から分岐した raw_source Pine として追加する
3. 100 本を手作業でばらばらに編集せず、**生成スクリプトで一貫生成**する
4. family ごとに命名規則を揃え、strategy ID から意図が読める状態にする
5. campaign は `public-top10-us-40` に固定し、比較軸を増やしすぎない

## 実装ステップ

- [x] baseline・既存 50-pack・catalog / campaign / test 配線を調査
- [ ] 10 family の方向性と本数配分を承認してもらう
- [ ] 100 戦略の最終 naming を固める
- [ ] 生成スクリプトを追加する
- [ ] `docs/references/pine/emr-entry-quality-us40-100pack/` に 100 本の Pine を生成する
- [ ] `config/backtest/strategy-catalog.json` を更新する
- [ ] `config/backtest/strategy-presets.json` を更新する
- [ ] `config/backtest/campaigns/emr-entry-quality-us40-100pack.json` を追加する
- [ ] `tests/campaign.test.js` を更新する
- [ ] `tests/strategy-catalog.test.js` を更新する
- [ ] `tests/repo-layout.test.js` を更新する
- [ ] 既存テストを実行して配線を確認する
- [ ] plan を `docs/exec-plans/completed/` に移動してコミット / push する

## テスト戦略

### RED

- 新 campaign が未登録でテストが通らない状態を確認する
- live strategy count / expected IDs / campaign existence の差分をテストで明示する

### GREEN

- 100 本生成 + catalog / presets / campaign を同期してテストを通す

### REFACTOR

- 命名規則・family metadata・生成スクリプトの重複を整理する

## 実行後の検証コマンド

- `node --test tests/campaign.test.js tests/strategy-catalog.test.js tests/repo-layout.test.js`
- `npm test`

## リスク・注意点

- 100 本を手編集すると ID / source_path / campaign 配線のミスが出やすい
- volume 系条件は US 株では有効でも、BTC 系を混ぜると意味が変わる
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
