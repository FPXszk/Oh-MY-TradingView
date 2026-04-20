# テスト失敗修正と CI 外部実行導線追加計画

作成日時: 2026-04-21 02:27 JST

## 目的

`npm test` で失敗・タイムアウトしている既存テストを調査し、repository の current/archive 設定とテスト期待値の辻褄を合わせる。

あわせて、全体テストを Codex セッション内で長時間待ち続ける運用を減らすため、GitHub Actions に通常 CI workflow を追加し、Codex は `gh` で結果を確認する運用へ寄せる。

## 調査結果

### `tests/campaign.test.js`

失敗箇所:

- `config/backtest/universes/current/next-long-run-us-12.json` が存在しない
- `config/backtest/universes/current/next-long-run-jp-12.json` が存在しない
- `config/backtest/campaigns/current/next-long-run-us-12x10.json` が存在しない
- `config/backtest/campaigns/current/next-long-run-jp-12x10.json` が存在しない

原因:

- `65d3f6d` で `next-long-run-*12*` 系が `current` から `archive` へ移動された
- しかし `tests/campaign.test.js` と `tests/repo-layout.test.js` は 12x10 が current にある前提のまま
- 一方、`loadCampaign()` は `current -> base -> archive` の順で検索するため、archive にあっても load integration は通っている

### `tests/repo-layout.test.js`

失敗箇所:

- current にあるべき 12x10 campaign / 12 universe がない
- `strongest-overlay-jp-50x9.json` が current と archive の両方に存在
- `long-run-jp-50.json` が current と archive の両方に存在
- current campaign が retired preset を参照している

原因:

- 現行運用では foreground config が `strongest-overlay-*-50x9.json` を参照している
- しかし `strongest-overlay-*-50x9.json` は research-only / retired control を含むため、current policy の「live preset subset」テストと矛盾している
- 12x10 は archive にあるが foreground test は 12x10 を期待している

### `tests/windows-run-night-batch-self-hosted.test.js`

失敗箇所:

- `config/night_batch/bundle-foreground-reuse-config.json` の default campaign が `next-long-run-*-12x10` ではなく `strongest-overlay-*-50x9.json`

原因:

- `65d3f6d` で foreground config が strongest-overlay へ変更されたが、テスト期待値が旧 12x10 のまま

### `tests/night-batch.test.js`

症状:

- `timeout 180 npm test` で `tests/night-batch.test.js` が約179秒後に `Promise resolution is still pending but the event loop has already resolved`
- `timeout 30 node --test --test-name-pattern "night_batch.py CLI|smoke-prod" tests/night-batch.test.js` でもファイル単位で pending

仮説:

- `tests/night-batch.test.js` 内のいずれかの `runPython()` が child process timeout を持たずに待ち続ける
- `smoke-prod` / detached production 系のどれかが foreground child を待つ設計になっており、fake node / detached state fixture と噛み合っていない可能性がある
- まず個別 test name pattern で hanging subtest を特定し、`runPython()` にテスト用 timeout を入れるか、該当 fixture を修正する

### CI 外部実行

- 現在 `.github/workflows/` には `night-batch-self-hosted.yml` のみ
- 通常の `npm test` を push / PR / manual dispatch で回す workflow はない
- GitHub Actions に `ci.yml` を追加すれば、Codex は `git push` 後に `gh run list` / `gh run view` / `gh run watch` で結果だけ確認できる
- ただし RED/GREEN の個別テストは変更直後にローカルで実行する。全体テストだけ CI に寄せる

## 変更・削除・作成するファイル

### 作成

- `.github/workflows/ci.yml`
  - push / pull_request / workflow_dispatch で `npm ci` と `npm test` を実行
  - job timeout を設定し、長時間 hang を CI 側で止める

### 変更

- `tests/campaign.test.js`
  - current file existence 前提の 12x10 tests を、archive 参照または `loadCampaign()` 経由の resolved behavior に合わせる
  - 目的が「load できること」なら direct current path assertion をやめる
- `tests/repo-layout.test.js`
  - current/archive policy を現行運用に合わせる
  - `current` は foreground / live target のみにするのか、archive fallback を許可するのかを明示する
  - retired preset を含む research-only campaign は current に置かないか、テスト側で research-only exception を明示する
- `tests/windows-run-night-batch-self-hosted.test.js`
  - foreground config default の期待値を現行 config と一致させる、または config を 12x10 に戻す
- `config/night_batch/bundle-foreground-reuse-config.json`
  - どちらが現行運用として正しいかに合わせて修正する
  - 調査結果上は tests が 12x10 を期待しているため、まずは 12x10 に戻す案を優先する
- `config/backtest/campaigns/current/`
  - 12x10 を current に戻す、または tests を archive fallback 前提へ変える
- `config/backtest/universes/current/`
  - 12 universe を current に戻す、または tests を archive fallback 前提へ変える
- `config/backtest/campaigns/archive/`
  - current と archive の重複を解消する
- `config/backtest/universes/archive/`
  - current と archive の重複を解消する
- `tests/night-batch.test.js`
  - hanging subtest を特定後、必要なら child process timeout / fixture 修正 / detached wait 条件修正を追加する
- `package.json`
  - 必要なら `test:ci` を追加し、CI で使うテスト対象を明示する
