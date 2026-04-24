# Night Batch campaign artifact 修正計画

## 背景

`run-long-campaign.mjs` は `artifacts/campaigns/<campaign>/<phase>/recovered-summary.json` を自動生成しているが、`Night Batch Self Hosted` workflow は `artifacts/night-batch/roundXX` だけを upload artifact 対象にしている。  
そのため、run 64 のような US 単独 campaign では、性能比較に必要な `recovered-summary.json` が GitHub artifact に含まれず、事後比較を確実に行えない。

また、`python/night_batch.py` の current summary 再生成は US/JP 両方の `recovered-results.json` が揃う前提であり、US 単独 campaign の比較結果を current summary として自動露出する設計にはなっていない。

## 変更対象ファイル

- `.github/workflows/night-batch-self-hosted.yml`
- `scripts/windows/github-actions/find-night-batch-outputs.ps1`
- `python/night_batch.py`
- `tests/windows-run-night-batch-self-hosted.test.js`
- `tests/night-batch.test.js`
- 必要なら `docs/reports/night-batch-self-hosted-run64.md`

## 実装内容と影響範囲

- night batch artifact に campaign の `recovered-summary.json` / `recovered-results.json` / `final-results.json` を確実に含める
- workflow summary から campaign summary 位置を追えるようにする
- US 単独 campaign でも「性能比較に必要なファイル」が artifact 側に残ることを担保する
- 必要なら run64 レポートの「性能未確定」表現を、取得後の確定値に更新する

## 実装ステップ

- [ ] RED: campaign summary artifact が round artifact に含まれることを要求するテストを追加する
- [ ] RED: `find-night-batch-outputs.ps1` または night batch 側 summary に campaign summary 位置が露出されることを要求するテストを追加する
- [ ] GREEN: night batch 実行後に対象 campaign の summary/result 一式を round dir へコピーまたは同梱する最小修正を入れる
- [ ] GREEN: workflow upload 対象から確実に取得できるよう出力 discovery を更新する
- [ ] REFACTOR: summary / report 参照導線を整理し、US 単独 campaign の比較根拠が残る状態にする
- [ ] テストを実行して回帰がないことを確認する
- [ ] run64 の artifact 取得導線で性能比較ができることを確認する

## 期待結果

- GitHub Actions artifact を download すれば、`selected-us40-10pack/full/recovered-summary.json` を含む campaign summary 一式に直接アクセスできる
- 以後の run では、execution 成功だけでなく performance 比較も artifact だけで再現できる
