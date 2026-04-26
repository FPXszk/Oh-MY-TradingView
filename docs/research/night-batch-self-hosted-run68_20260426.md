# Night Batch Self Hosted Run 68

- workflow: `Night Batch Self Hosted`
- run_number: `68`
- run_id: `24953124968`
- status: `success`
- campaign: `strongest-vs-profit-protect-tp1-focus-us40-10pack`
- artifact_root: `artifacts/campaigns/strongest-vs-profit-protect-tp1-focus-us40-10pack/`
- detailed_report: `../reports/archive/night-batch-self-hosted-run68.md`

## 結果

- smoke: `10 / 10` success
- full: `400 / 400` success
- failure: `0`
- unreadable: `0`

## performance ranking

この run の戦略別ランキングは `artifacts/campaigns/strongest-vs-profit-protect-tp1-focus-us40-10pack/full/strategy-ranking.json` を正本とし、current では `artifacts-backtest-scoreboards.md` に集約します。

上位 3 戦略:

| rank | strategy | avg_net_profit | avg_profit_factor | avg_max_drawdown |
| ---: | --- | ---: | ---: | ---: |
| 1 | `donchian-60-20-rsp-rsi14-regime60-tp25-33-tp100-50` | 12426.41 | 1.479 | 4670.98 |
| 2 | `donchian-60-20-rsp-rsi14-regime60-tp25-30-tp100-50` | 11908.82 | 1.474 | 4589.19 |
| 3 | `donchian-60-20-rsp-rsi14-regime60-tp25-20-tp100-50` | 12109.02 | 1.471 | 4590.81 |

## メモ

- strongest 非TP基準 `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` は direct comparison で 7 位でした。
- 1 位 `tp25-33-tp100-50` は strongest 非TP基準より avg net profit で `637.07` 低い一方、profit factor・drawdown・win rate は明確に良化しました。
- 今回の示唆は「TP1 を 25% 付近で早く発動する方針は維持しつつ、TP1 比率は 25% よりやや厚めがよい」です。

## 結論

- workflow / artifact ともに `success` で、`strongest-vs-profit-protect-tp1-focus-us40-10pack` は `smoke 10 / 10`、`full 400 / 400` を `0 failure` で完走しました。
- 現時点の最有力は `tp25-33-tp100-50` です。run67 首位 `tp25-25-tp100-50` より net profit は少し落ちる一方、PF と drawdown は改善しました。
- strongest 非TP基準は avg net profit 単独では依然最大ですが、今回の ranking では 7 位まで下がり、TP1 ratio 調整群に押し下げられました。

## 比較の読み方

- 今回の順位は `avg profit factor` を最優先に、次に `avg net profit`、最後に `avg max drawdown` を見た deterministic ranking として読むのが妥当です。
- その前提では `tp25-33-tp100-50` が首位ですが、avg net profit だけを見ると strongest 非TP基準が `13063.48` で最大、首位案は `12426.41` でした。
- つまり今回の結論は「TP1 発動位置の探索より、TP1 比率の精密化の方が効く」です。

## 今後の改善方向

- 最優先は TP1 比率の micro sweep です。`tp25-33-tp100-50` を軸に、TP1 比率を `28` / `30` / `33` / `35` 近辺で細かく刻む価値があります。
- 次点は top contender の再戦です。strongest 非TP基準、`tp25-25`、`tp25-30`、`tp25-33`、`tp30-33` に絞ると差分を見やすいです。
- `tp22-25` と `tp27-25` が下位だったため、TP1 発動位置を 25% から前後にずらす優先度は下げてよさそうです。
- TSLA の大型 winner 依存は依然強いので、PF 改善が mega-winner 依存でないかを別集計で確認する余地があります。

## 次に残す候補

- 継続比較候補: `tp25-33-tp100-50`、`tp25-30-tp100-50`、`tp25-25-tp100-50`、`tp25-20-tp100-50`、strongest 非TP基準
- 優先度を下げる候補: `tp27-25-tp100-50`、`tp22-25-tp100-50`

## TP1 ratio micro sweep 10 戦略案

- 次の 10 本は **TP1 発動位置を 25% のまま固定**し、**TP1 比率だけを 1 ポイント刻み**で確認する案です。
- `tp25-30` と `tp25-33` は run68 の calibration anchor として残し、その間と両肩を埋める構成にします。
- `TP2 100% / 50%`、`RSP + RSI14 regime60`、`8% hard stop` は据え置き前提です。

