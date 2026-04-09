# confluence-community-observability-rollout

## Summary

- `experiment-gating` と campaign artifacts に `confluence_snapshot` / `provider_status` / `community_snapshot` を additive に統合した。
- `market_symbol_analysis` と `market_confluence_rank` に provider visibility (`status` / `missing_reason` / coverage summary) を追加し、silent null を減らした。
- `x_*` と `reach_*` を使う `market-community-snapshot` を追加し、初期実装では X/Reddit の件数・最新時刻・source presence だけを返すようにした。
- campaign 側では `market-intel-snapshots.json` を新設し、`gated-summary.json` / `ranked-candidates.json` へ additive に enrichment を載せるようにした。

## Files

- Added: `src/core/market-provider-status.js`
- Added: `src/core/market-community-snapshot.js`
- Added: `tests/market-provider-status.test.js`
- Added: `tests/market-community-snapshot.test.js`
- Added: `docs/working-memory/session-logs/confluence-community-observability-rollout_20260409_1334.md`
- Modified: `src/core/market-intel-analysis.js`
- Modified: `src/core/market-intel.js`
- Modified: `src/core/experiment-gating.js`
- Modified: `scripts/backtest/run-long-campaign.mjs`
- Modified: `src/core/index.js`
- Modified: `tests/market-intel-analysis.test.js`
- Modified: `tests/market-intel.test.js`
- Modified: `tests/experiment-gating.test.js`
- Modified: `tests/market-provider-status.test.js`
- Modified: `package.json`
- Modified: `README.md`
- Modified: `command.md`
- Modified: `docs/DOCUMENTATION_SYSTEM.md`
- Modified: `docs/references/design-ref-llms.md`

## Validation

- `node --test tests/market-provider-status.test.js tests/market-community-snapshot.test.js tests/market-intel-analysis.test.js tests/market-intel.test.js tests/experiment-gating.test.js`
- `node --test tests/market-provider-status.test.js tests/market-intel-analysis.test.js`
- `npm run tv -- market analysis --symbol AAPL`
- `npm run tv -- market confluence-rank AAPL MSFT NVDA --limit 2`
- `node scripts/backtest/run-long-campaign.mjs external-phase1-priority-top --phase smoke --dry-run`

## Live examples

### `npm run tv -- market analysis --symbol AAPL`

- `analysis.provider_status.fundamentals.status` は upstream 側の取得失敗を表し、`inputs.fundamentals_missing_reason` で欠損理由を追える。
- `analysis.community_snapshot` では `twitter-cli` 未認証でも `reddit` が生きていれば partial success を維持した。
- この live run では `counts.reddit: 5`, `counts.x: 0`, `source_presence.reddit: true`。

### `npm run tv -- market confluence-rank AAPL MSFT NVDA --limit 2`

- `ranked_symbols[]` に `provider_status` と `community_snapshot` が載る。
- `omitted[]` にも `provider_status` を残し、`limit` で見えなくなった成功銘柄を追跡できる。

### `node scripts/backtest/run-long-campaign.mjs external-phase1-priority-top --phase smoke --dry-run`

- 既存 dry-run surface を壊さず、campaign metadata の確認は継続できた。
- gating enabled campaign は実行時に `market-intel-snapshots.json` を追加出力する設計にした。

## Notes

- community snapshot は初期実装で X/Reddit のみを active source にし、sentiment 判定は入れていない。
- `HTTP 401/403` は provider 一般では `provider_error` として扱い、`twitter/x` 系だけ auth_required を明示するよう分離した。
- post-review fix として `getMultiSymbolAnalysis()` は 20 symbol 超を内部 batch 処理するようにし、gating enabled の large campaign でも snapshot enrichment が落ちないようにした。
- post-review fix として TA fetch failure は `no_results` ではなく `provider_error` / `fetch_failed` へ寄せ、community disabled 時は aggregate provider を `skipped` / `not_requested` として扱うようにした。
- post-review fix として campaign gating 側は symbol join を uppercase normalize し、`success: false` でも schema-shaped analysis を持つ snapshot は additive enrichment に残すようにした。
