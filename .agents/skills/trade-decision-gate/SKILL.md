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

If the mode is unclear, infer from the user's wording and inputs. If it cannot be determined, stop and re-judge only after missing information is provided. Return `STAY` with the missing information and what is needed for re-judgment.

## Judgment Priority

Apply decisions in this order. This prevents missing data from hiding a confirmed exit condition.

1. If a confirmed `STOP` condition exists, return `STOP`.
2. If no `STOP` condition is confirmed but required information for `GO` is missing, return `STAY`.
3. Return `GO` only when all required items for that mode are confirmed and the `GO` conditions are satisfied.

Examples:

- Confirmed `SETUP_BROKEN` with unknown next earnings date -> `STOP`.
- Confirmed stop-line break with unknown latest screener rank -> `STOP`.
- Chart remains intact but latest news is unconfirmed -> `STAY`.
- New entry with no valid pivot -> `STAY`.
- Clear `RISK_OFF` market for a new entry -> `STOP`.
- Averaging-down / nanpin consultation -> `STOP`.

Do not infer a `STOP` condition that has not been observed. Mark it `未確認` when evidence is missing.

## Mode Workflows

### NEW_ENTRY

For a new entry, confirm:

- Symbol and market.
- Latest price.
- Company releases and regulator filings.
- Latest news.
- Next earnings date and important events.
- Market regime.
- Sector strength.
- Latest screener.
- Industry rank, stock rank, and score.
- Leader-stock judgment.
- Chart state.
- Setup.
- Valid pivot.
- Extension from pivot.
- Entry candidate.
- Stop price.
- Stop width.
- Risk/reward.
- Position sizing.
- Portfolio overlap.

### ADD_POSITION

For an add, confirm all `NEW_ENTRY` items plus:

- Current average cost.
- Current quantity.
- Unrealized P/L.
- Distinction between core position and add-on lot.
- Average cost after add.
- Position value after add.
- Expected one-trade loss after add.
- Total portfolio expected loss after add.
- Same-theme or same-price-action overlap.
- The add is not averaging down while the position is at a loss.

A nanpin / averaging-down request is in scope, but under `docs/strategy/Trade-rule.md` it is `STOP` by default.

### HOLD_OR_EXIT

For hold, reduce, sell, cut-loss, take-profit, or cross-earnings judgment, confirm:

- Latest price.
- Average cost.
- Quantity.
- Unrealized P/L percentage.
- Current stop or invalidation line.
- Company-specific news.
- Earnings and important events.
- Market regime.
- Sector and major leader state.
- `FAILED_BREAKOUT`.
- `SETUP_BROKEN`.
- Important support, recent low, and major moving averages.
- Profit management using the 10-day line, 25-day line, or a new pivot.
- Profit cushion enough to cross earnings.
- Portfolio importance and overlap.

Do not make these new-entry requirements unconditional for `HOLD_OR_EXIT`:

- Initial risk/reward of 2 or higher.
- New entry zone.
- Within 5% of the latest pivot.
- Latest screener top rank.

If the user also asks whether to add, apply `ADD_POSITION` requirements to that add decision.

### PORTFOLIO_RISK

For portfolio-level judgment, focus on:

- Total assets.
- Cash balance.
- Cash ratio.
- Gross position value.
- Gross exposure multiple.
- Each position's market value.
- Each position's stop location.
- Each position's expected loss.
- Total expected loss if all stops trigger.
- Largest single-position concentration.
- Largest sector concentration.
- Industry and theme overlap.
- Correlated-position overlap.
- US / JP / currency bias.
- Earnings and important-event clustering.
- Reduction priority candidates.
- Room to take new risk.

Do not make these single-symbol checks unconditional for `PORTFOLIO_RISK`:

- One target symbol.
- One symbol's valid pivot.
- One symbol's entry zone.
- One symbol's initial risk/reward.
- Complete next earnings date for every holding.
- Screener rank for every holding.

Only check individual charts or events for the positions that matter when selecting reduction candidates.

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

## Latest Successful Screener Run

For US stocks, use:

- `.github/workflows/daily-screener.yml`
- `docs/reports/screener/daily-ranking.md`
- `docs/reports/screener/daily-ranking-run.json`

For Japan stocks, use:

- `.github/workflows/daily-screener-japan.yml`
- `docs/reports/screener/daily-ranking-jp.md`
- `docs/reports/screener/daily-ranking-jp-run.json`

Do not decide freshness from run metadata alone. Check in this order:

1. Available GitHub connector / GitHub API tool.
2. `gh` CLI.
3. Repository run metadata and report body.

When a GitHub connector is available, use it to identify the latest successful run for the target workflow.

When `gh` CLI is available, use:

```powershell
gh run list --workflow daily-screener.yml --branch main --status success --limit 1 --json databaseId,headSha,createdAt,updatedAt,status,conclusion,url
gh run list --workflow daily-screener-japan.yml --branch main --status success --limit 1 --json databaseId,headSha,createdAt,updatedAt,status,conclusion,url
gh run view <run-id>
```

