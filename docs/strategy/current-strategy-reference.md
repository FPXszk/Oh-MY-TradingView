# Current strategy reference

このファイルは **戦略カタログの人間向け入口** です。初見でも「どの戦略があり、どの market / 期間 / 条件で見ているか」を追えるように整理しています。

- catalog source: `config/backtest/strategy-catalog.json`
- score artifact (US): `artifacts/campaigns/next-long-run-us-finetune-100x10/smoke/recovered-results.json`
- score artifact (JP): `artifacts/campaigns/next-long-run-jp-finetune-100x10/smoke/recovered-results.json`
- live count: 40
- retired count: 122

## 読み方

- `current score` は利用可能な最新 backtest artifact から合成した順位です。未計測の戦略は `—` です。
- `lifecycle` は live / retired を表します。
- `theme notes` / `mag7 notes` は、この repo でその戦略をどう見ていたかの人間向け説明です。

## 全戦略一覧

| lifecycle | strategy | name | current score | markets | parameters | regime | stop | theme axis | theme notes |
| --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| live | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | Donchian 60/20 + RSP Filter + RSI14 Regime 60 + 8% Stop | 6 | US | entry_period=60, exit_period=20 | RSP>SMA200 / RSI14 > 60 | 8% hard stop | deep-pullback-strict-entry-late | deep-pullback-strict の exit を固定したまま entry を 60 へ遅らせ、strict 側の質優先をさらに強めたときの残り方を確認する。 |
| retired | `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` | Donchian 50/20 + RSP Filter + RSI14 Regime 55 + 8% Stop | 10 | JP | entry_period=50, exit_period=20 | RSP>SMA200 / RSI14 > 55 | 8% hard stop | deep-pullback-tight-entry-early | deep-pullback-tight の exit を固定したまま entry を 50 へ早め、stable anchor の上振れ余地を period だけで確認する。 |
| retired | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow` | Donchian 55/20 + RSP Filter + RSI14 Regime 60 + 6% Stop | 9 | US | entry_period=55, exit_period=20 | RSP>SMA200 / RSI14 > 60 | 6% hard stop | deep-pullback-strict-narrow | deep-pullback-strict の strict entry を維持しながら stop を 6% に締め、深押し枝の防御限界を確認する。 |
| live | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50-risk1` | Donchian 60/20 + RSP + RSI14 Regime 60 + TP 30/25 + TP 100/50 + Risk 1% | — | — | entry_period=60, exit_period=20 | RSP>SMA200 / RSI14 > 60 | 8% hard stop | strongest-profit-protect-risk1-base | 最強戦略そのままの 60/20・RSP・RSI60 を維持しつつ、30% と 100% の二段階部分利確と 1% リスク固定サイズを追加した基準線。 |
| live | `donchian-60-20-rsp-rsi14-regime60-tp25-25-tp100-50-risk1` | Donchian 60/20 + RSP + RSI14 Regime 60 + TP 25/25 + TP 100/50 + Risk 1% | — | — | entry_period=60, exit_period=20 | RSP>SMA200 / RSI14 > 60 | 8% hard stop | strongest-profit-protect-risk1-tp25 | 1回目の利確発動を 25% へ早め、早期保護の効き方を比較する。 |
| live | `donchian-60-20-rsp-rsi14-regime60-tp35-25-tp100-50-risk1` | Donchian 60/20 + RSP + RSI14 Regime 60 + TP 35/25 + TP 100/50 + Risk 1% | — | — | entry_period=60, exit_period=20 | RSP>SMA200 / RSI14 > 60 | 8% hard stop | strongest-profit-protect-risk1-tp35 | 1回目の利確発動を 35% へ遅らせ、伸びを残す方向の差を比較する。 |
| live | `donchian-60-20-rsp-rsi14-regime60-tp30-20-tp100-50-risk1` | Donchian 60/20 + RSP + RSI14 Regime 60 + TP 30/20 + TP 100/50 + Risk 1% | — | — | entry_period=60, exit_period=20 | RSP>SMA200 / RSI14 > 60 | 8% hard stop | strongest-profit-protect-risk1-tp1-light | 1回目の利確比率を 20% に下げ、上振れ余地を残したまま保護できるかを比較する。 |
| live | `donchian-60-20-rsp-rsi14-regime60-tp30-33-tp100-50-risk1` | Donchian 60/20 + RSP + RSI14 Regime 60 + TP 30/33 + TP 100/50 + Risk 1% | — | — | entry_period=60, exit_period=20 | RSP>SMA200 / RSI14 > 60 | 8% hard stop | strongest-profit-protect-risk1-tp1-heavy | 1回目の利確比率を 33% に上げ、早期ロックの強さを比較する。 |
| live | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp80-50-risk1` | Donchian 60/20 + RSP + RSI14 Regime 60 + TP 30/25 + TP 80/50 + Risk 1% | — | — | entry_period=60, exit_period=20 | RSP>SMA200 / RSI14 > 60 | 8% hard stop | strongest-profit-protect-risk1-tp2-early | 2回目の利確発動を 80% へ前倒しし、急騰の利確圧を強めた比較版。 |
| live | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp120-50-risk1` | Donchian 60/20 + RSP + RSI14 Regime 60 + TP 30/25 + TP 120/50 + Risk 1% | — | — | entry_period=60, exit_period=20 | RSP>SMA200 / RSI14 > 60 | 8% hard stop | strongest-profit-protect-risk1-tp2-late | 2回目の利確発動を 120% へ遅らせ、超大型 winner を残す方向の比較版。 |
| live | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-33-risk1` | Donchian 60/20 + RSP + RSI14 Regime 60 + TP 30/25 + TP 100/33 + Risk 1% | — | — | entry_period=60, exit_period=20 | RSP>SMA200 / RSI14 > 60 | 8% hard stop | strongest-profit-protect-risk1-tp2-light | 2回目の利確比率を 33% に下げ、後半の追従玉を残す方向の比較版。 |
| live | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-67-risk1` | Donchian 60/20 + RSP + RSI14 Regime 60 + TP 30/25 + TP 100/67 + Risk 1% | — | — | entry_period=60, exit_period=20 | RSP>SMA200 / RSI14 > 60 | 8% hard stop | strongest-profit-protect-risk1-tp2-heavy | 2回目の利確比率を 67% に上げ、急騰後のロックを強めた比較版。 |
| live | `donchian-60-20-rsp-rsi14-regime60-tp30-25-tp100-50-risk2` | Donchian 60/20 + RSP + RSI14 Regime 60 + TP 30/25 + TP 100/50 + Risk 2% | — | — | entry_period=60, exit_period=20 | RSP>SMA200 / RSI14 > 60 | 8% hard stop | strongest-profit-protect-risk2-base | 含み益保護は基準版のまま、許容リスクを 2% に広げた比較版。 |

## 最新結果で観測できた上位候補

| rank | strategy | markets | avg net | avg PF | avg MDD | tested symbols |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 1 | `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late` | US | 18918.78 | 1.8284 | 4620.50 | 10 |
| 2 | `donchian-55-20-rsp-filter-rsi14-regime-60-hard-stop-6pct-theme-deep-pullback-strict-narrow` | US | 20538.77 | 1.7616 | 5181.22 | 10 |
| 3 | `donchian-50-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-entry-early` | JP | 13641.52 | 2.0385 | 6458.07 | 10 |

