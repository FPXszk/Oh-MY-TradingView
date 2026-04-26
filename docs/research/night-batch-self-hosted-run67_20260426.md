# Night Batch Self Hosted Run 67

- workflow: `Night Batch Self Hosted`
- run_number: `67`
- run_id: `24948625082`
- status: `success`
- campaign: `strongest-vs-profit-protect-us40-10pack`
- artifact_root: `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/`
- detailed_report: `../reports/archive/night-batch-self-hosted-run67.md`

## 結果

- smoke: `10 / 10` success
- full: `400 / 400` success
- failure: `0`
- unreadable: `0`

## performance ranking

この run の戦略別ランキングは `artifacts/campaigns/strongest-vs-profit-protect-us40-10pack/full/strategy-ranking.json` を正本とし、current では `artifacts-backtest-scoreboards.md` に集約します。

上位 3 戦略:

| rank | strategy | avg_net_profit | avg_profit_factor | avg_max_drawdown |
| ---: | --- | ---: | ---: | ---: |
| 1 | `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50` | 12858.23 | 1.468 | 4803.22 |
| 2 | `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50` | 12289.95 | 1.463 | 4687.08 |
| 3 | `donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50` | 12104.69 | 1.462 | 4604.94 |

## メモ

- strongest 非TP基準 `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` は direct comparison で 4 位でした。
- 1 位 `tp25-25-tp100-50` は strongest 非TP基準より avg net profit で `205.25` 低い一方、profit factor・drawdown・win rate は少し良化しました。
- 今回の示唆は「profit-protect は不要ではないが、勝ち筋は TP1 の早い保護側にある」です。

## 結論

- workflow / artifact ともに `success` で、`strongest-vs-profit-protect-us40-10pack` は `smoke 10 / 10`、`full 400 / 400` を `0 failure` で完走しました。
- strongest 非TP基準は avg net profit 単独では今回も最大でしたが、ランキングでは profit-protect 3 本が上回りました。
- 現時点の最有力は `tp25-25-tp100-50` です。ただし strongest 非TP基準との差は小さく、完全に置き換えるほどの圧勝ではありません。

## 比較の読み方

- 今回の順位は `avg profit factor` を最優先に、次に `avg net profit`、最後に `avg max drawdown` を見た deterministic ranking として読むのが妥当です。
- その前提では `tp25-25-tp100-50` が首位ですが、avg net profit だけを見ると strongest 非TP基準が `13063.48` で最大、首位案は `12858.23` でした。
- つまり今回の結論は「利益保護は有効寄りだが、強い winner を削りすぎない保護幅に寄せるべき」です。

## 今後の改善方向

- 最優先は TP1 周辺の細分化です。`tp25-25-tp100-50` を軸に、TP1 発動位置を `22` / `25` / `27` / `30` 近辺で狭く刻む価値があります。
- 次点は TP1 比率の再比較です。`tp25-20-tp100-50`、`tp25-25-tp100-50`、`tp25-30-tp100-50`、`tp25-33-tp100-50` のように、早い TP1 のまま利確量だけを振ると差分を見やすいです。
- strongest 非TP基準は TSLA の大型 winner 依存が強いので、次の比較では strongest 非TP基準と run67 上位 3 本に絞った 5-pack / 6-pack 再戦が適しています。
- `tp35-25-tp100-50` は今回最下位で、TP1 を遅らせる方向は優先度を下げてよさそうです。

## 次に残す候補

- 継続比較候補: `tp25-25-tp100-50`、`tp30-33-tp100-50`、`tp30-20-tp100-50`、strongest 非TP基準
- 優先度を下げる候補: `tp35-25-tp100-50`
