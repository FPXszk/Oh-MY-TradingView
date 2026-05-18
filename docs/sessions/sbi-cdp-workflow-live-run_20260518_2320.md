# Session Log 20260518_2320

## Summary

`SBI Portfolio Capture` workflow を `dry_run=false` で実行し、self-hosted Windows runner 上で success まで完了した。CDP endpoint probe、SBI tab 選択、「毎資産」系ページの capture、CSV ダウンロード、artifact upload まで通った。

## User Request

- session locker の続きとして、CDP で操作できる前提になったので workflow を試す
- 指示書ベースで現在の再開地点を思い出して、そのまま進める

## What We Remembered

直前の durable 状態は `docs/sessions/sbi-cdp-readonly-check_20260518_2313.md` にあり、そこでは以下まで確認済みだった。

- `127.0.0.1:9222` の CDP endpoint は Windows 側から応答する
- dedicated CDP Chrome 側に SBI タブが実在する
- `--dry-run` では target pick が成功する

今回の next step は、そのまま non-dry-run の capture を回し、必要なら GitHub Actions workflow へ進む段階だった。

## Plan Commit

- `5a52a3f docs:sbi-cdp-workflow-live-run_20260518_2320`

## Workflow Run

- workflow: `SBI Portfolio Capture`
- run id: `26039529158`
- URL: <https://github.com/FPXszk/Oh-MY-TradingView/actions/runs/26039529158>
- conclusion: `success`

## Verified From Run Log

### Endpoint Probe

- `http://127.0.0.1:9222/json/version` -> success
- `http://127.0.0.1:9222/json/list` -> success
- Browser: `Chrome/148.0.7778.168`
- Protocol-Version: `1.3`
- target count: `4`

### Capture Result

- `success: true`
- `endpointReachable: true`
- `targetTitle: SBI証券｜株・FX・投資信託・確定拠出年金・NISA`
- `targetUrl: https://site1.sbisec.co.jp/ETGate/`
- `everyAssetCaptured: true`
- `csvDownloadSuccess: true`
- downloaded file:
  - `downloads\\New_file.csv`

### Artifact

- artifact name: `sbi-portfolio-capture-26039529158`
- artifact には少なくとも以下が含まれる
  - `capture-summary.json`
  - `capture-summary.md`
  - `current-page.json`
  - `current-page.txt`
  - `every-asset-page.json`
  - `every-asset-page.txt`
  - `downloads/New_file.csv`
  - `targets.json`

## Important Interpretation

- 以前の blocker だった「CDP endpoint 不在」は解消済み
- dedicated CDP Chrome に SBI タブが載っており、workflow から正しく選べている
- `dry_run=false` でも capture と CSV ダウンロードが通ったため、repo に入れた SBI capture workflow は現時点で実運用可能ラインに達した

## Remaining Notes

- GitHub Actions log には Node.js 20 action deprecation warning が出ているが、今回の run failure ではない
- どの CSV が `New_file.csv` として落ちたかの業務解釈や、複数 CSV 導線の取り込み強化は今回未対応
