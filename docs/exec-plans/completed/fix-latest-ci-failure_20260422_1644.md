# 最新 CI 失敗修正計画

作成日時: 2026-04-22 16:44 JST

## 目的

最新の GitHub Actions 失敗 run `24765285988`（`CI`, push, `main`, SHA `a1bc0787e3599af1688734b4763e7fafebabc733`）を解消し、再度 `main` 上で CI が通る状態に戻す。

現時点の高確度な根因は、`tests/campaign.test.js` が `theme-momentum-us40-3pack` campaign の存在を前提にした 2 テストを持っている一方で、対応する設定ファイル `config/backtest/campaigns/current/theme-momentum-us40-3pack.json` が repo に存在しないこと。

## 既存 active plan との関係

- `night-batch-readiness-stabilization_20260416_1706.md`
- `night-batch-summary-and-storage-followup_20260420_1123.md`

上記 2 件は night batch readiness / summary 周辺が主対象で、今回の `tests/campaign.test.js` 起因の CI failure とは直接競合しない。差分は最小に保つ。

## 変更・確認対象ファイル

- 変更: `tests/campaign.test.js`
- 確認: `config/backtest/campaigns/current/public-top10-us-40x10.json`
- 確認: `config/backtest/campaigns/current/selected-us40-8pack.json`
- 確認: `docs/exec-plans/completed/fix-us-only-bundle-and-preset-timeout_20260421_1951.md`
- 確認: `docs/exec-plans/completed/night-batch-selected-us40-8pack_20260422_1555.md`

必要になった場合のみ追加で検討:

- `config/backtest/campaigns/current/theme-momentum-us40-3pack.json`

ただし現時点では、未実装 campaign を新規追加するより、誤って先行追加されたテスト期待値を現状仕様へ戻す方針を第一候補とする。

## 実装内容と影響範囲

- `tests/campaign.test.js`
  - `selected-us40-8pack` 追加と同時に混入した `theme-momentum-us40-3pack` 前提のテスト 2 件を見直す
  - 現行 repo で実在する campaign のみを CI が期待するようにする
- 影響範囲
  - GitHub Actions `CI`
  - `npm run test:ci` で実行される `tests/campaign.test.js`
  - campaign 設定の回帰確認

## 方針

1. 最新失敗の RED はすでに GitHub Actions 上で再現済み
   - failing tests:
     - `loads theme-momentum-us40-3pack config with a 40 x 3 matrix`
     - `uses SPY-only smoke for theme-momentum-us40-3pack so each strategy is checked once`
2. `theme-momentum-us40-3pack` は履歴上も config 未追加で、直近計画でも「今回は実装継続を含めない」と整理されているため、まずはテスト期待値の過剰追加と判断する
3. 実装修正は `tests/campaign.test.js` の最小差分に限定し、既存の `public-top10-us-40x10` と `selected-us40-8pack` の検証は維持する

## TDD / 検証戦略

### RED

- 既存の最新失敗 run `24765285988` を RED として扱う
- ローカルでも `tests/campaign.test.js` を実行し、同じ 2 テストが失敗することを確認する

### GREEN

- `tests/campaign.test.js` の `theme-momentum-us40-3pack` 前提テストを現状仕様に揃えて修正する
- `selected-us40-8pack` と `public-top10-us-40x10` の期待値は維持する

### REFACTOR

- campaign テスト節内の意図が読みやすいよう、現行サポート対象に沿った並びと表現だけ整える
- 挙動変更を伴う campaign 実装追加は行わない

### カバレッジ方針

- 既存 CI 対象の `tests/campaign.test.js` と `npm run test:ci` で回帰確認する
- 新しい coverage ツール導入は行わない

## 検証コマンド

```bash
node --test tests/campaign.test.js
```

```bash
npm run test:ci
```

必要に応じて:

```bash
gh run view 24765285988
```

## リスク / 注意点

- もし `theme-momentum-us40-3pack` を本来すぐ使う予定だった場合、テスト削除だけでは将来要件を隠す可能性がある
- そのため、履歴と現行 config を確認したうえで「現時点では未実装」という根拠を保持して進める
- 無関係な night batch workflow や campaign 実装ロジックには触れない

## 実装ステップ

- [ ] 最新失敗 run `24765285988` の failing tests をローカル `tests/campaign.test.js` で再現し、RED を確認する
- [ ] `theme-momentum-us40-3pack` が現行 repo のサポート対象外である根拠を、config 実在状況と直近計画から再確認する
- [ ] `tests/campaign.test.js` を最小修正し、未実装 campaign を要求しない形へ揃える
- [ ] `node --test tests/campaign.test.js` を実行して対象テストを GREEN にする
- [ ] `npm run test:ci` を実行し、CI 相当のローカル回帰確認を行う
- [ ] ロジック破綻・不要な仕様追加がないかをレビューし、結果を報告する

## 完了条件

- `tests/campaign.test.js` の 2 failure が解消される
- `node --test tests/campaign.test.js` が通る
- `npm run test:ci` が通る
- 変更が latest CI failure に直接対応する最小差分に留まっている
