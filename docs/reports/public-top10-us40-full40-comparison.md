# Public Top10 US40 — Full40 Comparison Memo

## 結論

**full 40銘柄の execution 結果だけを見ると、public 側で明確に残ったのは 9 戦略で横並びです。**  
`tv-public-brosio-break-and-retest` だけが 40/40 failure で脱落し、残り 9 戦略はすべて 40/40 success でした。

したがって、**full40 の execution 実績だけでは public 9 戦略の強弱は付きません。**

その上で「今の strongest 系に追随しそうなもの」をあえて優先順位付きで挙げるなら、

1. `tv-public-kdj-l2`
2. `tv-public-agni-momentum`
3. `tv-public-gold-hft-hybrid`

です。  
ただしこれは **full40 の execution 完走実績 + 既存 smoke 比較の性能ヒント** を合わせた暫定判断で、full40 の performance artifact を直接比較した結論ではありません。

---

## まず確定している事実

run 18 full phase log から切り出した結果:

| strategy | full40 success | full40 failure |
|---|---:|---:|
| `tv-public-kdj-l2` | 40 | 0 |
| `tv-public-masu-ultimate` | 40 | 0 |
| `tv-public-asian-breakout-autobot` | 40 | 0 |
| `tv-public-adaptive-risk-regime` | 40 | 0 |
| `tv-public-joat-institutional-convergence` | 40 | 0 |
| `tv-public-pivot-vwap-confluence` | 40 | 0 |
| `tv-public-brosio-break-and-retest` | 0 | 40 |
| `tv-public-agni-momentum` | 40 | 0 |
| `tv-public-gold-hft-hybrid` | 40 | 0 |
| `tv-public-mtf-matrix` | 40 | 0 |

根拠:

- run 18 old log: `/tmp/night-batch-24718820173/night-batch-24718820173-1/gha_24710297901_1.log`
- tail 35 checkpoint: `artifacts/campaigns/public-top10-us-40-brosio-tail35/full/checkpoint-20.json`

`tv-public-brosio-break-and-retest` は tail 再走でも compile error だったため、最終 400 run では **40/40 failure** 扱いにしている。

---

## full40 で何が言えて、何が言えないか

### 言えること

- public 10戦略のうち **9戦略は 40銘柄 full を完走**した
- `tv-public-brosio-break-and-retest` は **execution レベルで不成立**
- strongest 系と比べても、public 9戦略は少なくとも「回らない戦略」ではなかった

### 言えないこと

- full40 の **avg_net_profit / avg_profit_factor / avg_max_drawdown** の横比較
- public 9戦略の中で、execution 以外の観点でどれが一番強いかの断定
- strongest 系を public 側が上回ったかどうかの full40 ベース断定

理由は、今回手元で確実に参照できる public 側の performance 比較が smoke ベースしか残っていないため。

---

## strongest 系との比較での見方

既存比較メモ `docs/reports/night-batch-public-vs-strongest.md` で、performance 的に最も目立っていた public 側は次の通り。

| rank | public strategy | smoke hint |
|---|---|---|
| 1 | `tv-public-kdj-l2` | PF `1.8950`、一発の派手さは最大 |
| 2 | `tv-public-agni-momentum` | PF `1.5367`、`kdj` よりは地味だが見た目は素直 |
| 3 | `tv-public-gold-hft-hybrid` | PF `1.0634`、かなり弱いが完走はした |

一方で strongest 側は、

- US 本命: `donchian-55-20-rsp-filter-rsi14-regime-57-hard-stop-6pct-theme-deep-pullback-tight-narrow`
- 総合首位: `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`

で、10/10 success と drawdown の小ささまで含めて優位。

そのため practical な判断は:

- **execution 安定性だけなら** public 9戦略は全部合格
- **最強候補を探す観点では** 依然として strongest / finetune 系が本命
- public から 1本だけ追うなら `tv-public-kdj-l2`
- 次点を置くなら `tv-public-agni-momentum`
- それ以外の public は現時点では優先度を落としてよい

---

## 追随候補の整理

### 1. `tv-public-kdj-l2`

- full40: `40/40 success`
- smoke hint: PF `1.8950`
- 評価:
  - public 内では一番「化ける可能性」がある
  - ただし drawdown が極端に重く、今の strongest 系の代替とはまだ言えない

### 2. `tv-public-agni-momentum`

- full40: `40/40 success`
- smoke hint: PF `1.5367`
- 評価:
  - `kdj` より派手さは落ちる
  - それでも public の中では次に見る価値がある

### 3. `tv-public-gold-hft-hybrid`

- full40: `40/40 success`
- smoke hint: PF `1.0634`
- 評価:
  - execution は通る
  - ただし strongest 系を追う候補としては弱い

### 保留

- `tv-public-masu-ultimate`
- `tv-public-asian-breakout-autobot`
- `tv-public-adaptive-risk-regime`
- `tv-public-joat-institutional-convergence`
- `tv-public-pivot-vwap-confluence`
- `tv-public-mtf-matrix`

これらは full40 では完走しているが、今の手元データだけでは strongest 系への追随候補として前に出す根拠が薄い。

---

## 実務的な結論

**強いものを探す目的なら、今も本線は自分の strongest / finetune 系です。**  
public 側で別枠の探索対象として残す価値があるのは、現時点では `tv-public-kdj-l2`、次点で `tv-public-agni-momentum` までです。

public 全体を full40 ベースで見ても、「strongest を更新しそうな新本命が出た」とまでは言えません。

---

## 関連

- `docs/reports/night-batch-public-vs-strongest.md`
- `docs/reports/public-top10-us-40x10-final-400run.md`
- `docs/research/current/main-backtest-current-summary.md`
