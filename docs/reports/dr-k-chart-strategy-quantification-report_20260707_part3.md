# 7. システムの出力イメージ

```json
{
  "ticker": "XXXX",
  "chart_state": "NU_READY",
  "setup_type": "HIGH_N_PATTERN",
  "chart_setup_score": 82.4,

  "pivot_price": 3250,
  "entry_zone_low": 3230,
  "entry_zone_high": 3290,
  "stop_price": 3090,

  "extension_pct": -0.6,
  "base_days": 14,
  "base_width_pct": 6.8,
  "pullback_depth_pct": 7.2,
  "pullback_depth_atr": 1.8,
  "relative_volume": 0.74,

  "market_score": 72,
  "sector_score": 88,
  "leader_score": 91,
  "tightness_score": 84,
  "risk_reward": 3.1,

  "reason_codes": [
    "SECTOR_LEADER",
    "ABOVE_RISING_MA25",
    "LOW_VOLUME_PULLBACK",
    "HIGHER_LOW",
    "NEAR_NEW_PIVOT",
    "SELL_PRESSURE_ABSORPTION"
  ]
}
```

画面上では次の5グループに分けると使いやすいです。

1. **今すぐ触れる**
2. **ブレイク確認済み**
3. **押し目形成中**
4. **見逃し後の再エントリー待ち**
5. **上がりすぎ・見送り**

---

# 8. AI画像判定はどこで使うべきか

AIを最初から主判定にするのではなく、定量ロジックの補助にします。

## AIに任せる部分

- N字とU字の境界が曖昧なケース
- 「締まって見える」「汚く見える」の補助判定
- 上値のしこりや過去の抵抗帯
- 多時間軸をまとめた最終評価
- 数値判定と見た目が食い違うケースの再確認

## AIに任せない部分

- ピボット価格
- 損切り価格
- 5％乖離
- ATR
- 出来高倍率
- MAとの距離
- リスクリワード
- 市場・セクター強度

理想は、

```text
ルール判定：80点
画像AI判定：強気
→ 最終候補

ルール判定：80点
画像AI判定：形が乱れている
→ 人間確認

ルール判定：45点
画像AI判定：強気
→ 原則見送り
```

という使い方です。

---

# 9. 学習・バックテスト方法

「翌日上がったか」だけでは、Dr.K氏の損小利大型戦略を正しく評価できません。

各シグナルについて、

```text
Entry
Stop = -1R
Target1 = +2R
Target2 = +3R
```

を設定し、

- 先に-1Rへ到達したか
- 先に+2Rへ到達したか
- 先に+3Rへ到達したか
- 最大含み益＝MFE
- 最大含み損＝MAE
- 到達までの日数
- 5、10、20、40営業日後のリターン

を保存します。

### 成功ラベル例

```text
SUCCESS_2R =
20営業日以内に
-1Rより先に+2Rへ到達
```

### 必須の検証方式

- 時系列順のウォークフォワード
- 学習期間とテスト期間を分離
- 同じ相場局面をランダム分割しない
- 分割・株式併合を調整
- 上場廃止銘柄を除外しない
- 同一セクター・時価総額帯との比較
- コスト、スリッページ、ストップ安を反映

Dr.K氏の投稿チャートは、パターンを言語化するための**教師データ候補**としては有効ですが、勝ちチャートだけが投稿されている可能性があるため、成績検証用の正解データには直接使わない方が安全です。

---

# 10. Oh-MY-TradingViewへの組み込み方

現在のスクリーニングの後段に、独立した評価モジュールとして追加するのがよいです。

```text
Phase 1～4
既存の市場・業種・個別銘柄スクリーニング
        ↓
Phase 5
Chart Setup Evaluation
        ↓
状態別ランキング
```

想定モジュール構成は次の形です。

```text
src/chart-setup/
├── market-regime.js
├── sector-strength.js
├── trend-phase.js
├── pivot-detector.js
├── base-detector.js
├── breakout-detector.js
├── pullback-detector.js
├── nu-pattern-detector.js
├── absorption-detector.js
├── risk-reward.js
├── setup-state-machine.js
└── setup-scorer.js
```

処理順序は、

```text
1. 市場レジーム判定
2. セクター強度判定
3. リーダー株判定
4. トレンド段階判定
5. ベース・ピボット抽出
6. ブレイク／押し目／N・U字検出
7. 損切り価格決定
8. リスクリワード計算
9. 状態分類
10. 状態内ランキング
```

が最も自然です。

---

## 最終評価

この構想は、単なる「AIにチャート画像を見せて上がりそうか聞く」ものより、はるかに再現性の高いシステムにできます。

特に重要なポイントは次の3つです。

- **形だけでなく、地合い・セクター・相場段階まで数値化する**
- **一つの点数ではなく、現在の状態を分類する**
- **ブレイクを見逃した銘柄は、新しいN字・U字ピボットができた時だけ再評価する**

実装の最初の完成形は、**日足OHLCVを入力すると、状態・ピボット・エントリーゾーン・損切り・スコア・理由コードを返す「Chart Setup Evaluator v0.1」**にするのが最短です。
