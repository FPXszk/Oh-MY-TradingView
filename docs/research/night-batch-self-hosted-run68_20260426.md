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
