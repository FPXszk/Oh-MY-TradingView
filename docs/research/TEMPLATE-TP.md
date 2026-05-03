# Take Profit 戦略専用まとめテンプレート
<!--
このテンプレートは take profit の戦略専用のまとめテンプレートです。
一般的な backtest 全体サマリには使わず、TP1 / partial exit / full exit の比較を主目的とする run に限定して使うこと。

【このテンプレートの使い方 — AI / 担当者への指示】

入力ファイル（原則読むこと）:
  - 戦略別集計:
    artifacts/campaigns/{campaign_name}/full/strategy-ranking.json
  - 銘柄別生データ:
    artifacts/campaigns/{campaign_name}/full/recovered-results.json

入力ファイル（あれば読むこと）:
  - 注文/取引イベントを含む raw artifact
  - TP1 hit 判定や partial exit 判定が取れる補助 JSON / log

目的:
  - 「どこで何%利確するのが最適か」を、再現性のある数値比較で証明する
  - 「勝率が高い」ではなく「TP1 が早売りコストより守り効果を持つか」を判定する

記入手順:
  1. ヘッダーを埋める
  2. baseline を固定する（原則 `q0` = 初回部分利確なし）
  3. 全体ランキングを貼る
  4. `tp1Pct x tp1Qty` のヒートマップを埋める
  5. baseline 差分表を埋める
  6. Top候補 / 除外候補 / 採用判断を書く
  7. 次回確認事項を、今回の数値から導いた検証タスクへ書き換える

注意:
  - `例:` やダミー値は必ず今回の値に置き換えること
  - 定性コメントだけで埋めないこと。必ず数値を併記すること
  - 指標が算出できない場合は、`算出不可` と書いたうえで不足 artifact を明記すること
-->

---

## ヘッダー

- run_id: `YYYYMMDD_HHMMSS`
- status: `SUCCESS / FAILED`
- campaign: `campaign-id`
- artifact_root: `artifacts/campaigns/{campaign_name}/`
- 対象市場: `US / JP / US+JP`
- baseline presetId: `例: emr-ae-v13-tp0-q0-notrail`
- 目的: `例: tp1Pct と tp1Qty の組み合わせが、focus-8 で winner upside をどこまで維持できるかを比較する`

---

## このテンプレートで固定して見るもの

- 全体ランキング
- `tp1Pct x tp1Qty` のヒートマップ
- baseline `q0` との差分表
- `TP1 が本当に保険として機能したか` を示す補助指標

このテンプレートでの採用判断は、原則として以下の問いに答えること:

1. `TP1 はどの程度の頻度で実際に使われたか`
2. `TP1 のせいで勝ちを削りすぎていないか`
3. `TP1 が反転損失をどれだけ防いだか`
4. `早売りコスト` より `防げた損失` が大きいか

---

## 指標定義（固定）

<!--
このセクションの定義文は固定。意味を勝手に変えないこと。
数式の分母が不足すると再現性が崩れるため、値だけでなく分母も必要に応じて併記すること。
-->

| 指標 | 定義 | 主な用途 |
|---|---|---|
| `avg_trade_pnl` | `net_profit / closed_trades` | 1トレードあたり期待値 |
| `avg_win_pnl` | 勝ちトレードのみの平均利益 | 勝ちの伸びをどれだけ削ったか |
| `avg_loss_pnl` | 負けトレードのみの平均損失の絶対値 | TP1 が損失をどれだけ軽減したか |
| `tp1_hit_rate` | `TP1が1回でも約定したトレード数 / 全closed trades` | TP1 の実使用率 |
| `tp1_fail_rate` | `TP1約定後に最終損益が0以下になったトレード数 / TP1約定トレード数` | TP1 後の失速率 |
| `early_take_cost` | TP1 後も伸びたトレードで、先に売ったぶん取り逃した利益総額 | 早売りコスト |
| `loss_saved_by_partial` | TP1 後に反転したトレードで、先に売ったぶん守れた損失総額 | 守り効果 |
| `net_tp1_edge` | `loss_saved_by_partial - early_take_cost` | TP1 の正味価値 |
| `delta_avg_trade_pnl` | `対象戦略 avg_trade_pnl - baseline avg_trade_pnl` | baseline 比期待値差 |
| `delta_avg_win_pnl` | `対象戦略 avg_win_pnl - baseline avg_win_pnl` | 勝ちの削れ量 |
| `delta_avg_loss_pnl` | `対象戦略 avg_loss_pnl - baseline avg_loss_pnl` | 負けの改善量 |
| `delta_pf` | `対象戦略 avg_profit_factor - baseline avg_profit_factor` | 効率差 |
| `delta_dd` | `対象戦略 avg_max_drawdown - baseline avg_max_drawdown` | リスク差 |

