# Night Batch Self Hosted Run 69

- workflow: `Night Batch Self Hosted`
- run_number: `69`
- run_id: `24961208004`
- status: `success`
- campaign: `tp1-micro-sweep-panic-reversal-us40-11pack`
- artifact_root: `artifacts/campaigns/tp1-micro-sweep-panic-reversal-us40-11pack/`
- detailed_report: `../reports/archive/night-batch-self-hosted-run69.md`

## 結果

- smoke: `11 / 11` success
- full: `440 / 440` success
- failure: `0`
- unreadable: `0`

## performance ranking

この run の戦略別ランキングは `artifacts/campaigns/tp1-micro-sweep-panic-reversal-us40-11pack/full/strategy-ranking.json` を正本とし、current では `artifacts-backtest-scoreboards.md` に集約します。

上位 3 戦略（avg_net_profit 順）:

| rank | strategy | avg_net_profit | avg_profit_factor | avg_max_drawdown |
| ---: | --- | ---: | ---: | ---: |
| 1 | `donchian-60-20-rsp-rsi14-regime60-tp25-27-tp100-50` | 12505.46 | 1.474 | 4726.33 |
| 2 | `donchian-60-20-rsp-rsi14-regime60-tp25-31-tp100-50` | 12452.76 | 1.488 | 4618.70 |
| 3 | `donchian-60-20-rsp-rsi14-regime60-tp25-33-tp100-50` | 12426.41 | 1.479 | 4670.98 |

特殊戦略（panic reversal）は 11 位：

| rank | strategy | avg_net_profit | avg_profit_factor | avg_max_drawdown |
| ---: | --- | ---: | ---: | ---: |
| 11 | `rsp-vix-spy-panic-reversal-rsi2-confirm-sma25-rsi65-exit-no-stop` | 1807.64 | 5.263 | 1773.57 |

## メモ

### TP1 Ratio Sweep の結果
- run68 で `tp25-30` / `tp25-33` の 2 anchor から微細探索を開始した。
- 新規に追加した `tp25-27` から `tp25-36` の 9 戦略は、**TP1 発動位置 25% 固定**のまま、**TP1 比率だけを 1% 刻み**で変動させた。
- 結果として、**最高の avg_net_profit は `tp25-27` で 12505.46** となり、run68 首位の `tp25-33` 12426.41 を約 79 超えた。

### TP1 Ratio の最適値は 25~27% の間か
- avg_net_profit で見ると、`tp25-27` > `tp25-31` > `tp25-33` の順で、下降傾向。
- avg_profit_factor では `tp25-31` が 1.488 で最高。
- avg_max_drawdown は `tp25-32` が 4574.34 で最も抑制されている。
- つまり、単一指標では判定できず、**profit factor と drawdown のバランスが `tp25-31` で最適**である一方、**pure profit 最大は `tp25-27`** という特性。

### Panic Reversal 戦略の役割
- 特殊戦略 `rsp-vix-spy-panic-reversal-rsi2-confirm-sma25-rsi65-exit-no-stop` は avg_net_profit 1807.64 / avg_profit_factor 5.263。
- breakout 系（avg_net_profit 12000+ レンジ）と比べて profit は 6.8 分の 1 だが、**profit factor 5.263 は breakout 系の約 3.6 倍**。
- **リスク調整では優れている**が、absolute profit では 10 位の breakout 戦略に劣る。
- panic 局面限定での使用を想定した設計であり、通常時の breakout と組み合わせることで相互補完を狙ったもの。

### TP1 Ratio 探索の飽和感
- 27% から 36% の 10 倍率レンジを 1% 刻みで探索した結果、U 字カーブではなく、**単調減少の傾向**が見られた。
- ただし 27% < 31% < 32% の逆転があり、strict な monotonicity はない。
- これは **銘柄別の分散が大きい**ことを示唆（TSLA 等大型 winner への依存）。

## 結論

### Run68 → Run69 の改善
- run68 首位 `tp25-33-tp100-50` は avg_net_profit 12426.41。
- run69 首位 `tp25-27-tp100-50` は avg_net_profit 12505.46 で、**約 79 の上乗せ**（0.6% 向上）。
- PF は `tp25-27` の 1.474 < `tp25-33` の 1.479 だが、drawdown はほぼ同等（4726.33 vs 4670.98）。

### 現時点の最有力戦略
- 単純 avg_net_profit 最大主義なら **`tp25-27` が推奨**。
- Profit factor と drawdown のバランスを取るなら **`tp25-31` が推奨**（PF 1.488, DD 4618.70）。
- 汎用的な堅牢性を求めるなら **`tp25-30` または `tp25-33` の既成 preset を据え置き**。

### TP1 Ratio 微細化の限界と次のステップ
- 27% から 36% の 1% 刻み探索を終えた。次のステップは 2 つ：
  1. **局所最適化の終了**: TP1 ratio は 27~31% に収束した可能性が高い。これ以上の細分化は diminishing returns。
  2. **別軸の探索**: TP1 発動位置（現在 25% 固定）、TP2 比率、stop loss size など、他の parameter の再検討。