| slot | strategy | ねらい |
| ---: | --- | --- |
| 1 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50` | 25 側の肩。`tp25-25` より少し厚く、`tp25-30` 未満の下限確認。 |
| 2 | `donchian-60-20-rsp-rsi14-regime60-tp25-28-tp100-50` | run68 メモで最初に挙がった 28 帯の確認。 |
| 3 | `donchian-60-20-rsp-rsi14-regime60-tp25-29-tp100-50` | 28 と 30 の間を埋め、改善の滑らかさを確認。 |
| 4 | `donchian-60-20-rsp-rsi14-regime60-tp25-30-tp100-50` | 既存上位 anchor。 |
| 5 | `donchian-60-20-rsp-rsi14-regime60-tp25-31-tp100-50` | 30→33 の立ち上がり確認。 |
| 6 | `donchian-60-20-rsp-rsi14-regime60-tp25-32-tp100-50` | 首位 33 の一歩手前。 |
| 7 | `donchian-60-20-rsp-rsi14-regime60-tp25-33-tp100-50` | 現行首位 anchor。 |
| 8 | `donchian-60-20-rsp-rsi14-regime60-tp25-34-tp100-50` | 33 超えで PF / DD がさらに改善するか確認。 |
| 9 | `donchian-60-20-rsp-rsi14-regime60-tp25-35-tp100-50` | run68 メモで優先候補に入っている上側 anchor。 |
| 10 | `donchian-60-20-rsp-rsi14-regime60-tp25-36-tp100-50` | 35 の少し上で飽和・悪化が始まるかの境界確認。 |

### 読み筋

- 10 本を全部新規にするより、`tp25-30` と `tp25-33` を残して **局所カーブの形**を読みやすくする方がよいです。
- もし次 run でも strongest 非TP基準を同梱したいなら、この 10 本案からは `tp25-27` と `tp25-36` を外すのが自然です。
- 現時点では `25 -> 30 -> 33` が改善ラインなので、**本命レンジは 28〜35、肩確認は 27 / 36** と見るのが妥当です。
- 実装では、この 10 本を live preset 群として登録し、比較 campaign は `tp1-micro-sweep-panic-reversal-us40-11pack` にまとめました。
- 比較 campaign には、上記 10 本に加えて特殊戦略 `rsp-vix-spy-panic-reversal-rsi2-confirm-sma25-rsi65-exit-no-stop` を 1 本追加しています。

## 特殊エントリー案の実現性メモ

### 結論

- **簡略版なら実現可能**です。TradingView / Pine で直接参照できる指標だけに絞れば、raw_source 戦略として試作できます。
- **原案そのままの完全版は現状では困難**です。`Fear & Greed`、`AAII Bull-Bear`、`NAAIM Exposure`、`S&P500 予想PER` の履歴 series が現行 backtest 系に載っていません。

### 今すぐ raw_source Pine で組める部分

- `RSP < 200日SMA` の regime 判定
- `VIX > 30`
- `S&P500 RSI < 30`（実装上は `SPY` を proxy にするのが自然）
- `S&P500 < 200日SMA`（これも `SPY` proxy が現実的）
- 特殊エントリー後を **ストップロス無し**で持ち、`25日移動平均線上抜け && RSI >= 65` で手仕舞う exit

### 追加実装が必要な部分

- 現行 generator は `rsp_above_sma200` のような **単純 regime gate** 前提で、`RSP が 200MA を下回るときだけ別ルールで逆張り entry` する分岐を持っていません。
- 既存の共通生成ロジックは `allowEntry` と単一 `Long` ポジション、単一 stop 管理が基本なので、**通常 breakout と特殊逆張り entry を同居**させるなら raw_source 側で個別設計が必要です。
- `底打ちしたと思われるタイミング` は主観的なので、実装前に **明確な turn 条件**へ落とす必要があります。候補は `SPY RSI(2) の下からの反転`、`RSP の短期 MA 回復`、`panic 条件のうち n 個以上充足` などです。

### 現状では不足しているデータ

- `Fear & Greed index`
- `AAII Bull - Bear`
- `NAAIM Exposure < 直近四半期平均`
- `S&P500 予想PER < 20`

上記は現行の `research-backtest.js` / preset generator から直接参照していません。`market-intel.js` には Yahoo Finance 経由の **現在値** fundamentals 取得はあるものの、backtest に必要な **日次履歴 series** としては未整備です。

### 実現するとしたらの現実的な順序

1. **第1段階（実現可能）**: `RSP < 200SMA`, `VIX > 30`, `SPY RSI < 30`, `SPY < 200SMA` を panic filter にした raw_source 戦略を 1 本作る。
2. **第1段階の exit**: 特殊 entry 分は stop を置かず、`close > SMA25 && RSI14 >= 65` で手仕舞う。
3. **第2段階（追加データ導入後）**: `Fear & Greed`, `AAII`, `NAAIM`, `forward PE` を外部 series として取り込める形にしてから fully specified 版を再検討する。

### 判断

- **research-only の簡略版試作**: 実現性あり
- **今の repo 機能だけで原案を完全再現**: 実現性は低い
- 次に進めるなら、まずは **TradingView だけで閉じる panic/reversal 版** を 1 本切り出して、通常 breakout 系とは別 family として検証するのが安全です。

## 実装反映メモ

- 第1段階 panic filter (`RSP < 200SMA`, `VIX > 30`, `SPY RSI14 < 30`, `SPY < 200SMA`) と、第2段階の底打ち判定 (`SPY RSI2` が `10` を下から上抜け) を組み合わせた raw_source 戦略を追加した。
- 特殊戦略の exit は **stop loss なし**、`close > SMA25 && RSI14 >= 65` で手仕舞う実装とした。
- foreground night batch の既定 `us_campaign` は `tp1-micro-sweep-panic-reversal-us40-11pack` へ切り替えた。
