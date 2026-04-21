# Preset Scoped Failure Budget 計画

作成日時: 2026-04-21 16:31 JST

## 目的

連続失敗時に campaign 全体を打ち切る現行挙動を改め、**問題のある preset だけを打ち切って残りの preset / symbol は最後まで実行**できるようにする。

具体的には、`max_consecutive_failures` の適用範囲を campaign-global ではなく preset-local に変更し、bundle 実行中に変な戦略が混じっていても他戦略の探索を継続できるようにする。

## 現時点の確認結果

- 現行の abort は `scripts/backtest/run-long-campaign.mjs` 内で worker ごとの `consecutiveFailures` を増やし、しきい値到達で `aborted = true` にして campaign 全体を止めている
- 現行設定 `execution.max_consecutive_failures` の validation は `src/core/campaign.js` にある
- 最新 `public-top10-us-40x10` full は `tv-public-brosio-break-and-retest` の 5 連続失敗で `245 runs` で abort した
- ユーザー要件:
  - 問題 preset があっても他の戦略は最後まで回したい
  - 既存結果を残しつつ、今後は preset 単位で failure budget を消費させたい

## 変更・確認対象ファイル

- 作成: `docs/exec-plans/completed/preset-scoped-failure-budget_20260421_1631.md`
- 変更予定: `scripts/backtest/run-long-campaign.mjs`
- 変更予定: `src/core/campaign.js`
- 変更予定: `tests/campaign.test.js`
- 変更予定: `tests/night-batch.test.js` または campaign 実行系テスト
- 変更候補: `docs/reports/night-batch-public-vs-strongest.md`
- 変更候補: `docs/reports/night-batch-self-hosted-run17.md`

## 実装内容と影響範囲

- 実行制御
  - `max_consecutive_failures` を preset 単位に適用する
  - ある preset が N 連敗したら、その preset の残り runs は queue から除外する
  - campaign 自体は継続し、他 preset は最後まで回す
- 結果記録
  - `final-results.json` / `recovered-results.json` / `recovered-summary.json` に、failure budget 到達で除外された preset が分かる情報を残す
  - 必要なら `skipped_due_to_failure_budget` のような明示状態を導入する
- rerun 制御
  - failure budget 到達済み preset を rerun queue に再投入しない
- 設定/validation
  - 現行の `execution.max_consecutive_failures` は流用するか、必要なら `execution.failure_budget_scope` を追加する
  - 初期段階では scope を固定で `preset` に寄せ、設定追加を最小化する案を優先検討する

## 実装ステップ

- [ ] 現行の `run-long-campaign.mjs` の failure counter と rerun queue 構築を読み、preset 単位へ落とし込む設計を確定する
- [ ] RED: `tests/campaign.test.js` または実行系テストに、ある preset が連続失敗しても他 preset の runs は継続される失敗テストを追加する
- [ ] RED: failure budget 到達 preset が rerun queue に再投入されないことを表す失敗テストを追加する
- [ ] RED: summary / result payload に除外 preset 情報が残ることを表す失敗テストを追加する
- [ ] GREEN: `scripts/backtest/run-long-campaign.mjs` を最小変更し、preset ごとに連続失敗を数えて停止対象を絞る
- [ ] GREEN: 必要なら `src/core/campaign.js` の validation を更新する
- [ ] REFACTOR: summary / payload 名称、skip reason、abort フラグの意味を整理し、campaign-global abort と preset-local skip を区別できるようにする
- [ ] 検証: 対象テストを実行して green を確認する
- [ ] 検証: 影響範囲として `tests/night-batch.test.js` か `npm run test:ci` の必要範囲を実行する
- [ ] REVIEW: queue 取り回し、checkpoint resume、rerun 判定、結果集計にロジック破綻がないか見直す
- [ ] COMMIT/PUSH: 承認後の実装完了時に Conventional Commits 形式で `main` へ反映する

## テスト戦略

- RED
  - preset A が連続失敗しても preset B の runs は完走することを先に固定する
  - failure budget 到達 preset が rerun 対象に再混入しないことを固定する
  - summary に除外 preset 情報が残ることを固定する
- GREEN
  - 実装を最小変更してテストを通す
- REFACTOR
  - payload とログの表現を整理し、運用時に「campaign abort」と「preset skip」を見分けやすくする

## 検証コマンド候補

- `node --test tests/campaign.test.js`
- `node --test tests/night-batch.test.js`
- `npm run test:ci`

## リスクと注意点

- checkpoint / fingerprint は matrix 自体が同じでも、effective results の扱いが変わるため resume 時の期待値がずれる可能性がある
- `aborted` を単純な boolean のまま使うと「campaign 全体 abort」と「一部 preset を budget skip しただけ」を区別できず誤読を招く
- 既存の bundle / night batch summary が `failure count` のみを見ている場合、preset-local skip 情報が埋もれる可能性がある
- 既存 active plan
  - `night-batch-readiness-stabilization_20260416_1706.md`
  - `night-batch-summary-and-storage-followup_20260420_1123.md`
  と近接するため、今回は failure budget の実行制御に限定する

## スコープ外

- public campaign からの preset 恒久除外
- workflow dispatch の追加自動化
- 新しい strategy ranking ロジックの導入
