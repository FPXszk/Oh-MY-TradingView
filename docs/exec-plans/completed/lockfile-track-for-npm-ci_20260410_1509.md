# lockfile track for npm ci

## 問題

`Night Batch Self Hosted` workflow の `Install dependencies in WSL workspace` step が `npm ci --silent` で失敗している。原因は `package-lock.json` が Git 管理されておらず、さらに `.gitignore` で除外されているため、runner checkout 後の workspace に lockfile が存在しないこと。

## 方針

- `package-lock.json` を正式に Git 管理へ戻す
- `.github/workflows/night-batch-self-hosted.yml` は変更せず、`npm ci` 前提を維持する
- `.gitignore` の除外設定を最小差分で修正する
- 依存 lockfile 追加後に既存コマンドで再現と解消を確認する

## 変更対象ファイル

- 変更: `.gitignore`
- 追加: `package-lock.json`
- 確認のみ: `.github/workflows/night-batch-self-hosted.yml`
- 参照: `package.json`

## 影響範囲

- GitHub Actions の self-hosted Windows workflow における WSL 依存インストール
- ローカル/runner 上の Node 依存解決の再現性
- アプリ本体の実装や backtest ロジックには影響を広げない

## Out of scope

- workflow 設計変更
- Node / npm バージョン変更
- 依存の意図的な更新
- runner / WSL / TradingView 設定変更

## 実装ステップ

- [ ] `.gitignore` から `package-lock.json` の除外を外す
- [ ] `package.json` と整合する `package-lock.json` を生成または更新する
- [ ] lockfile を Git 追跡対象に追加する
- [ ] `npm ci --silent` が lockfile 前提で成功することを確認する
- [ ] 既存テストを実行し、差分を最小化して確認する

## テスト戦略

### RED

- runner workspace 相当の条件で `package-lock.json` 不在時に `npm ci --silent` が失敗することを再確認する

### GREEN

- lockfile を Git 管理へ戻した状態で `npm ci --silent` を成功させる
- 既存の `npm test` を成功させる

### REFACTOR

- `.gitignore` と lockfile 以外の不要差分を増やさない
- workflow は無変更のまま `npm ci` 前提を維持する

## 検証コマンド

- `npm ci --silent`
- `npm test`
- `git check-ignore package-lock.json`

## リスク

- lockfile 生成時に依存解決結果が広く変わる可能性がある
- 既存 workspace の未コミット変更と混ざらないよう注意が必要

## 既存 active plan との関係

`docs/exec-plans/active/investigate-night-batch-self-hosted-queued_20260410_2307.md` が存在するが、そちらは self-hosted workflow の調査計画であり、今回の変更は lockfile 管理の修正に限定する。workflow 本体を広く触らず、衝突範囲を `.gitignore` と `package-lock.json` に絞る。
