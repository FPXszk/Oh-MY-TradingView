# weak-signal-confluence-rollout

## Summary

- `market_symbol_analysis` の `analysis.overall_summary` に additive な `confluence_score` / `confluence_label` / `confluence_breakdown` / `coverage_summary` を追加した。
- `src/core/market-confluence.js` を新設し、trend / fundamentals / risk を固定重みで合成する pure helper を切り出した。
- `market_confluence_rank` MCP tool と `tv market confluence-rank` CLI を追加し、複数銘柄の deterministic ranking を可能にした。
- docs と参照台帳を更新し、X記事由来の採用点・非採用点を記録した。

## Files

- Added: `src/core/market-confluence.js`
- Added: `tests/market-confluence.test.js`
- Added: `docs/working-memory/session-logs/weak-signal-confluence-rollout_20260409_2127.md`
- Modified: `src/core/market-intel-analysis.js`
- Modified: `src/core/market-intel.js`
- Modified: `src/tools/market-intel.js`
- Modified: `src/cli/commands/market-intel.js`
- Modified: `src/core/index.js`
- Modified: `tests/market-intel-analysis.test.js`
- Modified: `tests/market-intel.test.js`
- Modified: `package.json`
- Modified: `README.md`
- Modified: `docs/references/design-ref-llms.md`
- Modified: `docs/DOCUMENTATION_SYSTEM.md`

## Validation

- `node --test tests/market-confluence.test.js tests/market-intel-analysis.test.js`
- `node --test tests/market-intel.test.js tests/market-confluence.test.js tests/market-intel-analysis.test.js`
- `node ./src/cli/index.js market analysis --symbol AAPL`
- `node ./src/cli/index.js market confluence-rank AAPL MSFT NVDA --limit 3`

## Live examples

### `tv market analysis --symbol AAPL`

- `confluence_score: 50`
- `confluence_label: "mixed"`
- `coverage_summary.core_available: 2`
- `coverage_summary.missing_inputs: ["fundamentals"]`
- `warnings` に `Fundamentals data unavailable` が入り、core input 欠損を明示できた。

### `tv market confluence-rank AAPL MSFT NVDA --limit 3`

1. `AAPL` — `confluence_score: 50`, `confluence_label: "mixed"`
2. `NVDA` — `confluence_score: 50`, `confluence_label: "mixed"`
3. `MSFT` — `confluence_score: 30`, `confluence_label: "unfavourable"`

- 同点時は symbol 昇順の stable tie-break で並ぶ。
- この live run でも fundamentals は欠損していたが、`coverage_summary` と warning により degraded reasoning を追跡できた。

## Notes

- 初期 confluence は `news` を direction に使わず、coverage-only とした。
- `x_*` / `reach_*` / `experiment-gating` 連携はこの段階では defer した。
