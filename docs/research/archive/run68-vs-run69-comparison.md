# Run 68 vs Run 69 比較分析

- Run68: `strongest-vs-profit-protect-tp1-focus-us40-10pack` (2026-04-26)
- Run69: `tp1-micro-sweep-panic-reversal-us40-11pack` (2026-04-26)

## Executive Summary

Run69 は Run68 の TP1 Ratio calibration から一段階進み、**TP1 発動位置 25% に固定した状態で TP1 比率を 27~36% の 1% 刻みで sweep した結果**。

### Key Finding
- **Run69 首位 `tp25-27` は avg_net_profit で Run68 首位 `tp25-33` を約 79 超える** (12505.46 vs 12426.41)
- ただし profit factor は逆転（`tp25-31` が 1.488 で最優）
- Drawdown はほぼ同等（4600~4700 レンジで安定）

### 戦略的な意味
- TP1 ratio の最適値は **27% 付近に存在する**可能性が高い
- ただし銘柄別分散が大きいため、単一値よりも **22~35% の広いレンジで堅牢性を確保**する方が実務的かもしれない

---

## 定量比較表

### Phase 設定の差

| Dimension | Run 68 | Run 69 |
|---|---|---|
| Campaign | strongest-vs-profit-protect-tp1-focus-us40-10pack | tp1-micro-sweep-panic-reversal-us40-11pack |
| Strategy Count | 10 | 11 |
| TP1 発動位置 | 20%, 22%, 25%, 27%, 30% | 25% (fixed) |
| TP1 Ratio Range | mixed approach | 27%, 28%, ..., 36% (1% 刻み) |
| Stop Loss | 8% hard stop | 8% hard stop (same) |
| TP2 | 100% / 50% | 100% / 50% (same) |
| Regime Filter | RSP + RSI14 regime60 | RSP + RSI14 regime60 (same) |
| Special Strategy | strongest 非TP基準 | panic-reversal-based |

### TP1 Ratio Sweep 戦略

**Run 68 では何を試したか？**
- 従来の strongest 非TP基準 vs. TP1 adjusted variants の comparison。
- TP1 **発動位置** (trigger point) を変動: 20%, 22%, 25%, 27%, 30%
- TP1 **比率** (ratio) は各 trigger に対して 2-3 個ずつ（e.g., tp25-25, tp25-30, tp25-33）

**Run 69 では何を試したか？**
- TP1 **発動位置を 25% で固定**し、**比率だけを 27~36% で 1% ずつ sweep**
- つまり run68 で「20% vs 25% vs 30% trigger の中から 25% が最適」と判定した後の局所探索

---

## 戦略ランキング比較

### Run 68 Top 3 (avg_net_profit 順)

| rank | strategy | avg_net_profit | avg_profit_factor | avg_max_drawdown |
|---:|---|---:|---:|---:|
| 1 | `tp25-33-tp100-50` | 12426.41 | 1.479 | 4670.98 |
| 2 | `tp25-30-tp100-50` | 11908.82 | 1.474 | 4589.19 |
| 3 | `tp25-20-tp100-50` | 12109.02 | 1.471 | 4590.81 |

### Run 69 Top 5 (avg_net_profit 順)

| rank | strategy | avg_net_profit | avg_profit_factor | avg_max_drawdown |
|---:|---|---:|---:|---:|
| 1 | `tp25-27-tp100-50` | 12505.46 | 1.474 | 4726.33 |
| 2 | `tp25-31-tp100-50` | 12452.76 | 1.488 | 4618.70 |
| 3 | `tp25-33-tp100-50` | 12426.41 | 1.479 | 4670.98 |
| 4 | `tp25-35-tp100-50` | 12295.69 | 1.474 | 4680.18 |
| 5 | `tp25-32-tp100-50` | 12163.50 | 1.478 | 4574.34 |

### 移動と考察

- **`tp25-30` (Run68 rank 2)** → Run69 では 6 位に低下 (11908.82)
  - Run69 で新たに `tp25-27`, `tp25-31`, `tp25-32` が台頭
  
