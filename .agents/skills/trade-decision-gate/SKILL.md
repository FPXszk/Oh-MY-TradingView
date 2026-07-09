---
name: trade-decision-gate
description: Use when the user asks in natural Japanese whether to buy, add, hold, sell, take profit, cut loss, cross earnings, reduce positions, or judge portfolio risk from tickers, charts, holdings screenshots, portfolio screenshots, or position text.
---

# trade-decision-gate

This skill is the top-level gate for trade decisions. It does not create a new trading strategy, chart recognizer, MCP tool, CLI command, order router, or automated trading flow.

Use it when the user asks for a concrete trading or portfolio-risk judgment, including:

- 「この銘柄は今買うべき？」
- 「今から入っていい？」
- 「この位置はエントリーポイント？」
- 「追加購入していい？」
- 「買い増ししていい？」
- 「ナンピンした方がいい？」
- 「今持っているけどどうしたらいい？」
- 「含み損だけどまだ持つべき？」
- 「売った方がいい？」
- 「利確した方がいい？」
- 「決算を跨いでいい？」
- 「現金比率が少なすぎる？」
- 「ポジションを持ちすぎている？」
- 「このポートフォリオのリスクは高すぎる？」
- 「同一テーマへ偏りすぎている？」
- 「どのポジションを減らすべき？」

Supported inputs include ticker-only text, company names, natural-language questions, chart images, holdings screenshots, portfolio screenshots, multiple-symbol lists, and position text with average cost, quantity, current price, or P/L.

## Do Not Trigger For

Do not use this skill for these requests by themselves:

- Company overview only
- Terminology explanations such as PER, EPS, or ATR
- Researching only why a stock rose
- Pine Script creation
- Screener implementation changes
- Backtest analysis
- General Dr.K strategy explanation

If the user adds a trade-decision question such as 「それで今買っていい？」, use this skill.

## Source Of Truth

Always read `docs/strategy/Trade-rule.md` before making the judgment. It is the source of truth for trade rules, hard stops, position sizing, and the fixed output format.

Use `.agents/skills/tradingview-operator-playbook/SKILL.md` when choosing how to gather current price, market data, news, Moomoo data, TradingView chart state, reach data, X/Reddit observation, or screener information. Do not duplicate that skill's command tables here.

Dr.K reports such as `docs/strategy/dr-k-chart-strategy-quantification-report_20260707.md` are optional supporting material only. Do not treat them as the trade-rule source of truth, and do not read them every time. Use them only when chart-state details are ambiguous, such as pivot selection, N/U patterns, absorption, failed breakouts, pullbacks, or leader-stock price-action comparisons.

## Decision Modes

Classify every request into one of these modes:

- `NEW_ENTRY`: New purchase or first entry judgment.
- `ADD_POSITION`: Add, pyramid, average-up, or averaging-down consultation. Averaging down is still a trigger even though `docs/strategy/Trade-rule.md` prohibits nanpin.
- `HOLD_OR_EXIT`: Hold, reduce, sell, cut loss, take profit, trail, or cross-earnings judgment for an existing position.
- `PORTFOLIO_RISK`: Whole-portfolio, cash ratio, gross exposure, theme concentration, correlated-position, max-loss, or position-reduction judgment.

If the mode is unclear, infer from the user's wording and inputs. If it cannot be determined, return `STAY` with the missing information and what is needed for re-judgment.

## Required Workflow

Follow this order. Do not skip ahead to a chart-only or news-only answer.

1. Restate the user's request and input form.
2. Identify symbol, market, and decision mode.
3. Read `docs/strategy/Trade-rule.md`.
4. Read `.agents/skills/tradingview-operator-playbook/SKILL.md` if data-gathering route selection is needed.
5. Get the latest price.
6. Check company releases, regulator filings, earnings date, and important events.
7. Check latest news and market context.
8. Classify the market regime as `RISK_ON / NEUTRAL / RISK_OFF`.
9. Check the latest US or Japan screener report.
10. Check latest successful run freshness and report freshness.
11. Check sector, Industry, stock rank, and score for the target.
12. Judge sector strength and whether the target is a leader.
13. Check OHLCV or TradingView chart state.
14. Check chart state, setup, pivot, and extension percentage.
15. Calculate entry, stop, and risk/reward.
16. For held positions, check average cost, quantity, and unrealized P/L.
17. For portfolio judgment, check balance, cash, positions, theme overlap, and max expected loss.
18. Apply hard-stop conditions from `docs/strategy/Trade-rule.md`.
19. Return `GO / STAY / STOP` in the fixed format.

