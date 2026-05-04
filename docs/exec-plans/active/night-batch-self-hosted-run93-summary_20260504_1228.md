# Night Batch Self Hosted Run 93 結果まとめ計画

## 目的

Night Batch Self Hosted `#93` の GitHub Actions artifact を取得し、`docs/research/TEMPLATE.md` に従って前回対象結果を研究メモとして整理する。あわせて、今回の検証目的が達成できたか、どのグループが有望だったかを数値ベースで結論づける。

## 変更・作成・削除するファイル

- 作成: `docs/research/night-batch-self-hosted-run93_20260504.md`
  - run #93 の実行概要、Composite Score ランキング、PF ランキング、Top 戦略の銘柄別 breakdown、集中度チェック、除外候補、結論を記録する。
- 更新: `docs/research/manifest.json`
  - 新規レポートを `keep` に追加し、次回 Night Batch の archive 対象にならないようにする。
- 移動: `docs/exec-plans/active/night-batch-self-hosted-run93-summary_20260504_1228.md` → `docs/exec-plans/completed/night-batch-self-hosted-run93-summary_20260504_1228.md`
  - 実装完了後に計画を completed へ移す。
- 削除: なし

## 影響範囲

- ドキュメントのみの変更。
- バックテスト実行ロジック、GitHub Actions workflow、Pine strategy、生成スクリプトには変更を加えない。
- `/tmp` への artifact zip 展開は作業用の一時ファイルのみで、リポジトリには含めない。

## 実装ステップ

- [ ] GHA run #93 を特定する
  - 確認: `Night Batch Self Hosted` の `run_number == 93`、status、run_id、実行日時、campaign_id を確認する。
- [ ] run #93 の artifact を取得して展開する
  - 確認: `strategy-ranking.json` と `recovered-results.json` が存在し、`result.metrics` から銘柄別メトリクスを読めることを確認する。
- [ ] Composite Score を再計算する
  - 確認: `avg_net_profit` 降順、`avg_profit_factor` 降順、`avg_max_drawdown` 昇順の rank 合算で全戦略を並べ、artifact の PF ランクと混同しない。
- [ ] TEMPLATE 準拠のレポートを作成する
  - 確認: `docs/research/TEMPLATE.md` の主要セクションを満たし、サンプル文言や `例:` を残さない。
- [ ] Top 戦略の銘柄集中度と失敗・欠損を確認する
  - 確認: rank-1 と上位戦略の per-symbol breakdown、最大利益銘柄集中度、top3 集中度、成功件数を明記する。
- [ ] 今回目的の達成可否と有望グループを結論づける
  - 確認: パラメータまたは戦略グループ別に、収益・PF・DD・成功率・集中リスクを比較し、採用候補と除外候補を分ける。
- [ ] `docs/research/manifest.json` を更新する
  - 確認: `night-batch-self-hosted-run93_20260504.md` が `keep` に含まれる。
- [ ] 変更内容をレビューする
  - 確認: 数値の整合性、過剰な解釈、TEMPLATE 逸脱、不要なファイル変更がないことを確認する。
- [ ] 計画ファイルを completed に移してコミット・プッシュする
  - 確認: Conventional Commit 形式で main にコミットし、origin/main にプッシュする。

## 成功基準

- `docs/research/night-batch-self-hosted-run93_20260504.md` が追加され、run #93 の結果が TEMPLATE 準拠で読める。
- `docs/research/manifest.json` に新規レポートが追加されている。
- 今回の検証目的が「見れた / 部分的に見れた / 見れなかった」のいずれかで明確に書かれている。
- 有望グループが、Composite Score だけでなく成功率・銘柄集中度・DD を含めて結論づけられている。
- 実装後の変更がコミットされ、リモートへプッシュされている。
