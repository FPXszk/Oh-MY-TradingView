# Exec Plan: expand-live-strategies-to-25_20260415_1237

## 目的

現在の live 15 戦略運用を、**combined-ranking 上位 5 本をベース**にした **25 戦略体制**へ拡張する。
内訳は以下:

- ベース 5 本（固定）
- profit-protection variant 10 本
- entry-adjusted variant 10 本

そのうえで、既存の US / JP 12-symbol long-run campaign を **2000-present** 条件のまま 25 戦略対応へ更新する。

対象のベース 5 本:

1. `donchian-55-18-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-tight`
2. `donchian-55-20-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight`
3. `donchian-55-22-rsp-filter-rsi14-regime-55-hard-stop-8pct-theme-deep-pullback-tight-exit-wide`
4. `donchian-60-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-late`
5. `donchian-50-20-rsp-filter-rsi14-regime-60-hard-stop-8pct-theme-deep-pullback-strict-entry-early`

---

## 変更ファイル

### 変更予定

- `config/backtest/strategy-catalog.json`
- `config/backtest/strategy-presets.json`
- `docs/bad-strategy/retired-strategy-presets.json`
- `docs/bad-strategy/README.md`
- `config/backtest/campaigns/latest/next-long-run-us-12x10.json`
- `config/backtest/campaigns/latest/next-long-run-jp-12x10.json`
- `tests/preset-validation.test.js`
- `tests/strategy-catalog.test.js`
- `tests/strategy-live-retired-diff.test.js`
- `tests/campaign.test.js`
- `tests/repo-layout.test.js`

### 条件付きで変更

以下は、追加する 20 variant が**既存 schema / source generator で表現できない場合のみ**変更する。

- `src/core/preset-validation.js`
- `src/core/research-backtest.js`
- `tests/backtest.test.js`

以下は、campaign ID / filename を `12x10` のまま維持せず `12x25` へ改名する判断になった場合のみ変更する。

- `python/night_batch.py`
- `config/night_batch/bundle-foreground-reuse-config.json`
- `config/night_batch/bundle-detached-reuse-config.json`
- `tests/night-batch.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`
- `docs/command.md`
- `docs/explain-forhuman.md`

### 作成 / 削除

- 新規作成なし（この exec plan を除く）
- 削除なし

---

## スコープ

### In scope

- live preset 集合を 15 → 25 に更新
- 上記 5 ベース戦略を live に固定
- profit-protection 10 本、entry-adjusted 10 本を live 側へ追加
- live / retired / catalog の整合を取り直す
- US / JP latest campaign の `preset_ids` を 25 戦略へ更新
- date window を `from=2000-01-01`, `to=2099-12-31` のまま維持
- count 固定のテスト・説明を 25 戦略前提へ更新
- 必要なら preset schema / research strategy generator を最小変更で拡張

### Out of scope

- US / JP 12-symbol universe の変更
- 2000-present 以外の期間変更
- 26 本以上への追加拡張
- 実 backtest の長時間本番実行そのもの
- unrelated strategy family の整理や大規模リファクタ
- fresh research artifact / report の全面再生成

---

## 実装方針・前提

1. **既定方針**
   - まずは既存 campaign file / ID（`next-long-run-*-12x10`）をそのまま使い、中身だけ 25 戦略化する前提で進める。
   - 理由: 影響範囲を最小にし、night batch / workflow / docs の連鎖変更を抑えるため。

2. **要確認前提**
   - 追加する 20 本の **正確な preset ID 一覧** は実装時に確定させる必要がある。
   - 20 本が既存 `strategy-catalog.json` 内に存在する前提で計画する。
   - もし catalog 外の新規 variant 定義が必要なら、schema / generator / generator test まで拡張する。

3. **count 前提**
   - catalog 総数が現状 131 のままなら、live 25 / retired 106 になる想定。
   - catalog 総数自体が増える場合は、count 固定テストをその実数へ更新する。

---

## 実装チェックリスト

- [ ] 追加対象 20 本の preset ID を確定する
  - [ ] profit-protection 10 本
  - [ ] entry-adjusted 10 本
  - [ ] live 順序を deterministic に決める
- [ ] **RED**: テストを先に 25 戦略前提へ更新する
  - [ ] `tests/preset-validation.test.js`
  - [ ] `tests/strategy-catalog.test.js`
  - [ ] `tests/strategy-live-retired-diff.test.js`
  - [ ] `tests/campaign.test.js`
  - [ ] `tests/repo-layout.test.js`
  - [ ] 必要なら `tests/backtest.test.js`
- [ ] **GREEN**: strategy metadata を更新する
  - [ ] `strategy-catalog.json` の lifecycle を更新
  - [ ] `strategy-presets.json` を 25 live preset に更新
  - [ ] `retired-strategy-presets.json` を更新して overlap を解消
  - [ ] `docs/bad-strategy/README.md` の live/retired 説明を更新
- [ ] **GREEN**: campaign を更新する
  - [ ] `next-long-run-us-12x10.json` の `preset_ids` / description / notes を 25 戦略前提へ更新
  - [ ] `next-long-run-jp-12x10.json` の `preset_ids` / description / notes を 25 戦略前提へ更新
  - [ ] 12 symbol / 2000-present / execution 設定は維持
- [ ] **GREEN**: 必要時のみ schema / generator を最小変更する
  - [ ] `preset-validation.js`
  - [ ] `research-backtest.js`
  - [ ] `backtest.test.js`
- [ ] **REFACTOR**: 重複した expected live ID / count の更新を揃える
- [ ] 既存テスト群を通して影響範囲を確認する
- [ ] campaign ID rename が必要と判明した場合のみ、night-batch / docs / workflow 周辺を別 tranche として広げる

---

## テスト / 検証コマンド

まず変更前ベースライン確認:

- `npm test`

実装後の重点確認:

- `node --test tests/preset-validation.test.js tests/strategy-catalog.test.js tests/strategy-live-retired-diff.test.js tests/campaign.test.js tests/repo-layout.test.js`

generator まで変更した場合の追加確認:

- `node --test tests/backtest.test.js tests/campaign.test.js`

最後の総合確認:

- `npm test`
- `npm run test:all`

※ `npm run test:e2e` は generator / runtime wiring まで変更が波及した場合のみ実施。

---

## 主なリスク

- 追加 20 本の preset ID 未確定だと、deterministic な live list と campaign preset order が確定できない
- `12x10` という campaign 名と実体 25 戦略のズレが将来の運用混乱を生む可能性がある
- variant が既存の stop / exit / entry schema に収まらない場合、`preset-validation.js` と `research-backtest.js` の変更が必要になる
- count 固定テストが多いため、1 箇所更新漏れで広く失敗する可能性がある
- 既存作業ツリーに unrelated 変更があるため、このタスクではそれらに触れないよう注意が必要

---

## 完了条件

- live preset が 25 本になっている
- 5 base + 10 profit-protection + 10 entry-adjusted の構成が JSON 上で確認できる
- live / retired / catalog / campaign の整合が取れている
- 対象テストが通る
- 既存 campaign の 12-symbol / 2000-present 条件が維持されている
