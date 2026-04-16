# Self-hosted runner autostart error triage

## Problem

`docs/command.md` 末尾に貼られた Windows 実行ログでは、self-hosted runner の autostart 登録時に以下 3 系統の異常が見えている。

1. バッチ先頭コメント付近が文字化けし、`'楳笏...'` などがコマンドとして誤解釈されている
2. `wrapper not found` により `run-self-hosted-runner-with-bootstrap.cmd` を見つけられない
3. `schtasks /Create` が `無効な引数またはオプションです - 'C:\actions-runner'` で失敗している

Task Scheduler の設定を壊れにくくし、Windows 側で runner が安定起動できる状態にするため、原因を切り分けたうえで必要な script / docs / test を修正する。

## Approach

- `docs/command.md` のエラーログと既存 Windows script の実装を突合し、3 事象を分離して原因を特定する
- RED -> GREEN -> REFACTOR で、ASCII-safe・`schtasks /TR` quoting・wrapper path 解決の回帰テストを追加する
- 必要に応じて `register-self-hosted-runner-autostart.cmd` と関連 wrapper を修正し、README / `docs/command.md` の運用手順も更新する

## Files in scope

- `scripts/windows/register-self-hosted-runner-autostart.cmd`
- `scripts/windows/run-self-hosted-runner-with-bootstrap.cmd`
- `scripts/windows/bootstrap-self-hosted-runner.cmd`
- `tests/windows-run-night-batch-self-hosted.test.js`
- `README.md`
- `docs/command.md`

## Out of scope

- Windows OS 側 auto-logon 設定そのもの
- GitHub Actions workflow 本体の変更（script/doc/test だけで説明できない場合を除く）
- runner PC 上の権限・ネットワーク・AV 干渉など repo 外の恒久対策

## Risks

- Windows cmd / PowerShell / Task Scheduler で quoting と文字コードの解釈差があり、Linux 側の静的確認だけでは取りこぼしが出る可能性がある
- live checkout が古い場合、repo 修正だけでは Windows 実機の症状が再現しない可能性がある
- 自動起動の成立には repo script だけでなく Windows 側の task registration 成功が必須

## Validation

- `node --test tests/windows-run-night-batch-self-hosted.test.js`
- `npm test`
- Windows 実機確認:
  - `scripts\windows\register-self-hosted-runner-autostart.cmd C:\actions-runner`
  - `schtasks /Query /TN "OhMyTradingViewRunnerAutostart" /V /FO LIST`
  - `scripts\windows\run-self-hosted-runner-with-bootstrap.cmd C:\actions-runner`

## Steps

- [ ] `docs/command.md` 末尾ログと script 実装を突合し、文字化け / wrapper not found / schtasks invalid argument を個別に切り分ける
- [ ] RED: `tests/windows-run-night-batch-self-hosted.test.js` に ASCII-safe・`/TR` quoting・wrapper path の失敗再現テストを追加する
- [ ] GREEN: Windows script を最小修正してテストを通す
- [ ] REFACTOR: docs の手順とエラー切り分けを更新し、運用上の注意点を明文化する
- [ ] 既存 test command を流し、必要なら Windows 実機で再登録・再起動手順を案内する
