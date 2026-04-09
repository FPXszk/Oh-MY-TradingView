# confluence / community / observability rollout 実装計画

## 目的
既存の `market_symbol_analysis` / `market_confluence_rank` / `experiment-gating` / `campaign artifacts` を壊さず、残っている高優先度項目を **依存順・価値順** に additive に実装する。

優先順は以下の通り。

1. `confluence` を `experiment-gating` / campaign artifacts に統合する
2. `x_*` と `reach_*` を community snapshot layer として統合する（初期は sentiment ではなく件数 / recency / source_presence のみ）
3. provider coverage / error / warning visibility と partial-success regression の観測性・テストを強化する
4. live-run の market / fundamentals / news 欠損を `missing_reason` / `provider_status` で明示し、silent null を減らす
5. 必要な場合に限り `confluence` weight を軽微調整する（固定値・決定論・additive を維持）

---

## overlap / 前提
- `docs/exec-plans/active/` は現時点で空であり、競合する active plan はない。
- 直近で `x_*` / `reach_*` / weak-signal confluence は導入済みのため、今回は **follow-on rollout** として扱う。
- 実装開始前にこの plan をレビュー対象として `docs/exec-plans/active/` に置き、完了時は `docs/exec-plans/completed/` へ移動する。
- 完了時の session log は `docs/working-memory/session-logs/` に残し、最終 push は `main` に行う。

---

## In scope
1. `gated-summary.json` / `ranked-candidates.json` へ `confluence_snapshot` を additive 付与する
2. campaign 実行後に symbol 単位の `market intel snapshot` を使って artifact を enrich する
3. `market_symbol_analysis` / `market_confluence_rank` に provider visibility と community snapshot を additive 付与する
4. community snapshot は初期実装では **directional sentiment を使わず**、以下のみ扱う
   - post / hit count
   - latest observed timestamp
   - source presence (`x`, `reddit`, 必要なら `web/rss/youtube` は presence のみ)
   - warning / partial-success status
5. `market` / `fundamentals` / `news` の missing data を `missing_reason` / `provider_status` / warnings で明示する
6. provider coverage / partial-success の regression test を追加する
7. README / docs / command guide / design reference ledger を更新する
8. 実装完了時に session log を追加し、plan を completed へ移動して commit / push する

## Out of scope
- directional sentiment / polarity 判定
- LLM / agentic reasoning / non-deterministic weighting
- `x_*` / `reach_*` の write 操作
- `reach_*` の full research orchestrator 化
- 新しい market data provider 追加
- CDP 側 observability 機能そのものの拡張
- `market_*` / `x_*` / `reach_*` の namespace 再設計
- browser fallback / daemon / dashboard / DB 永続化

---

## Exact files to create / modify / delete

### Create
- `src/core/market-community-snapshot.js`
  - `x_*` と `reach_*` を query-driven / symbol-driven に集約し、件数・recency・source_presence・warnings を返す pure helper / orchestration を置く
- `src/core/market-provider-status.js`
  - market / fundamentals / news / community の `provider_status` / `missing_reason` / coverage summary を正規化する helper を置く
- `tests/market-community-snapshot.test.js`
  - community snapshot の正常系・partial-success・dependency missing・deterministic normalization を検証する
- `tests/market-provider-status.test.js`
  - `missing_reason` / `provider_status` / coverage summary の pure unit test を置く
- `docs/working-memory/session-logs/confluence-community-observability-rollout_20260409_1334.md`
  - 実装完了時の session log（計画時点では未作成の想定）

### Modify
- `src/core/market-intel-analysis.js`
  - 既存 analysis 出力へ `provider_status` / `community_snapshot` / `provider_coverage_summary` を additive 追加
  - 欠損入力を silent `null` だけで終えず、入力ごとの `missing_reason` を返す
- `src/core/market-intel.js`
  - `rankSymbolsByConfluence(...)` に provider/community 可視化の伝播を追加
  - partial-success / omitted / unranked の warning surface を強化