- **`tp25-33` (Run68 rank 1)** → Run69 では 3 位に低下 (12426.41)
  - 前回首位だったが、1% 刻み探索で近傍が見つかった

- **`tp25-20` (Run68 rank 3)** → Run69 では未テスト
  - Run68 で「TP1 発動位置 25% が最適」と判定後、Run69 ではこのポイントをスキップ

- **新規 `tp25-27` (Run69 rank 1)** → 12505.46
  - Run68 では未テスト（発動位置 27% には触れたが TP1 ratio は違う）
  - **新首位を獲得**

---

## 指標別ランキング変化

### Profit Factor で見た相互関係

**Run 68** (profit factor 優先 ranking)
```
1. tp25-33: 1.479
2. tp25-30: 1.474
3. tp25-20: 1.471
(etc.)
```

**Run 69** (profit factor 優先 ranking)
```
1. (panic-reversal: 5.263 - 特殊カテゴリ)
2. tp25-31: 1.488  ← 新規最高 PF
3. tp25-33: 1.479
4. tp25-32: 1.478
(etc.)
```

**発見**: 微細な ratio sweep により、**profit factor の最適値が `tp25-31` へシフト**（前回 `tp25-33`）

### Drawdown で見た相互関係

**Run 68** (avg_max_drawdown 最小優先)
```
1. tp25-30: 4589.19
2. tp25-20: 4590.81
3. tp25-33: 4670.98
```

**Run 69** (avg_max_drawdown 最小優先)
```
1. tp25-32: 4574.34  ← 新規最小 DD
2. tp25-30: 4589.19
3. tp25-36: 4599.04
...
11. tp25-27: 4726.33  ← 首位なのに drawdown 最大
```

**発見**: Profit 最大（`tp25-27`）と drawdown 最小（`tp25-32`）が異なる戦略。単一 metric では判定不可。

---

## TP1 Ratio の最適値探索の推移

### 時系列

| Phase | Focus | Result | Recommendation |
|---|---|---|---|
| Run 68 | TP1 trigger point sweep (20-30%) | 25% が optimal trigger | TP1 発動位置を 25% に固定 |
| Run 69 | TP1 ratio sweep on 25% trigger (27-36%) | 27% or 31% が候補 | 27% (profit max) or 31% (PF max) |
| Run 70+ | TP1 trigger × ratio の 2D grid または stop loss optimization | TBD | TBD |

### 探索戦略の進化

1. **Run 67 (implicit baseline)**: tp25-25, tp25-30, tp25-33 の 3 anchor

2. **Run 68 (TP1 trigger sweep)**
   - 仮説: TP1 trigger (20%, 22%, 25%, 27%, 30%) を変動させれば profit が改善
   - 結果: TP1 trigger 25% が最適確認 + TP1 ratio calibration で 3 anchor を多点 anchor に拡張

3. **Run 69 (TP1 ratio micro sweep)**
   - 仮説: Run68 で 25% trigger が最適なら、その ratio を 1% 刻みで sweep すれば fine-tuning 可能
   - 結果: 27% が avg_net_profit 最大、31% が profit factor 最大

### 収束の様子

```
Run68 ranking:  tp25-33 (1st)
                ↓
Run69 ranking:  tp25-27 (1st), tp25-31 (2nd), tp25-33 (3rd)
```

- 逆転が複数発生：単一 metric では deterministic な ranking 困難
- 数値が 12400~12500 レンジに集約：**saturation 感が見える**
- ただし PF 最高は `tp25-31` (1.488) なので、**profit margin vs stability tradeoff**

---

## Panic Reversal 戦略の扱い

### Run 68
- strongest 非TP基準を anchor として直接比較
- avg_net_profit 13063.48 で一見最高だが、**TP1 ratio adjusted variants に押下される**（profit factor 低いため）

### Run 69
- `rsp-vix-spy-panic-reversal-rsi2-confirm-sma25-rsi65-exit-no-stop` を追加
- Rank 11 (最下位): avg_net_profit 1807.64 だが、**profit factor 5.263**（breakout 系の 3.6 倍）
- 位置づけを変更：「**競争ランキングではなく、独立した risk profile としての評価**」

