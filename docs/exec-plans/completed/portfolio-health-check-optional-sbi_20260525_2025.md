# portfolio-health-check-optional-sbi_20260525_2025

## 概要

目的: `Portfolio Health Check` workflow を、**デフォルトでは moomoo のみ実行し、workflow_dispatch のオプションで SBI を有効化したときだけ SBI 処理も後段で実行する**形へ変更する。

- 既存の取得ロジック・解析ロジックは維持する
- 実行順は `moomoo -> SBI (enable 時のみ) -> 最終レポート/artifact/publish` に揃える
- デフォルトでは SBI 関連 step を skip し、moomoo だけで成功判定まで到達できるようにする

## 変更ファイル

- 追加: `docs/exec-plans/completed/portfolio-health-check-optional-sbi_20260525_2025.md`
- 変更: `.github/workflows/portfolio-health-check.yml`
- 変更: `scripts/portfolio/build-unified-portfolio-report.mjs`
- 変更: `tests/sbi-portfolio-report.test.js`

## 実装方針

- workflow_dispatch に `enable_sbi` input を追加し、default は `'false'` にする
- workflow の順序を `Run Moomoo read-only portfolio diagnostics` → `Validate Moomoo diagnostics output` → `SBI step 群 (if: enable_sbi == true)` へ組み替える
- unified report builder には **SBI optional の薄い分岐**だけ追加し、SBI 無効時は moomoo-only のヘルスレポートを生成できるようにする
- SBI 有効時の既存 report 内容はそのまま維持し、既存 capture / parse / report ロジックは変更しない
- artifact / publish は、SBI が無効なときでも moomoo と unified report だけで成立するように path 構成を見直す

## 範囲

### In scope

- `Portfolio Health Check` workflow の input 追加
- workflow step 順序の `moomoo first` への変更
- SBI step 群の conditional 実行
- SBI 無効時の unified report 生成サポート
- 関連テスト更新

### Out of scope

- SBI capture ロジックそのものの変更
- moomoo diagnostics ロジックそのものの変更
- publish script の一般化や別 workflow への横展開
- artifact 内容の大規模整理

## 実装ステップ

- [x] 現在の workflow と unified report builder の SBI 必須前提を特定する
- [x] workflow_dispatch input と step 条件を追加し、moomoo -> SBI(optional) の順へ並べ替える
- [x] unified report builder に SBI optional 分岐を追加する
- [x] workflow / report builder の回帰テストを追加・更新する
- [x] 対象テストを実行して、SBI on/off 両方の契約が崩れていないことを確認する

## テスト戦略

- RED: workflow input / step order / SBI optional report の期待値をテストへ追加し、現状 fail させる
- GREEN: workflow と report builder に最小変更を入れて、moomoo-only と SBI+moomoo の両方を通す
- REFACTOR: 条件分岐を整理しつつ、既存の SBI 有効時レポート内容は維持する

## 検証コマンド

- `npm run test:sbi-portfolio-report`
- `npm test`

## リスク・注意点

- 現在の unified report builder は `sbiData.assetsSummary` 前提なので、SBI 無効時にそのままでは落ちる
- artifact / publish path が SBI capture dir を常に前提にしているため、無効時の欠損許容を明示しないと後段が壊れる可能性がある
- workflow の step 順変更で、既存の成功失敗境界を崩さないよう `Validate Moomoo diagnostics output` と SBI conditional steps の関係を丁寧に保つ必要がある
- `npm test` には `tests/sbi-portfolio-report.test.js` が含まれていないため、対象テストは別途明示実行する

## 完了条件

- `Portfolio Health Check` workflow に SBI 有効/無効の input が追加される
- default 実行では moomoo のみ走り、SBI step は skip される
- `enable_sbi=true` のときだけ SBI capture/report が moomoo の後で走る
- 最終 report / success-failure 判定は SBI off でも成立する
- SBI on の既存 report ロジックは維持される

## 実施結果

- `portfolio-health-check.yml` に `enable_sbi` input を追加し、default を `'false'` にした
- workflow の順序を `moomoo -> SBI(optional) -> unified report -> publish` へ変更した
- SBI step 群は `if: ${{ inputs.enable_sbi == 'true' }}` で guarded にし、default では skip されるようにした
- unified report builder に `--skip-sbi` と moomoo-only report 分岐を追加し、SBI off でも最終 report を生成できるようにした
- publish step は SBI off のとき `SBI_CAPTURE_OUTPUT_DIR` を渡さず、moomoo JSON と unified report だけを同期するようにした
- `tests/sbi-portfolio-report.test.js` に moomoo-only report と workflow 契約テストを追加した
- `npm run test:sbi-portfolio-report` と `npm test` はともに通過した
