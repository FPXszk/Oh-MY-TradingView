# Next long-run fine-tune complete handoff

- status: **COMPLETE / HANDOFF READY**
- scope: `next-long-run-us-finetune-100x10` + `next-long-run-jp-finetune-100x10` + local `external-phase1-run8-us-jp-top6` smoke
- latest executed run: `24341576697`
- latest skipped success: `24353498557`
- 作成日時: 2026-04-13T16:23

---

## What changed

1. `docs/research/current/` の latest 世代を、**2026-04-10 partial report** から **2026-04-13 complete results** へ更新した
2. latest full-run の成績を `references/backtests/next-long-run-finetune-complete_20260413.summary.json` に固定した
3. local smoke (`external-phase1-run8-us-jp-top6`) の gating 結果も同世代で読めるように統合した

---

## Read this first

1. [`latest/README.md`](./latest/README.md)
2. [`next-long-run-finetune-complete-results_20260413_1623.md`](./next-long-run-finetune-complete-results_20260413_1623.md)
3. `../references/backtests/next-long-run-finetune-complete_20260413.summary.json`
4. 直前の partial 世代を見返すなら `./next-long-run-finetune-partial-results_20260410_1503.md`

---

## Source of truth

| topic | source |
| --- | --- |
| latest executed run の状態 | `../../artifacts/gh-run-24341576697/night-batch-24341576697-1/gha_24341576697_1-summary.md` |
| latest executed run の件数 | `../../artifacts/gh-run-24341576697/night-batch-24341576697-1/gha_24341576697_1.log` |
| US full metrics | `/mnt/c/actions-runner/_work/Oh-MY-TradingView/Oh-MY-TradingView/artifacts/campaigns/next-long-run-us-finetune-100x10/full/recovered-results.json` |
| JP full metrics | `/mnt/c/actions-runner/_work/Oh-MY-TradingView/Oh-MY-TradingView/artifacts/campaigns/next-long-run-jp-finetune-100x10/full/recovered-results.json` |
| repo 内の固定サマリ | `../references/backtests/next-long-run-finetune-complete_20260413.summary.json` |
| local smoke gating | `../../artifacts/campaigns/external-phase1-run8-us-jp-top6/smoke/gated-summary.json` |

---

## Key findings

### Full-run status

- US full: **1000/1000 success**
- JP full: **1000/1000 success**
- local smoke: **60/60 success**

### US winners

- avg net winner: `strict-entry-early`
- PF winner: `strict-entry-late`
- lowest avg drawdown: `tight-narrow`
- strongest symbol cluster: `NVDA`, `AAPL`

### JP winners

- avg net winner: `strict`
- PF winner: `tight-exit-tight`
- lowest avg drawdown: `tight-narrow`
- strongest symbol cluster: `TSE:8002`, `TSE:5802`

### Operational caveat

- `24353498557` は success だが、**stale schedule skip** であり backtest は走っていない
- したがって「latest success」ではなく「latest executed run」を見る必要がある

---

## Known caveats

1. JP full では `profit_factor` / `win_rate` が **40 run 欠損**している
2. latest full metrics の正本は `/mnt/c/actions-runner/...` 側なので、repo 内では summary JSON を固定証跡として使う
3. worktree には `artifacts/` 配下の未追跡 artifact が残っているため、report commit に unrelated artifact を混ぜないこと

---

## Next decision gates

1. latest 世代を基準に、US winner と JP winner を次の candidate shortlist に残すか判断する
2. local smoke で promote された 37 candidate を full-run winner とどう統合するか決める
3. nightly monitoring では、skip success を latest result に数えない運用ルールを維持する