## Data Priority

Use sources in this priority:

1. Primary sources such as company releases, SEC, EDINET, exchanges, and regulators.
2. Recent reliable market news.
3. Latest Oh-MY-TradingView screener reports.
4. Moomoo quote, fundamentals, snapshot, and OHLCV.
5. TradingView chart view.
6. Moomoo, SBI, and unified portfolio reports for holdings.
7. SNS, X, Reddit, and similar community sources as supplemental context only.

Never issue `GO` based only on SNS, X, Reddit, or community sentiment.

## US / Japan Screener Split

For US stocks, use:

- `.github/workflows/daily-screener.yml`
- `docs/reports/screener/daily-ranking.md`
- `docs/reports/screener/daily-ranking-run.json`

For Japan stocks, use:

- `.github/workflows/daily-screener-japan.yml`
- `docs/reports/screener/daily-ranking-jp.md`
- `docs/reports/screener/daily-ranking-jp-run.json`

Do not decide freshness from run metadata alone. Check in this order:

1. Run metadata.
2. Report body date and update time.
3. Consistency between metadata and report body.
4. Latest successful GitHub Actions run if metadata and body are stale or inconsistent.
5. Return `STAY` if the latest normal result cannot be identified.

## TradingView Usage

Prefer non-CDP market, reach, screener, and Moomoo routes when OHLCV and market data are enough.

Use CDP or TradingView chart state only when needed for:

- Comparison with an attached chart image.
- Visual pivot confirmation.
- Candle and volume position checks.
- Multiple-timeframe checks.
- Visual setup classification.
- Current TradingView chart state.

Do not launch TradingView Desktop unconditionally.

## Image Inputs

For chart images, extract only what is visible: symbol, timeframe, price area, volume, pivot candidates, setup candidates, and support/resistance. Do not pretend full automatic chart recognition exists.

For holdings screenshots, extract visible symbol, quantity, average cost, current price, P/L, currency, and account type.

For portfolio screenshots, extract visible balance, cash, positions, unrealized P/L, diversification, theme overlap, and concentration.

If an image does not provide all required data, return a provisional `STAY`, list confirmed facts, list missing facts, and state what is needed for re-judgment.

## Missing Information

Do not fill unknowns optimistically. Return `STAY` by default when any required item cannot be confirmed:

- Symbol or market.
- Latest price.
- Latest news.
- Next earnings date.
- Latest screener.
- Valid pivot.
- Stop price.
- Balance, positions, or cash for portfolio judgment.

Still answer usefully: provide the provisional judgment, confirmed facts, missing information, and exact re-check conditions.

## Read-Only Constraint

This skill is read-only. The following are prohibited:

- 注文発注
- 注文変更
- 注文取消
- 自動売買
- 自動損切り
- ポジションの自動縮小
- 取引ロック解除
- Moomooでの取引操作
- 証券口座への書き込み操作

You may present only decision support: trade judgment, entry candidate, size candidate, stop candidate, profit-taking or trailing candidate, re-check condition, and portfolio reduction candidate.

Do not create alerts unless the user explicitly asks for an alert.

## Output Format

Use the fixed format from `docs/strategy/Trade-rule.md`, with this metadata block first:

```markdown
確認時刻:
判断モード: NEW_ENTRY / ADD_POSITION / HOLD_OR_EXIT / PORTFOLIO_RISK
対象市場: US / JP
対象銘柄:
入力形式: テキスト / チャート画像 / 保有画像 / ポートフォリオ画像
データ完全性: COMPLETE / PARTIAL / INSUFFICIENT

# 判定: GO / STAY / STOP
```

Then keep the Trade Rule section structure:

```text
1. 結論
2. 最新ニュース・イベント
3. スクリーナー
4. 市場・セクター・リーダー判定
5. チャート
6. 資金管理
7. ハード停止チェック
8. 最終アクション
```

Mode-specific label meanings:

- `HOLD_OR_EXIT + STAY`: Continue holding the current position. This does not permit adding.
- `HOLD_OR_EXIT + STOP`: Prioritize reducing, selling, cutting loss, or exiting.
- `PORTFOLIO_RISK + GO`: There is room to take new risk.
- `PORTFOLIO_RISK + STAY`: Maintain current exposure. Do not rush a new addition.
- `PORTFOLIO_RISK + STOP`: Reduce exposure, concentration, or expected loss.
