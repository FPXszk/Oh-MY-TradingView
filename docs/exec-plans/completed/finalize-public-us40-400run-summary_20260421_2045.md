# public-top10-us-40x10 400run 最終集計計画

## 変更・作成対象ファイル

- 作成: `docs/reports/public-top10-us-40x10-final-400run.md`
- 参照: `docs/reports/night-batch-self-hosted-run17.md`
- 参照: `/tmp/night-batch-24718820173/night-batch-24718820173-1/gha_24718820173_1-summary.json`
- 参照: `artifacts/campaigns/public-top10-us-40-brosio-tail35/full/checkpoint-20.json`
- 参照: `artifacts/campaigns/public-top10-us-40-brosio-tail35/full/checkpoint-15.json`

## 実装内容と影響範囲

- 既存の `public-top10-us-40x10` 本体 365 件結果に、残り 35 件の `tv-public-brosio-break-and-retest` compile failure を最終結果として加算する
- 前回レポートと同じ粒度で、400 run の最終サマリーを Markdown 化する
- この会話返信内でも、最終結論として「どの戦略が強かったか」を短く要約する
- コードや workflow の挙動は変更せず、集計とレポートのみを追加する

## 実装ステップ

- [ ] 365 件の既存結果ソースと、残り 35 件の失敗ソースを読み、最終 400 件の件数を確定する
- [ ] 戦略別・成功失敗別の集計を作り、`tv-public-brosio-break-and-retest` の最終扱いを明示する
- [ ] 前回レポートと同粒度の Markdown レポートを `docs/reports/public-top10-us-40x10-final-400run.md` に作成する
- [ ] 内容をレビューし、`docs/exec-plans/completed/` へ計画を移動する
- [ ] 会話上で、400 run 最終結果と「何が強かったか」を簡潔に返す
