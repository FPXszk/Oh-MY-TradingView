# self-hosted-runner-foreground-autostart_20260412_0004

## Summary

- detached production が stale になり得ることを確認し、GitHub Actions の `success` と production 完了を一致させるため、night batch workflow を foreground monitoring へ移行した。
- foreground monitoring は commit `2c23e7a` で `night-batch-self-hosted.yml` / `python/night_batch.py` / `scripts/windows/run-night-batch-self-hosted.cmd` / docs / tests を更新して導入した。
- その後、Windows self-hosted runner の Task Scheduler autostart 登録を commit `8cccb48` で追加した。
- autostart script は Windows `cmd.exe` の文字コード問題と `schtasks /Create /TR` の quoting 問題で失敗し得ることが分かり、commit `e4828d7` で hardening した。
- hardening では `.cmd` を ASCII-only に統一し、`.gitattributes` で `*.cmd text eol=crlf` を強制し、`C:\actions-runner\_diag\` 配下に launcher / wrapper copy / bootstrap copy を生成する方式へ変更した。
- `docs/command.md` に貼られた Windows 実行ログでは、`schtasks /Query /TN "OhMyTradingViewRunnerAutostart" /V /FO LIST` の `実行するタスク` が `C:\ACTION~1\_diag\RUNNER~1.CMD`、`状態` が `実行中` であり、`runner-autostart.log` には bootstrap 成功、GitHub 接続、`Listening for Jobs`、`Running job: start-night-batch` が出ている。
- 現在の GitHub 側観測では self-hosted runner `omtv-win-01` は `online / busy`、workflow run `24282322391` の job `start-night-batch` は `in_progress` で、runner 経由の foreground 実行に入っている。

## Key commits

- `2c23e7a feat: monitor night batch to workflow completion`
- `8cccb48 feat: add runner autostart registration`
- `e4828d7 fix: harden runner autostart scripts`

## Files

- `.github/workflows/night-batch-self-hosted.yml`
- `python/night_batch.py`
- `config/night_batch/bundle-foreground-reuse-config.json`
- `scripts/windows/run-night-batch-self-hosted.cmd`
- `scripts/windows/bootstrap-self-hosted-runner.cmd`
- `scripts/windows/run-self-hosted-runner-with-bootstrap.cmd`
- `scripts/windows/register-self-hosted-runner-autostart.cmd`
- `.gitattributes`
- `README.md`
- `docs/command.md`
- `tests/night-batch.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`

## Validation

- `node --test tests/windows-run-night-batch-self-hosted.test.js`
- `npm test`
- `gh api repos/FPXszk/Oh-MY-TradingView/actions/runners --jq '.runners[] | select(.name=="omtv-win-01") | {name: .name, status: .status, busy: .busy, labels: [.labels[].name]}'`
- `gh api repos/FPXszk/Oh-MY-TradingView/actions/runs/24282322391 --jq '{status: .status, conclusion: .conclusion, url: .html_url}'`
- `gh api repos/FPXszk/Oh-MY-TradingView/actions/runs/24282322391/jobs --jq '{total_count: .total_count, jobs: [.jobs[] | {name: .name, status: .status, conclusion: .conclusion, started_at: .started_at, runner_name: .runner_name}]}'`
- Windows 実機:
  - `schtasks /Query /TN "OhMyTradingViewRunnerAutostart" /V /FO LIST`
  - `Get-Content C:\actions-runner\_diag\runner-autostart.log -Tail 100`
  - `wsl -l -v`

## Notes

- 旧 detached 方式で見えていた最新可観測 full 結果は `docs/research/results/campaigns/next-long-run-us-finetune-100x10/full/checkpoint-40.json` までで、`40/1000` 完了、平均 net profit `6255.53`、平均 PF `1.313`、平均 max drawdown `5027.19` だった。以後の detached child は stale state の可能性が高いと整理した。
- foreground workflow では `docs/research/results/night-batch/roundN/bundle-foreground-state.json` の `updated_at` が heartbeat、summary JSON の `termination_reason` / `failed_step` / `last_checkpoint` が切り分け根拠になる。
- hard reboot / power loss では最後の summary / artifact upload が完了しない可能性は残るため、GitHub Actions 上の成功・失敗判定と round-scoped state / summary を合わせて見る。
- `docs/command.md` 末尾の pasted logs は operator が現場で採取して貼り付けた paste transcript として保持する。転記時の先頭欠けがあり得るため、厳密な raw 原本としては扱わない。