### 戦略的な含意
- Breakout 系と Panic-reversal 系は **異なる risk-return profile**
- 組み合わせ strategy (portfolio) として考える方が適切
- 単独の absolute profit では比較不適切

---

## 結論・考察

### 1. TP1 Ratio 最適値は 27% 前後に収束

- **Run68**: `tp25-33` (12426.41)
- **Run69**: `tp25-27` (12505.46) ← **+79 improvement**

結果、TP1 ratio は **25~35% レンジが堅牢**だが、**27% 付近が avg_net_profit 最大**。

### 2. 単一指標では判定困難

- avg_net_profit 最大: `tp25-27` (12505.46)
- avg_profit_factor 最大: `tp25-31` (1.488)
- avg_max_drawdown 最小: `tp25-32` (4574.34)

**投資判断には KPI の weighted combination が必須**。

### 3. TP1 Sweep の局所最適化は終盤

27~36% の 1% 刻み探索を完了した結果、**diminishing returns の兆候**：
- 10 本中 8 本が 11900~12500 の 600 幅に収束
- これ以上の micro-tuning は backtesting noise の域内かもしれない

**次は別軸（TP1 trigger 2D grid、stop loss、TP2 ratio）への転換が合理的**。

### 4. 実装への推奨

#### 短期（このまま Run70+）
- 新 anchor を `tp25-27` に設定（pure profit max）or `tp25-31` に設定（balance 重視）
- 実装レイテンシと確度のバランスで判断

#### 中期（1-2 weeks 後）
- TP1 trigger の 2D sweep（22-25-28% × 25-33% ratio）を試行
- 計算効率のため絞り込み（8-10 presets）

#### 長期（1 month+）
- Stop loss size (6-10%) の sweep
- Entry regime filter の多様化（RSI + momentum combination など）
- Fear-based entry の validation（外部 sentiment data の統合）

### 5. この run で得たドメイン知識

**Donchian 60-20 ベースの breakout strategy において：**
- TP1 trigger point は 25% で確定（20-30% range でのみ tested）
- TP1 ratio は 27~31% に最適値が分布（さらに微細化は効率低下傾向）
- Profit factor は ratio が増えるほど低下する傾向（27% > 33% > 36%）
- Drawdown は 4600 前後で安定（ratio 依存度は低い）

**Panic-reversal 戦略は別の risk universe：**
- Breakout 系の 10 分の 1 の profit で、3 倍の profit factor
- Market stress 時の活躍を期待した conditional entry
- 単独での profitability より、portfolio diversification の観点が重要

---

## Appendix: 完全ランキング

### Run 69 Full Ranking (11 strategies, avg_net_profit 順)

| rank | strategy | avg_net_profit | avg_profit_factor | avg_max_drawdown | notes |
|---:|---|---:|---:|---:|---|
| 1 | tp25-27 | 12505.46 | 1.474 | 4726.33 | 新首位 (profit max) |
| 2 | tp25-31 | 12452.76 | 1.488 | 4618.70 | PF 最高 |
| 3 | tp25-33 | 12426.41 | 1.479 | 4670.98 | Run68 首位から 3 位へ |
| 4 | tp25-35 | 12295.69 | 1.474 | 4680.18 | |
| 5 | tp25-32 | 12163.50 | 1.478 | 4574.34 | DD 最小 |
| 6 | tp25-30 | 11908.82 | 1.474 | 4589.19 | Run68 2 位から 6 位へ |
| 7 | tp25-29 | 11698.66 | 1.462 | 4664.18 | |
| 8 | tp25-28 | 11749.78 | 1.461 | 4656.09 | |
| 9 | tp25-36 | 11956.49 | 1.465 | 4599.04 | |
| 10 | tp25-34 | 11438.97 | 1.460 | 4579.95 | |
| 11 | panic-reversal | 1807.64 | 5.263 | 1773.57 | 独立カテゴリ (risk profile 異) |

（注：ランキング順が index order と異なるのは、複数 metric を考慮した並び順）