### Panic Reversal 戦略の位置づけ
- avg_net_profit では競争力がないが、**独立したリスク特性**を持つ。
- 通常 breakout 系と組み合わせた portfolio 的なアプローチなら価値あり。
- ただし **単独での推奨は難しい**。market stress 期や特定条件下での validation が必須。

## 比較の読み方

### Run68 と Run69 のフェーズ差
- Run68: `strongest-vs-profit-protect-tp1-focus-us40-10pack` → TP1 ratio calibration anchor 確立（10 戦略）
- Run69: `tp1-micro-sweep-panic-reversal-us40-11pack` → TP1 ratio micro sweep 実行（11 戦略 = 10 sweep + 1 特殊）

### 探索戦略の転換
- Run68 では「TP1 ratio をどこに設定するのが best か」という開放的探索。
- Run69 では「最有力の近傍を 1% 刻みで埋める」という局所最適化。
- **収束傾向**: 27~31% レンジに集約。

### Deterministic Ranking vs Profit Maximization
- Run68 conclusion: "Profit factor 優先 ranking では `tp25-33` が首位"
- Run69 結果: avg_net_profit では `tp25-27` が首位だが、PF では `tp25-31` が首位。
- **単一 metric では不十分**。portfolio としての KPI 設計が必要。

## 今後の改善方向

### 優先度 1: TP1 発動位置の再検討
- 現在 25% 固定で TP1 ratio だけを sweep してきた。
- 次は「TP1 発動位置を 23%, 25%, 27% で固定、TP1 ratio を 28~33% で sweep」という 2D grid を試すのが自然。
- ただし backtest 計算量は 3x6=18 倍になるため、現実的には絞る。

### 優先度 2: Stop Loss Size の微調整
- Current: 8% hard stop 固定。
- Run68/69 では drawdown が 4600~4700 レンジで安定。
- stop の有効性を確認するなら、6%, 7%, 8%, 9%, 10% の 5 倍率を試す価値あり。

### 優先度 3: TP2 比率の再訪
- Current: TP2 100% / 50% fixed。
- TP2 を early に逃がす方針（e.g., 60% / 80%）も candidate。
- ただし現行 runbook では TP1 ratio sweep 優先なので、次々次 phase 以降。

### 優先度 4: Panic Reversal の refinement
- 当面は **通常 breakout 系との直接比較は避け**、独立した research として扱う。
- Fear & Greed index 等の外部 sentiment data を取り込めるようになれば、valid な conditional entry として再検討可能。

## 次に残す候補

### 継続比較候補（Donchian 60-20 RSP RSI14 regime60 ベース）
- 局所最適レンジ: `tp25-27`, `tp25-29`, `tp25-31`, `tp25-33`, `tp25-35`
- Anchor との比較: `tp25-30`（run68 既存）

### 下位候補（deprioritize）
- `tp25-28`, `tp25-29`, `tp25-34`, `tp25-36` は中間値なので、次の精密化で再検討。
- `tp25-22`, `tp25-20` は run68 時点で下位のため、今回新規追加なし。

### 特殊戦略
- `rsp-vix-spy-panic-reversal-rsi2-confirm-sma25-rsi65-exit-no-stop` は **research-only** として保持。
- portfolio 検証が可能になるまで、単独推奨は留保。

## TP1 Ratio 局所最適化の終了メモ

### 実施内容
- Phase 1 (run67): `tp25-25`, `tp25-30`, `tp25-33` の 3-point comparison → `tp25-33` 最有力確立
- Phase 2 (run68): 上記 3 に加えて `tp25-20`, `tp25-27`, `tp27-25`, `tp22-25` の 4 新規 → TP1 発動位置 25% 確認
- Phase 3 (run69): `tp25-27` から `tp25-36` の 1% 刻み sweep → 収束 region 確認

### 判定基準の推移
- run67: avg_net_profit + profit factor の 2D view
- run68: profit factor 優先（「PF・drawdown の改善が best」という解釈）
- run69: avg_net_profit 単独の最大化（「27% が pure profit 最大」）

### 次の phase への提案
1. **Short term (1-2 weeks)**: TP1 ratio の局所最適化を終了。`tp25-27` または `tp25-31` を新 anchor として固定。
2. **Medium term (2-4 weeks)**: TP1 発動位置を 23%, 25%, 27% の 3 段階で re-grid。ただし計算量削減のため preset は 8-10 本に絞る。
3. **Long term (1 month+)**: Stop loss size、TP2 ratio、Entry filter (regime 以外の新基準) などの独立軸を並行探索。

## 実装反映メモ

- TP1 micro sweep campaign として `tp1-micro-sweep-panic-reversal-us40-11pack` を live preset 群として登録。
- 特殊戦略 `rsp-vix-spy-panic-reversal-rsi2-confirm-sma25-rsi65-exit-no-stop` を 1 本追加。
- foreground night batch の `us_campaign` は変更なし（run68 の `tp1-micro-sweep-panic-reversal-us40-11pack` を継続）。