---

## 結論

- **総合首位**: `presetId` / composite_score `x` / avg_net_profit `x` / avg_profit_factor `x`
- **TP採用候補**: `presetId` / `tp1Pct=x` / `tp1Qty=x`
- **baseline比の判断**: `例: avg_trade_pnl は改善、avg_win_pnl の削れは小さく、net_tp1_edge がプラスのため採用候補`
- **ざっくり判断**: `例: 今回は tp1Pct 10〜15、tp1Qty 5〜15 の帯で only positive edge が確認できた。q25 以上は早売りコストが守り効果を上回る。`

---

## 全体ランキング

<!--
【AIへの指示】
  - `strategy-ranking.json` を正本にして表を作る
  - take profit 比較では rank だけでなく tp1Pct / tp1Qty を列に分解して見せること
  - `q0` baseline 行が分かるように明示すること
-->

| rank | presetId | tp1Pct | tp1Qty | composite_score | avg_net_profit | avg_profit_factor | avg_max_drawdown | avg_win_rate | markets |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `preset-id` | 0 | 0 | 0 | 0.00 | 0.000 | 0.00 | 0.00 | `US` |

---

## TP1 ヒートマップ

<!--
【AIへの指示】
  - 行を `tp1Pct`、列を `tp1Qty` に固定する
  - セルには最低でも `avg_trade_pnl` か `avg_net_profit` を入れる
  - 可能なら `net_tp1_edge` を括弧書きで併記する
  - baseline `q0` 列は `tp1Qty=0` として残す
  - 値が同率の帯はコメントでまとめてよいが、表自体は埋める
-->

`セル表記ルール: avg_trade_pnl / net_tp1_edge`

| tp1Pct \ tp1Qty | 0 | 5 | 10 | 15 | 20 | 25 | 33 | 50 | 100 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 8  | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` |
| 10 | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` |
| 12 | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` |
| 15 | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` |
| 18 | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` |
| 25 | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` | `0 / 0` |

**ヒートマップの読み方**

- `例: tp1Qty が増えるにつれ avg_trade_pnl が階段状に悪化するなら、早売りコスト優勢`
- `例: 同一 tp1Pct で net_tp1_edge がプラスの帯だけを候補とする`
- `例: 同一 qty で tp1Pct 差がほぼないなら、ライン差は非支配と判断する`

---

## baseline `q0` 差分表

<!--
【AIへの指示】
  - baseline は原則 `tp1Qty=0` の戦略に固定する
  - 以下の6指標は最低必須。欠けたら未完成
  - 可能なら `tp1_hit_rate`, `tp1_fail_rate`, `early_take_cost`, `loss_saved_by_partial` も追加する
  - 差分は `対象 - baseline`
  - `delta_avg_loss_pnl` は「負け損失の絶対値」の差であることを明記する
-->

| presetId | tp1Pct | tp1Qty | delta_avg_trade_pnl | delta_avg_win_pnl | delta_avg_loss_pnl | delta_pf | delta_dd | net_tp1_edge | 判定 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `preset-id` | 0 | 0 | 0.00 | 0.00 | 0.00 | 0.000 | 0.00 | 0.00 | `baseline` |

**差分表の最低限の読み方**