When neither GitHub connector nor `gh` CLI is available, compare repository metadata with the report body date and update time. If metadata and report body are stale or inconsistent and current success cannot be established, do not claim freshness and return `STAY` for decisions that require a fresh screener.

Use `.agents/skills/github-actions-failure-debugging/SKILL.md` only when a concrete GitHub Actions failure or run investigation is needed. It is not required for every trade decision.

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

If an image does not provide all required data, return a provisional `STAY`, list confirmed facts, list missing facts, and state what is needed for re-judgment. If the image confirms a `STOP` condition, use `STOP` even when some nonessential data remains missing.

## Missing Information

Do not fill unknowns optimistically. Use `未確認` for unknown values.

For `NEW_ENTRY` and `ADD_POSITION`, return `STAY` by default when required `GO` information cannot be confirmed and no `STOP` condition is confirmed.

For `HOLD_OR_EXIT`, do not require new-entry-only data unconditionally. If a confirmed stop-line break, `FAILED_BREAKOUT`, `SETUP_BROKEN`, thesis-breaking news, or unacceptable event risk exists, return `STOP` even if some nonessential information remains missing.

For `PORTFOLIO_RISK`, do not require one target symbol, one pivot, or every holding's full screener rank. If confirmed exposure, concentration, correlation, or expected-loss breach exists, return `STOP`; otherwise use `STAY` when risk capacity cannot be confirmed.

## Label Meanings

- `NEW_ENTRY + GO`: A new entry is allowed only if all Trade Rule conditions are satisfied.
- `NEW_ENTRY + STAY`: Wait; do not enter yet.
- `NEW_ENTRY + STOP`: Do not enter; a hard stop or no-trade condition is confirmed.
- `ADD_POSITION + GO`: Adding is allowed only if all add-position conditions are satisfied and it is not nanpin.
- `ADD_POSITION + STAY`: Hold current size; adding is not justified yet.
- `ADD_POSITION + STOP`: Do not add. If it is nanpin or adds excessive risk, prioritize no-add / reduction.
- `HOLD_OR_EXIT + GO`: Do not use.
- `HOLD_OR_EXIT + STAY`: Continue holding the current position. This does not permit adding.
- `HOLD_OR_EXIT + STOP`: Prioritize reducing, selling, cutting loss, exiting, partial profit-taking, raising stops, or tightening trailing management.
- `PORTFOLIO_RISK + GO`: There is room to take new risk. This does not approve buying a specific symbol.
- `PORTFOLIO_RISK + STAY`: Maintain current exposure. Do not rush a new addition.
- `PORTFOLIO_RISK + STOP`: Reduce exposure, concentration, correlation, or expected loss.

For `PORTFOLIO_RISK`, set `対象市場` to `US`, `JP`, or `MIXED`. Use `MIXED` when US and Japan holdings are both present.

## Read-Only Constraint

This skill is read-only. The following operations are prohibited:

- 注文発注 is prohibited.
- 注文変更 is prohibited.
- 注文取消 is prohibited.
- 自動売買 is prohibited.
- 自動損切り is prohibited.
- ポジションの自動縮小 is prohibited.
- 取引ロック解除 is prohibited.
- Moomooでの取引操作 is prohibited.
- 証券口座への書き込み操作 is prohibited.

Do not describe the agent as able to place, modify, cancel, unlock, or submit orders. Do not create alerts unless the user explicitly asks for an alert.

Allowed output is limited to decision support: trade judgment, entry candidate, size candidate, stop candidate, profit-taking or trailing candidate, re-check condition, and portfolio reduction candidate.

## Output Format

Put the judgment first, before metadata:

```markdown
# 判定: GO / STAY / STOP

確認時刻:
判断モード: NEW_ENTRY / ADD_POSITION / HOLD_OR_EXIT / PORTFOLIO_RISK
対象市場: US / JP / MIXED
対象銘柄:
入力形式: テキスト / チャート画像 / 保有画像 / ポートフォリオ画像
データ完全性: COMPLETE / PARTIAL / INSUFFICIENT
```

### NEW_ENTRY / ADD_POSITION Output

Use the Trade Rule section structure:

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

### HOLD_OR_EXIT Output

Use:

```text
1. 結論
2. 最新ニュース・イベント
3. 保有状況
4. 市場・セクター・リーダー判定
5. チャート崩れ・利益管理
6. 決算・イベントリスク
7. STOP条件チェック
8. 最終アクション
```

Include at least:

```text
平均取得価格:
現在価格:
含み損益率:
現在の無効化ライン:
チャート状態:
保有継続条件:
縮小条件:
売却・損切り条件:
利益管理:
```

### PORTFOLIO_RISK Output

Use:

```text
1. 結論
2. ポートフォリオ概要
3. 現金・建玉
4. 集中・相関リスク
5. 最大想定損失
6. 市場レジーム
7. リスク上限チェック
8. 最終アクション
```

Include at least:

```text
総資産:
現金残高:
現金比率:
建玉総額:
建玉倍率:
全ストップ発動時の想定損失:
最大銘柄比率:
最大セクター比率:
テーマ重複:
相関リスク:
イベント集中:
縮小優先候補:
新規リスク余地:
```
