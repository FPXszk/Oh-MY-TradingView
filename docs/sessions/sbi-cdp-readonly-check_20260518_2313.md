# Session Log 20260518_2313

## Summary

CDP 用 Chrome を read-only で確認し、`127.0.0.1:9222` の endpoint 応答と `json/list` から SBI タブが見えることを確認した。重い操作や click はしていない。Windows から local 最新版 script の dry-run を 1 回だけ実行し、SBI target が正しく選ばれるところまで確認できた。

## User Request

- CDP で動かせること、読み取れることだけ確認したい
- 重い作業は不要
- session log を残して次セッションに行きたい

## Plan Commit

- `a8584d0 docs:sbi-cdp-readonly-check_20260518_2313`

## What Was Verified

### Endpoint probe

Windows PowerShell から:

- `http://127.0.0.1:9222/json/version` -> success
- `http://127.0.0.1:9222/json/list` -> success

確認結果:

- Browser: `Chrome/148.0.7778.168`
- Protocol-Version: `1.3`
- WebSocket debugger URL が返る

### Current target list

`json/list` では少なくとも次が見えた。

- page: `SBI証券｜株・FX・投資信託・確定拠出年金・NISA`
  - URL: `https://site1.sbisec.co.jp/ETGate/`
- page: `https://cdn.d2-apps.net/html/frame.html#...`
- service worker: Keepa extension
- service worker: Codex extension background

重要点:

- dedicated CDP Chrome 側に **SBI タブが実際に載っている**

### Read-only dry-run

Windows から local 最新版 script を `--dry-run` で実行。

結果:

- `target_title`: `SBI証券｜株・FX・投資信託・確定拠出年金・NISA`
- `target_url`: `https://site1.sbisec.co.jp/ETGate/`
- `endpoint_reachable`: `true`
- `target_count`: `4`
- notes: `Dry-run mode: target probe only.`

確認できたこと:

- endpoint は見える
- SBI tab は pick できる
- 今回は dry-run のため click / navigation / download は未実施

## Important Interpretation

- CDP bootstrap は成立済み
- dedicated CDP Chrome に SBI tab を載せるところまで進んだ
- 今の段階で次セッションからは、軽い capture 実行へ進める
- まだ `current-page` / `every-asset-page` の保存や CSV 試行はしていない

## Exact Next Step

1. 同じ dedicated CDP Chrome を維持したまま dry-run ではない local capture を試す
2. `current-page` と `every-asset-page` が保存されるか確認する
3. 必要最小限で CSV ボタン候補や「毎資産」導線候補を確認する
4. その結果をもとに workflow の `dry_run=false` へ進む

## Notes

- 今回は read-only 確認だけなので click / download はしていない
- WSL から `127.0.0.1:9222` へは引き続き未到達のため、Windows 側実行で確認した