- `src/core/market-confluence.js`
  - provider/community 情報追加後も additive deterministic で安定するよう score/breakdown を維持
  - 必要時のみ軽微な fixed weight 調整を行う
- `src/core/experiment-gating.js`
  - gate 判定そのものは維持しつつ、`confluence_snapshot` / `community_snapshot` / `provider_status` を artifact 用に enrich できる shape を追加
- `scripts/backtest/run-long-campaign.mjs`
  - campaign 完了後に `market intel snapshots` を集約し、`gated-summary.json` / `ranked-candidates.json` へ additive 反映
  - 必要なら新規 artifact `market-intel-snapshots.json` を出力
- `tests/market-intel-analysis.test.js`
  - provider coverage / missing reason / community snapshot / degraded overall summary の RED を追加
- `tests/market-intel.test.js`
  - `market_confluence_rank` の partial-success / provider visibility / ranking stability 回帰を追加
- `tests/market-confluence.test.js`
  - weight 安定性、community が direction を持たないこと、provider degradation 下でも score が暴れないことを追加
- `tests/experiment-gating.test.js`
  - confluence/community/provider enrichment が gate を壊さず additive で出ることを追加
- `tests/campaign.test.js`
  - campaign artifact path / gating artifact shape / recovery/resume 後の enrichment 安定性を追加
- `tests/observability.test.js`
  - provider coverage / warnings / partial-success 可視化の純粋 helper レベル回帰を追加
- `tests/e2e.observability.test.js`
  - 実地寄りの partial-success regression を補強（既存 e2e surface に合わせて bounded に）
- `package.json`
  - 新規 test file を既存 `test` / `test:all` scripts へ追加
- `README.md`
  - confluence/community/provider visibility の見え方、campaign artifact 追加項目、CLI 確認例を追記
- `docs/DOCUMENTATION_SYSTEM.md`
  - 新しい session log と campaign artifact 導線を必要最小限更新
- `command.md`
  - campaign dry-run / artifact 確認 / market analysis smoke の運用コマンドを追記
- `docs/references/design-ref-llms.md`
  - 今回 actually 採用した external design ideas（community snapshot を directional にしない等）を追記

### Delete
- なし

---

## 実装方針

### 1. confluence は gate override ではなく additive artifact から入る
- 既存の `promote / hold / reject` の deterministic gate を急に置き換えない
- まず `gated-summary.json` と `ranked-candidates.json` に `confluence_snapshot` を追記し、campaign 後の比較材料として使う
- gate 閾値と confluence score を混同しない

### 2. community snapshot は directional sentiment を持たせない
- 初期は `x_search_posts` と Reddit 系検索を中心に、件数・最新時刻・source_presence のみ扱う
- `active / quiet / noisy` のような coarse な coverage note は許容するが、bullish / bearish 判定は入れない
- external auth / rate limit / no-result を `provider_status` と warning に切り分ける

### 3. provider gap は schema-first で見える化する
- 入力オブジェクトは `null` だけで終えず、対応する状態を返す
- 例:
  - `provider_status: 'ok' | 'no_results' | 'provider_error' | 'auth_required' | 'not_configured' | 'skipped' | 'degraded'`
  - `missing_reason: 'fetch_failed' | 'empty_payload' | 'auth_required' | 'not_requested' | 'not_applicable' | 'no_recent_items'`
- `market_symbol_analysis` の top-level warnings と `overall_summary.coverage_summary` を同期させる

### 4. partial-success は success/failure 二値に潰さない
- 1 provider が失敗しても他 provider 成功なら `success: true` を維持しうる
- その代わり warnings / provider_status / degraded marker を必ず返す
- `rankSymbolsByConfluence` や campaign artifacts でもこの contract を維持する

### 5. weight 調整は最後、必要最小限
- 既存の additive deterministic design を維持
- community snapshot は score へ直接加点しない、または入れても coverage/support のみ
- provider visibility 導入後に test が示す歪みがある場合のみ、小さな fixed weight を再設定する

---

## 想定される additive contract

