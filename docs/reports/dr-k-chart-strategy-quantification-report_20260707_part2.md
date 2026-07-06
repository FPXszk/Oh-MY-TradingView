# 4. 定量化仕様案 v0.1

以下の数値は、本人が明示した「5％」「5・10・25日線」「数か月」「10倍出来高」以外は、まずバックテストを開始するための**仮の初期値**です。

## 共通指標

```text
ATR_PCT       = ATR(20) / Close
REL_VOLUME    = Volume / MedianVolume(20)
PIVOT_DIST    = (Close - PivotPrice) / PivotPrice
PIVOT_DIST_ATR= (Close - PivotPrice) / ATR(20)

RS_20         = StockReturn(20) - BenchmarkReturn(20)
SECTOR_RS_20  = SectorReturn(20) - BenchmarkReturn(20)
```

ATRで正規化することで、値動きの大きい小型株と大型株を同じ基準で比較しやすくなります。

## 4-1. ベース形成

```text
base_days             >= 40営業日
base_width_pct         <= 25%
last_20d_width
    < first_20d_width
ATR20 / ATR60          < 0.8
down_volume / up_volume が縮小
```

### 締まりスコア

```text
tightness_score =
    値幅収縮
  + ATR収縮
  + 出来高枯れ
  + 安値切り上げ
  - 大陰線回数
  - ギャップ乱発
  - 長い下ヒゲの乱発
```

「数か月」を厳格にするモンスターストック用では、60～120営業日程度まで条件を引き上げます。

## 4-2. ピボット価格

単純な過去最高値だけではなく、複数回止められた価格帯を検出します。

```text
pivot_price =
    過去高値クラスタの中央値
```

候補アルゴリズムは、

- ZigZagによるスイング高値抽出
- 高値価格をATR単位でクラスタリング
- 接触回数が2回以上ある抵抗帯を採用
- 最も直近かつ明確な抵抗帯をピボットに設定

です。

## 4-3. 「今すぐ触れる」ブレイク直前

```text
-1.5% <= PIVOT_DIST <= +2.0%
tightness_score >= 70
Close > MA20 > MA50
MA20_slope > 0
sector_score >= 60
market_regime != RISK_OFF
```

当日ブレイク成立は、

```text
Close > PivotPrice + 0.1 × ATR20
REL_VOLUME >= 1.5
ClosePositionInBar >= 0.7
```

などから開始します。

ここでの出来高1.5倍は一般的なブレイク検出用の仮値です。Dr.K氏が言及した10倍は、別途、

```text
monster_volume_flag = REL_VOLUME >= 10
```

として、最高ランクの特殊フラグにするのがよいです。

## 4-4. 飛びつき判定

```text
extension_pct =
    (CurrentPrice - ActivePivotPrice)
    / ActivePivotPrice
```

```text
extension_pct > 5%
AND 新しいセットアップが未形成
→ EXTENDED
```

重要なのは、N字やU字を形成したら、`ActivePivotPrice`を新しい小型ベースの上限に更新することです。

## 4-5. ブレイク後の押し目

```text
previous_breakout = true
trend_structure   = higher_high AND higher_low
pullback_depth    = 3～12%
pullback_atr      = 1～3 ATR
pullback_volume   < breakout_volume
CloseがMA5・MA10・MA25のいずれかに接近
```

良い押し目ほど、

- 下落時の出来高が減る
- 陰線の実体が小さくなる
- MA付近で下ヒゲまたは陽線が出る
- 元のピボットを割らない
- セクターの相対強度が落ちていない

という特徴を持つと仮定します。

## 4-6. N字判定

ZigZagで以下の4点を取ります。

```text
L0 → H1 → L1 → H2
```

条件例：

```text
H2 ≈ H1
L1 > L0
L1 > 元のブレイクピボット
H1からL1までの下落が1～3 ATR
H2突破でトリガー
```

```text
abs(H2 - H1) <= 0.5 ATR
```

なら、前回高値と同一の抵抗帯を試していると判定できます。

## 4-7. U字判定

N字より滑らかで長い調整です。

```text
前半：傾きがマイナス
中央：傾きがほぼゼロ
後半：傾きがプラス
右側安値 >= 左側安値
出来高は底付近で減少
```

実装候補は、

- 移動平均した価格への二次曲線回帰
- 局所傾きの符号変化
- Dynamic Time Warping
- Matrix Profileによる類似形状検索

です。

チャートパターンの自動認識自体は新しい考え方ではなく、Lo、Mamaysky、Wangはカーネル回帰を使ってチャート形状を体系的に認識する方法を提示しています。変化点検出にはPELT、過去の類似パターン探索にはMatrix Profileのような時系列手法が利用できます。([papers.ssrn.com](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=228099))

## 4-8. 高値での売り圧吸収

```text
Close >= H1 - 0.5 ATR の日数 >= 3
高値圏滞在日数            <= 15
ATR5 < ATR20
安値が切り下がっていない
大陰線がない
出来高が徐々に減少
```

この状態を、

```text
ABSORPTION
```

とします。

その後、

```text
Close > H1
AND REL_VOLUME上昇
```

で`NU_READY → BREAKOUT_TRIGGERED`へ遷移させます。

---

# 5. 地合い・セクター・リーダー株の定量化

この部分を省くと、形だけきれいな「失敗ブレイク」を大量に拾う可能性があります。

## 市場スコア

```text
market_score =
    指数がMA20・MA50より上
  + 指数MA20・MA50の傾き
  + 上昇銘柄数 / 下落銘柄数
  + 新高値銘柄数 / 新安値銘柄数
  + ブレイク成功率の直近推移
```

特に有効そうなのが、**システム自身が検出した直近のブレイク成功率**です。

```text
breakout_success_rate_20d =
    過去20日間のブレイクで
    +2Rへ先に到達した割合
```

これが急低下していれば、機械的に`RISK_OFF`へ寄せられます。

## セクタースコア

```text
sector_score =
    セクター20日相対リターン
  + セクター内MA20上銘柄比率
  + セクター内新高値銘柄比率
  + 上位3銘柄の平均RS
  + 出来高流入
```

## リーダー株スコア

```text
leader_score =
    セクター内RS順位
  + 52週高値までの距離
  + MA5・MA10上の滞在率
  + 上昇日の出来高
  + 決算後の値動き
  - 大陰線
  - 高値からの急落
```

リーダー株がまとめて崩れた場合は、

```text
sector_leader_breakdown_ratio >= 50%
→ sector_risk_off = true
```

のようなゲートを設けます。

---

# 6. 最終スコア

状態判定後に、同じ状態の銘柄同士をランキングします。

```text
ChartSetupScore = 100点
```

| 項目 | 配点 |
|---|---:|
| 地合い | 15 |
| セクター強度 | 15 |
| リーダー度 | 10 |
| トレンド品質 | 15 |
| ベース・押し目の締まり | 20 |
| ブレイクトリガー | 15 |
| 損切り位置・リスクリワード | 10 |

### ハード除外条件

点数が高くても、以下なら原則見送ります。

```text
元のピボットから5%以上離れ、新しいベースがない
損切り価格を決定できない
流動性不足
元のブレイクピボットを明確に割った
市場・セクター・リーダーが同時に崩れている
セットアップの値幅が拡大中
期待リスクリワードが2未満
```

本人は通常1対3程度のリスクリワードを狙うことが多いと述べています。([x.com](https://x.com/Drdebuneko/status/1994630731906392167))