- `docs/exec-plans/active/fix-test-config-and-ci-offload_20260421_0227.md`
  - 実施後に `docs/exec-plans/completed/` へ移動する

### 削除

- 原則なし
- current/archive 重複解消のため、同一 JSON の重複配置は片側から削除する可能性がある

## 実装方針

1. **設定の source of truth を決める**
   - `bundle-foreground-reuse-config.json` は tests / README が示す 12x10 foreground 運用に戻す
   - `next-long-run-*-12x10` campaign と `next-long-run-*-12` universe を current に戻す
   - `strongest-overlay-*-50x9` campaign は retired control を含む research-only として archive に寄せる
   - `long-run-*-50` universe は `strongest-overlay-*-50x9` が archive に寄るなら archive 側に寄せ、current/archive 重複をなくす
2. **night-batch hang を特定する**
   - `tests/night-batch.test.js` を subtest pattern で分割実行
   - hanging subtest の fixture または child timeout を修正
3. **CI offload を追加する**
   - `.github/workflows/ci.yml` を追加
   - `timeout-minutes` を設定
   - 今後の全体テストは push 後に GitHub Actions で確認できるようにする

## 実装ステップ

- [x] RED: `node tests/campaign.test.js` で current 12x10 不在による失敗を確認する
- [x] RED: `node tests/repo-layout.test.js` で current/archive 重複と preset subset 失敗を確認する
- [x] RED: `node tests/windows-run-night-batch-self-hosted.test.js` で foreground config 期待値不一致を確認する
- [x] RED: `timeout 30 node --test --test-name-pattern ... tests/night-batch.test.js` で hanging subtest を特定する
- [x] GREEN: 12x10 campaign / universe を current に戻し、strongest-overlay / long-run-50 の current/archive 重複を解消する
- [x] GREEN: `bundle-foreground-reuse-config.json` を 12x10 foreground default に戻す
- [x] GREEN: `tests/night-batch.test.js` の hang 原因を修正する
- [x] GREEN: `tests/campaign.test.js` / `tests/repo-layout.test.js` / `tests/windows-run-night-batch-self-hosted.test.js` / `tests/night-batch.test.js` を個別に通す
- [x] CI: `.github/workflows/ci.yml` を追加し、`npm test` を GitHub Actions で実行できるようにする
- [x] REFACTOR: current/archive policy と test descriptions を読み直し、不要な例外や曖昧な命名がないか確認する
- [x] 検証: `node tests/campaign.test.js`
- [x] 検証: `node tests/repo-layout.test.js`
- [x] 検証: `node tests/windows-run-night-batch-self-hosted.test.js`
- [x] 検証: `node tests/night-batch.test.js`
- [x] 検証: `npm test` はローカルで一度実行するが、長時間 hang 対策として `timeout 180 npm test` を使う
- [ ] 検証: `gh workflow list` / push 後の `gh run list` で CI workflow を確認する
- [x] レビュー: ロジック破綻、設計原則違反、不要な複雑化がないか確認する
- [x] コミット前: 本計画を `docs/exec-plans/completed/` に移動する
- [ ] コミット: Conventional Commits 形式でコミットする
- [ ] プッシュ: `main` を SSH 経由で `origin/main` にプッシュする

## 実施結果

- `next-long-run-*-12x10` campaign と `next-long-run-*-12` universe を `current` に戻した
- `strongest-overlay-*-50x9` campaign と `long-run-*-50` universe の current/archive 重複を解消し、archive 側に集約した
- `bundle-foreground-reuse-config.json` の foreground default を `next-long-run-*-12x10` に戻した
- `tests/night-batch.test.js` に child process timeout と localhost listen failure skip を追加し、sandbox 上の hang を防いだ
- `tests/night-batch.test.js` の detached state file をテスト一時ディレクトリへ隔離し、追跡済み artifact を更新しないようにした
- `.github/workflows/ci.yml` を追加し、push / pull_request / manual dispatch で `npm ci` と `npm test` を実行できるようにした
- `timeout 180 npm test` は 35 tests / 35 pass で成功した

## テスト戦略

- TDD は失敗中テストを RED として扱う
- 設定ファイルの移動・復元は、直接 path assertion と `loadCampaign()` integration の両方で確認する
- `night-batch` は hanging subtest を特定してから最小修正する
- 全体テストはローカル確認に加え、追加する CI workflow でも確認する

## CI 運用案

- 個別変更の RED/GREEN はローカルで短く回す
- `npm test` のような全体テストは GitHub Actions に逃がす
- Codex は push 後に次を使って結果だけ見る

```bash
gh run list --workflow ci.yml --limit 5
gh run view <run-id> --log-failed
```

これにより、Codex セッション内で長時間待つ時間を減らせる。

## リスクと注意点

- 12x10 を current に戻すと、`65d3f6d` の strongest-overlay foreground 運用変更を戻すことになる
- ただし現行 tests / README / foreground config test は 12x10 を正と見ているため、今回はテスト整合性を優先する
- GitHub Actions の `npm test` は現在失敗するため、修正後に green になる前提で追加する
- CI 追加は GitHub 上の minute / runner resources を使う

## スコープ外

- TradingView 実機 E2E の追加
- night-batch self-hosted workflow の本番実行
- 戦略そのものの優劣判断
- Codex / Copilot 起動経路の追加変更