### `market_symbol_analysis`
- `inputs.quote_missing_reason`
- `inputs.fundamentals_missing_reason`
- `inputs.news_missing_reason`
- `analysis.provider_status`
- `analysis.community_snapshot`
- `analysis.overall_summary.provider_coverage_summary`
- `analysis.overall_summary.community_snapshot_summary`

### `market_confluence_rank`
- `ranked_symbols[].provider_status`
- `ranked_symbols[].community_snapshot`
- `unranked[].provider_status` または `missing_reason`
- `warnings` / `failureCount` / `omittedCount` の意味を明確化

### campaign artifacts
- `results/campaigns/<campaign>/<phase>/gated-summary.json`
  - `gated_results[].confluence_snapshot`
  - `gated_results[].community_snapshot`
  - `gated_results[].provider_status`
- `results/campaigns/<campaign>/<phase>/ranked-candidates.json`
  - 各 candidate に同等の additive fields
- `results/campaigns/<campaign>/<phase>/market-intel-snapshots.json`
  - symbol 単位の取得結果と warning 群を保存（必要な場合のみ追加）

---

## TDD 方針（RED → GREEN → REFACTOR）

### Phase 1 — confluence × experiment-gating / campaign artifacts
#### RED
- `tests/experiment-gating.test.js`
  - 既存 gate decision が変わらず、`confluence_snapshot` が additive に付く失敗テスト
  - provider/community 情報が無くても gate が壊れないこと
- `tests/campaign.test.js`
  - recovery/resume 経路でも enrichment artifact が安定する失敗テスト
  - `gated-summary.json` / `ranked-candidates.json` shape が additive で増えること

#### GREEN
- `src/core/experiment-gating.js` を最小変更で拡張
- `scripts/backtest/run-long-campaign.mjs` で market-intel enrichment と artifact 出力を追加

#### REFACTOR
- gate 判定と artifact 整形を分離
- snapshot fetch / merge / write の責務を小さな helper に寄せる

### Phase 2 — community snapshot layer
#### RED
- `tests/market-community-snapshot.test.js`
  - X/Reddit の件数集計
  - latest observed timestamp の正規化
  - source_presence の deterministic shape
  - auth required / no results / provider error の warning 切り分け
  - partial-success でも snapshot 全体は返ること
- `tests/market-intel-analysis.test.js`
  - `analysis.community_snapshot` が additive に付く失敗テスト

#### GREEN
- `src/core/market-community-snapshot.js` を作成
- `src/core/market-intel-analysis.js` から呼び出して snapshot を付与

#### REFACTOR
- count / recency / presence / warnings を pure helper に分離
- `twitter-read` / `reach` の既存 contract を壊さない

### Phase 3 — provider visibility / live-run gap reporting / partial-success regressions
#### RED
- `tests/market-provider-status.test.js`
  - `provider_status` / `missing_reason` / coverage summary の pure test
- `tests/market-intel-analysis.test.js`
  - quote/fundamentals/news 欠損時に silent null で終わらないこと
- `tests/market-intel.test.js`
  - `market_confluence_rank` で unranked / omitted / warning が安定すること
- `tests/observability.test.js`
  - provider coverage / warnings / degraded markers の regression
- `tests/e2e.observability.test.js`
  - partial-success path が落ちないこと

#### GREEN
- `src/core/market-provider-status.js` を作成
- `src/core/market-intel-analysis.js` / `src/core/market-intel.js` に導入

#### REFACTOR
- status 語彙と missing_reason 語彙を 1 箇所に固定化
- warning 生成の重複を削減

### Phase 4 — confluence micro-adjustment（必要時のみ）
#### RED
- `tests/market-confluence.test.js`
  - provider/community 情報追加後も score label が既存期待から不自然に崩れないこと
  - community が directional score へ直接効かないこと

#### GREEN
- `src/core/market-confluence.js` の fixed weight を必要最小限だけ調整

#### REFACTOR
- breakdown / label mapping / coverage penalty の pure helper を整理
- false precision を避ける

