# Breakout Finder / Breakout Trend Follower と現行本命 breakout の違い

## 結論

今回入れた 2 本は、**見た目が強く見えやすい breakout 系の典型**です。  
ただし現行の本命 Donchian 群と比べると、どちらも **地合いフィルタと銘柄横断の頑健性より、チャート上の分かりやすさを優先した設計** です。

短く言うと:

- `Breakout Trend Follower`
  - 素直な「高値抜け買い + 直近安値 stop」
  - 一番分かりやすい trend following
- `Breakout Finder`
  - 「何度も試された resistance / support を抜けたか」を形で見る
  - 視覚的には派手だが、戦略としては exit 設計の自由度が大きい
- 現行本命 Donchian 群
  - breakout 自体は似ていても、`RSP>SMA200` や `RSI regime` を併用して **入る局面をかなり絞っている**
  - そのぶん地味に見えても、安定性を優先した設計

---

## それぞれ何者か

### `Breakout Trend Follower`

今回 strategy 化した版:

- file: `config/backtest/public-library-sources/breakout-trend-follower-strategy.pine`
- preset id: `breakout-trend-follower`

中身はかなり素直です。

- 直近 swing high を上抜けたら entry
- 直近 swing low を stop に使う
- 任意で MA filter をかける

つまり、**古典的な swing breakout trend following** です。  
見た目が強そうに見える理由は、チャート上で

- entry 理由が明確
- stop 理由も明確
- 上昇トレンドでは連続してきれいに見える

からです。

一方で弱点も明確です。

- regime filter が MA 1 本だけなので、現行本命より entry 条件が緩い
- broad market の悪化や breadth 崩れをあまり見ていない
- 横ばい局面では breakout だましを拾いやすい

### `Breakout Finder`

今回 strategy 化した版:

- file: `config/backtest/public-library-sources/breakout-finder-strategy.pine`
- preset id: `breakout-finder`

元スクリプトは **売買戦略というより breakout 検出器** です。

- pivot high / pivot low を貯める
- 似た価格帯のテスト回数を見る
- その帯を上抜けたら breakout、下抜けたら breakdown と判定する

つまり、**水平 resistance / support の反復テストを使う pattern breakout** です。

見た目が強そうに見える理由は、

- 何度も止められたラインを抜くので説得力が強い
- ラインが可視化されるので「ここを抜けた」が直感的
- 典型的な box breakout を捉えやすい

からです。

ただし、そのままでは「検出」はできても「どう利確するか」が薄いです。  
なので今回の strategy 化では、**support band と hard stop を最低限の exit に使う** 実装にしています。

---

## 現行本命との違い

比較対象の現行本命は、たとえば次です。

1. `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
2. `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow`
3. `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early`

差は主に 4 つあります。

### 1. breakout の定義

- `Breakout Trend Follower`
  - 直近 swing high を抜いたら買う
- `Breakout Finder`
  - 何度も試された価格帯の上抜けを breakout とみなす
- 現行 Donchian
  - 一定期間最高値更新を mechanical に取る

つまり、

- `Trend Follower` は swing 構造
- `Finder` は pattern 構造
- `Donchian` は期間ベース構造

です。

### 2. 地合いフィルタ

- `Breakout Trend Follower`
  - 任意の MA filter だけ
- `Breakout Finder`
  - 今回の strategy 化では単純 MA filter を追加しただけ
- 現行 Donchian
  - `RSP>SMA200`
  - `RSI regime`
  - 一部は stop 幅や entry timing まで最適化済み

ここが一番大きい差です。  
現行本命は **「breakout が出た」だけでは入らず、その breakout をやっていい地合いかも見る** 設計です。

### 3. stop / exit の思想

- `Breakout Trend Follower`
  - 直近 swing low を trailing stop にする
- `Breakout Finder`
  - breakout 帯の下限と hard stop を使う
- 現行 Donchian
  - Donchian exit + hard stop + overlay 拡張余地

`Trend Follower` は stop が非常に自然で、人間にも理解しやすいです。  
一方で現行本命の方が、exit の再現性と batch 比較のしやすさは高いです。

### 4. repo での位置づけ

- 今回の 2 本
  - `retired-strategy-presets.json` 側に research candidate として追加
  - strongest 30 live には混ぜていない
- 現行本命
  - live preset 群に残っている strongest

つまり今回の 2 本は、**すぐ本命入りさせたわけではなく、比較対象として backtest に載せられるようにした段階** です。

---

## 実務的にどう見るか

いまの段階での見方はこうです。

1. `Breakout Trend Follower` は、今の strongest Donchian 群よりかなり素直で説明しやすい
2. `Breakout Finder` は、視覚的説得力は強いが、そのままだと strategy の自由度が高く評価がぶれやすい
3. 現行本命は派手さより再現性寄りで、batch 比較に向いた設計

なので、

- **見た目の強さ** を感じやすいのは `Breakout Finder` と `Breakout Trend Follower`
- **今の repo の本命思想に近い** のは `Breakout Trend Follower`
- **今の本命と一番違う** のは `Breakout Finder`

です。

---

## いま言えること

- `Breakout Trend Follower` は「分かりやすい breakout 戦略」としてかなり良い比較対象
- `Breakout Finder` は「見た目の breakout の説得力」を strategy 化して確かめる対象
- ただし、どちらが本当に強いかはまだ未検証で、**現時点では見た目が強いだけで strongest 更新候補とは言えない**
- まずはこの 2 本を既存 universe で回して、Donchian 本命群と execution / PF / DD を横比較するのが次の一手
