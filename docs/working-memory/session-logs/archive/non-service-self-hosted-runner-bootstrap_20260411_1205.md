# non-service-self-hosted-runner-bootstrap_20260411_1205

## Summary

- Windows self-hosted runner は **service mode を採用しない** 方針を `README.md` と `docs/command.md` に明文化した。
- runner 起動前の prerequisite fix を repo 管理下に寄せるため、`bootstrap-self-hosted-runner.cmd` と `run-self-hosted-runner-with-bootstrap.cmd` を追加した。
- `scripts/windows/run-night-batch-self-hosted.cmd` は night batch 実行専用の責務のまま維持し、runner 起動責務と分離した。
- `.github/workflows/night-batch-self-hosted.yml` 自体は service 常駐を要求しておらず、**online な self-hosted Windows runner** 前提で整合していることを確認した。

## Files

- Added: `scripts/windows/bootstrap-self-hosted-runner.cmd`
- Added: `scripts/windows/run-self-hosted-runner-with-bootstrap.cmd`
- Added: `docs/working-memory/session-logs/non-service-self-hosted-runner-bootstrap_20260411_1205.md`
- Modified: `README.md`
- Modified: `docs/command.md`
- Modified: `tests/windows-run-night-batch-self-hosted.test.js`

## Operational notes

- one-time manual hookup として、従来の `C:\actions-runner\run.cmd` 直接実行を `scripts\windows\run-self-hosted-runner-with-bootstrap.cmd C:\actions-runner` に置き換える前提にした。
- bootstrap は `C:/actions-runner/_work/Oh-MY-TradingView/Oh-MY-TradingView` を `git safe.directory` に追加し、`actions/checkout@v4` の dubious ownership 再発を抑止する。
- bootstrap の更新は repo 側 script 修正で追従できるが、runner 起動入口の one-time manual hookup 自体は Windows ホスト側で必要なまま。

## Validation

- `node --test tests/windows-run-night-batch-self-hosted.test.js`
- `npm test`

## Notes

- historical な exec plan には service 化前提の検討が残っているが、現行運用方針では採用しない。
- 実装完了後は exec plan を `docs/exec-plans/completed/` へ移して commit / push する。
