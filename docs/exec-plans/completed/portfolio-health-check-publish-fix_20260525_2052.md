# portfolio-health-check-publish-fix_20260525_2052

## 概要

目的: `Portfolio Health Check` workflow の publish step failure を最小修正し、`enable_sbi=false` / `enable_sbi=true` の両方を live 実行で green まで確認する。

- 既知不具合: `Publish portfolio health report to WSL main` で `sync-portfolio-reports-to-wsl.ps1` へ `-RelativePaths $relativePaths` を渡した際、PowerShell が配列を positional 引数として解釈して失敗する
- 変更対象は publish step の引数渡しに限定し、SBI / moomoo の取得ロジック自体は変更しない

## 変更ファイル

- 追加: `docs/exec-plans/completed/portfolio-health-check-publish-fix_20260525_2052.md`
- 変更: `.github/workflows/portfolio-health-check.yml`
- 変更: `tests/sbi-portfolio-report.test.js`

## 実装方針

- workflow の publish step では `RelativePaths` を script 側既存契約に合わせて **単一のカンマ結合文字列**として渡す
- `sync-portfolio-reports-to-wsl.ps1` 側には手を入れず、既存の `Normalize-RelativePaths` をそのまま活用する
- workflow 契約テストを更新して、publish step が配列そのものではなく join 済み文字列を渡すことを固定する
- 修正後に `Portfolio Health Check` を `enable_sbi=false` / `enable_sbi=true` の 2 本で live rerun し、両方 success を確認する

## 範囲

### In scope

- publish step の引数渡し修正
- workflow 契約テスト更新
- live workflow rerun と結果確認

### Out of scope

- `sync-portfolio-reports-to-wsl.ps1` の設計変更
- SBI / moomoo diagnostics/capture/report ロジックの変更
- artifact 構成変更

## 実装ステップ

- [x] publish failure の最小修正を workflow に入れる
- [x] workflow 契約テストを更新する
- [x] 対象テストを実行する
- [x] `enable_sbi=false` で live rerun し、success を確認する
- [x] `enable_sbi=true` で live rerun し、success を確認する
- [x] 結果を completed plan に記録する

## テスト戦略

- RED: workflow 契約テストで publish step の引数渡し期待値を更新して fail させる
- GREEN: workflow を最小変更で修正し、`npm run test:sbi-portfolio-report` を通す
- VERIFY: GitHub Actions live run を 2 本流し、両方の conclusion が `success` になることを確認する

## 検証コマンド

- `npm run test:sbi-portfolio-report`
- `npm test`
- `gh workflow run "Portfolio Health Check" --ref main`
- `gh workflow run "Portfolio Health Check" --ref main --field enable_sbi=true`
- `gh run watch <run-id>`

## リスク・注意点

- live run 成功時は publish step により `main` へ report 更新 commit が入る可能性がある
- self-hosted runner は 1 台なので rerun は直列実行にする
- SBI enabled run は CDP/ログイン状態に依存する

## 完了条件

- publish step failure が解消される
- `enable_sbi=false` の live run が success になる
- `enable_sbi=true` の live run が success になる
- run URL / conclusion を報告できる

## 実施結果

- `portfolio-health-check.yml` の publish step で `RelativePaths` を配列のまま渡すのをやめ、`$relativePaths -join ','` で script 既存契約に合わせた単一文字列へ変換した
- `tests/sbi-portfolio-report.test.js` に publish step が `relativePathsArg` を使う契約を追加した
- `npm run test:sbi-portfolio-report` と `npm test` は通過した
- 修正 commit は `12eb1e9` (`fix: pass joined portfolio publish paths`)
- live rerun:
  - default (`enable_sbi=false`): run `26399196376` / `success` / https://github.com/FPXszk/Oh-MY-TradingView/actions/runs/26399196376
  - SBI enabled (`enable_sbi=true`): run `26399249803` / `success` / https://github.com/FPXszk/Oh-MY-TradingView/actions/runs/26399249803
- success run では publish step も通り、workflow から `main` へ report 更新 commit が入った
