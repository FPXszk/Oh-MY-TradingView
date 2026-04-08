# Session log: market-specific long-run deep dive

## Goal

- 前回の `long-run-cross-market-100x5` 結果を踏まえ、US は entry period、JP は exit period を切り分ける deep dive を実行可能にする
- 実行前に config / tests / command guide / session log を揃える

## Result summary used for planning

- full recovered summary: `485 success / 15 unreadable / 500 total`
- by market:
  - US: `245 ok / 5 unreadable`
  - JP: `240 ok / 10 unreadable`
- overall signal:
  - avg net profit 主軸: preset2
  - wins / profit factor 主軸: preset5
- market signal:
  - US は `regime-60 strict entry-early` family が優勢
  - JP は `regime-55 tight exit-tight` family が優勢

## Implemented artifacts

- `config/backtest/universes/long-run-us-50.json`
- `config/backtest/universes/long-run-jp-50.json`
- `config/backtest/campaigns/long-run-us-entry-sweep-50x3.json`
- `config/backtest/campaigns/long-run-jp-exit-sweep-50x3.json`
- `tests/campaign.test.js`
- `command.md`
- `docs/research/latest/README.md`

## Test and dry-run status

- `npm test`
  - success
- `node --test tests/campaign.test.js`
  - success
- `node scripts/backtest/run-long-campaign.mjs long-run-us-entry-sweep-50x3 --phase smoke --dry-run`
  - success
  - `3 strategies / 10 symbols / 30 runs`
- `node scripts/backtest/run-long-campaign.mjs long-run-jp-exit-sweep-50x3 --phase smoke --dry-run`
  - success
  - `3 strategies / 10 symbols / 30 runs`

## Live execution block

- attempted readiness checks:
  - `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status`
  - `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status`
- result:
  - both failed with `CDP connection failed after 5 attempts: fetch failed`
  - raw HTTP probe to `172.31.144.1:9223/9225` returned `Recv failure: Connection reset by peer`
- consequence:
  - smoke / pilot / full の live run は未実施
  - current session では config/test/doc readiness までを完了とし、execution は environment unblock 後に再開する

## Next step when environment recovers

1. `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status`
2. `TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9225 node src/cli/index.js status`
3. US / JP の smoke を実行
4. pilot -> full -> recovery
5. results docs と latest handoff を追記して commit / push