- `delta_avg_trade_pnl > 0` なら期待値改善
- `delta_avg_win_pnl < 0` が大きすぎるなら勝ちの削りすぎ
- `delta_avg_loss_pnl < 0` なら負け損失が改善
- `net_tp1_edge > 0` なら TP1 は正味プラス
- `delta_dd < 0` なら drawdown 改善

---

## TP1 保険効果の補助指標

<!--
【AIへの指示】
  - raw trade / order artifact から算出できる場合は必ず埋める
  - 算出できない場合は `算出不可` と書き、理由を明記する
-->

| presetId | tp1_hit_rate | tp1_fail_rate | early_take_cost | loss_saved_by_partial | net_tp1_edge | コメント |
|---|---:|---:|---:|---:|---:|---|
| `preset-id` | 0.00% | 0.00% | 0.00 | 0.00 | 0.00 | `例: TP1使用率は高いが守り効果より早売りコストが大きい` |

---

## Top 候補

<!--
【AIへの指示】
  - ここでの「強い」は rank だけでなく、baseline 比と edge を含めて評価する
  - 各候補について「なぜ残すか」を数値で書く
-->

### 1位候補: `presetId`

- `tp1Pct`: `x`
- `tp1Qty`: `x`
- `avg_trade_pnl`: `x`
- `net_tp1_edge`: `x`
- `採用理由`: `例: baseline 比で avg_trade_pnl +24.18、delta_dd -51.33、net_tp1_edge +312.40`

### 2位候補: `presetId`

- `tp1Pct`: `x`
- `tp1Qty`: `x`
- `avg_trade_pnl`: `x`
- `net_tp1_edge`: `x`
- `採用理由`: `例: avg_trade_pnl は僅差で劣るが tp1_fail_rate が最小`

---

## 除外候補

<!--
【AIへの指示】
  - 「利益が低い」だけでなく、なぜ TP1 として悪いかを書く
  - 典型例: `early_take_cost > loss_saved_by_partial`, `delta_avg_win_pnl の悪化が大きい`, `tp1_hit_rate が低すぎる`
-->

| presetId | tp1Pct | tp1Qty | 除外理由 | 根拠数値 |
|---|---:|---:|---|---|
| `preset-id` | 25 | 50 | `例: 早売りコスト過大` | `net_tp1_edge -422.70 / delta_avg_trade_pnl -19.42` |

---

## 採用判断

<!--
【AIへの指示】
  このセクションでは最終的に 1 本を選ぶ。
  「どのラインが最適か」「どの量が最適か」を分けて書くこと。
-->

- **最適ライン**: `例: tp1Pct 10〜15`
- **最適量**: `例: tp1Qty 5〜10`
- **採用戦略**: `presetId`
- **採用理由**: `例: avg_trade_pnl を維持しながら、勝ちの削れが限定的で、net_tp1_edge が最も大きい`
- **非採用理由（他候補との差）**: `例: q20 以上は守り改善より early_take_cost の増加が大きい`

---

## 改善点と次回バックテスト確認事項

1. **ライン差が非支配かを確認する**
   `例: q5 系で tp10 / tp12 / tp15 が同水準なら、次回は tp10 と tp15 のみ残してライン軸を圧縮する。完了条件は avg_trade_pnl と net_tp1_edge の差が誤差範囲と判断できること。`

2. **量の最適帯を再確認する**
   `例: q5 / q10 / q15 の差が階段状なら、次回は q0 / q5 / q8 / q10 / q12 / q15 の狭い帯だけで再比較し、最適量を詰める。`

3. **TP1 保険効果の算出元を固定する**
   `例: 今回は tp1_hit_rate と net_tp1_edge が算出不可なら、次回は ordersData / tradesData を保存する run に切り替え、同じテンプレートを完全記入できる状態にする。`

4. **trail 要因を分離する**
   `例: TP1 の最適帯が決まったら、その上位3本だけで trail on/off を比較し、TP1 自体の優位と trail の優位を混同しないようにする。`

5. **次回比較の固定指標**
   `次回 run との比較は avg_trade_pnl / avg_win_pnl / avg_loss_pnl / avg_profit_factor / avg_max_drawdown / net_tp1_edge を固定し、avg_win_rate は補助指標に留める。`
