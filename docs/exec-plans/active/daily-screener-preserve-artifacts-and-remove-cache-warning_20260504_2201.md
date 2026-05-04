# Daily Screener Preserve Artifacts And Remove Cache Warning

## Goal

`Daily Fundamental Screener` の self-hosted Windows 実行で、runner checkout 配下の未追跡 `artifacts/` を削除しないようにし、`actions/setup-node` の npm cache 保存警告を出さない。

成功条件:

- `Daily Fundamental Screener` の `actions/checkout@v4` が `clean: false` を明示する
- `Daily Fundamental Screener` が `actions/setup-node@v4` の npm cache を使わない
- 既存の night batch / smoke workflow の `clean: false` 方針は維持する
- daily screener の workflow 方針がテストで固定される

## Current Understanding

- `.github/workflows/night-batch-self-hosted.yml` は `actions/checkout@v4` に `clean: false` を明示している
- `.github/workflows/night-batch-smoke.yml` も `actions/checkout@v4` に `clean: false` を明示している
- `.github/workflows/daily-screener.yml` は `clean` 未指定のため、`actions/checkout@v4` の既定値 `clean: true` で動く
- `Daily Fundamental Screener #5` のログでは checkout 開始時に `artifacts/...` が削除されていた
- 同 run の警告は `actions/setup-node@v4` の npm cache post step が Windows Git 付属 tar 経由で `gzip` を見つけられず失敗したもの
- screener は短時間実行で `npm ci --silent` も軽いため、npm cache を外すのが最小修正

## Files

| File | Action | Purpose |
|---|---|---|
| `.github/workflows/daily-screener.yml` | MODIFY | `actions/checkout@v4` に `clean: false` を追加し、`actions/setup-node@v4` から `cache: 'npm'` を削除する |
| `tests/daily-screener-report.test.js` | MODIFY | daily screener workflow が `clean: false` を使い、npm cache を使わないことを固定する |
| `docs/exec-plans/active/daily-screener-preserve-artifacts-and-remove-cache-warning_20260504_2201.md` | CREATE | 本計画 |

## Scope

In scope:

- daily screener workflow の checkout clean 設定
- daily screener workflow の setup-node cache 設定
- 上記を固定する最小テスト

Out of scope:

- night batch / smoke workflow の実装変更
- backtest 成果物保存方式の再設計
- Node.js 20 actions deprecation warning の対応
- npm / Git for Windows / gzip の runner 環境変更

## Implementation Steps

- [ ] `tests/daily-screener-report.test.js` に workflow 設定テストを追加する
  - 確認: 現状の `.github/workflows/daily-screener.yml` で `clean: false` 未指定と npm cache 指定により RED になる
- [ ] `.github/workflows/daily-screener.yml` の checkout に `clean: false` を追加する
  - 確認: `C:\actions-runner\_work\Oh-MY-TradingView\Oh-MY-TradingView\artifacts` 配下の未追跡ファイルを checkout が削除しない設定になる
- [ ] `.github/workflows/daily-screener.yml` の setup-node から `cache: 'npm'` を削除する
  - 確認: `Post Run actions/setup-node@v4` の npm cache 保存処理が発生しない設定になる
- [ ] 対象テストを実行する
  - 確認: `node --test tests/daily-screener-report.test.js`
- [ ] workflow 設定を目視レビューする
  - 確認: night batch / smoke の既存 `clean: false` には触れていない

## Validation Commands

```bash
node --test tests/daily-screener-report.test.js
```

必要なら実行後確認:

```bash
gh workflow run daily-screener.yml --ref main
gh run list --workflow daily-screener.yml --limit 1
```

## Risks

- `clean: false` により daily screener の checkout に古い未追跡ファイルが残る。ただし screener の出力対象は `docs/reports/screener/daily-ranking.md` に限定されており、今回の目的である runner-local artifacts 保持を優先する
- npm cache を外すと初回依存インストールは少し遅くなる可能性がある。ただし cache 保存警告を消すための最小修正として妥当
- Node.js 20 actions deprecation warning は別件で残る可能性がある。これは GitHub Actions 側の Node ランタイム移行警告で、今回の `gzip` cache warning とは別物