### Coverage 方針
- 現状 repo には coverage 専用 script がないため、新規 coverage ツールは追加しない
- 代わりに新規 / 変更対象 (`market-community-snapshot`, `market-provider-status`, `market-intel-analysis`, `experiment-gating`) の主要分岐を unit/integration tests でカバーし、**触った範囲で 80% 以上相当** を満たすようにレビューで確認する

---

## validation commands（既存 repo コマンド中心）

### baseline / regression
- `npm test`
- `npm run test:e2e`
- `npm run test:all`

### focused smoke
- `npm run tv -- market analysis --symbol AAPL`
- `npm run tv -- market confluence-rank AAPL MSFT NVDA --limit 3`
- `node scripts/backtest/run-long-campaign.mjs external-phase1-priority-top --phase smoke --dry-run`

### artifact smoke（実装後、必要なら実環境で）
- `node scripts/backtest/run-long-campaign.mjs external-phase1-priority-top --phase smoke`
  - `results/campaigns/external-phase1-priority-top/smoke/gated-summary.json`
  - `results/campaigns/external-phase1-priority-top/smoke/ranked-candidates.json`
  - `results/campaigns/external-phase1-priority-top/smoke/market-intel-snapshots.json`（追加した場合）
  を確認する

---

## リスク
- backtest artifact と live community snapshot の時間軸がズレる
- `x_*` は認証状態、Reddit は upstream availability に揺れがある
- warning surface を増やしすぎると artifact が読みにくくなる
- silent null を明示 status に変えることで既存 fixture / snapshot 的期待が広く変わる
- community を score に混ぜすぎると deterministic でも false precision になる
- campaign 後 enrichment を同期取得すると run time が伸びる可能性がある

---

## 実装ステップ（dependency / value order）
- [ ] active plan として本ファイルを `docs/exec-plans/active/` に置き、scope を固定する
- [ ] `gated-summary.json` / `ranked-candidates.json` に追加する additive fields を先に確定する
- [ ] **RED:** `tests/experiment-gating.test.js` と `tests/campaign.test.js` に confluence/provider/community artifact の失敗テストを追加する
- [ ] **GREEN:** `src/core/experiment-gating.js` を拡張し、artifact enrichment を受け取れる shape を作る
- [ ] **GREEN:** `scripts/backtest/run-long-campaign.mjs` に market-intel enrichment と artifact 出力を追加する
- [ ] **RED:** `tests/market-community-snapshot.test.js` を追加し、件数 / recency / source_presence / partial-success の失敗テストを作る
- [ ] **GREEN:** `src/core/market-community-snapshot.js` を作成し、X / Reddit ベースの community snapshot を実装する
- [ ] **RED:** `tests/market-provider-status.test.js` を追加し、`provider_status` / `missing_reason` / degraded coverage の失敗テストを作る
- [ ] **GREEN:** `src/core/market-provider-status.js` を作成する
- [ ] **RED:** `tests/market-intel-analysis.test.js` / `tests/market-intel.test.js` / `tests/observability.test.js` / `tests/e2e.observability.test.js` に provider visibility / partial-success regression の失敗テストを追加する
- [ ] **GREEN:** `src/core/market-intel-analysis.js` / `src/core/market-intel.js` を更新し、provider/community 情報を additive で返す
- [ ] **RED:** `tests/market-confluence.test.js` に weight 安定性と community 非方向性の失敗テストを追加する
- [ ] **GREEN:** 必要な場合に限り `src/core/market-confluence.js` の fixed weight を軽微調整する
- [ ] `package.json` に新規 test file を反映する
- [ ] `README.md` / `docs/DOCUMENTATION_SYSTEM.md` / `command.md` / `docs/references/design-ref-llms.md` を更新する
- [ ] `npm test` → `npm run test:e2e` → `npm run test:all` → targeted smoke を実行して GREEN を確認する
- [ ] session log を `docs/working-memory/session-logs/confluence-community-observability-rollout_20260409_1334.md` に残す
- [ ] plan を `docs/exec-plans/completed/` へ移動する
- [ ] Conventional Commits で commit し、`main` に push する

---

## 承認ゲート
この plan の段階では **コードを書かない**。承認後に Step 2（IMPLEMENT）へ進む。
