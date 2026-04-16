# repo-information-architecture-restructure_20260416_0845

## 目的

- docs / config / artifacts / logs / plans / references の責務を、現行 repo の実装・テスト・workflow を壊さずに段階的に明確化する。
- `latest` / `current` の意味の揺れを減らし、**何が最新の文書世代か / 何が既定運用設定か / 何が最新 artifact 要約か** を明文化する。
- Source of Truth（SoT）を path 単位で整理し、strategy / campaign / universe / research / runner ops / backtest outputs の今後の増加に耐える情報アーキテクチャへ寄せる。
- 最終的に main へ安全に push できるよう、**無破壊な導線整理 → 軽微な生成/manifest 強化 → 必要なら最後に rename/move** の順で進める。

## 背景と現状認識

- repo root の `README.md` が一次入口であり、`docs/DOCUMENTATION_SYSTEM.md` が docs の地図を担っている。
- 既存 docs はすでに `docs/research/current/`, `artifacts/`, `docs/research/strategy/`, `docs/references/`, `docs/reports/`, `logs/sessions/`, `docs/exec-plans/` に分かれているが、**`latest` の意味** と **どこが SoT か** が人間にはまだ追いづらい。
- `tests/repo-layout.test.js` は stable path を強く前提にしており、`docs/research/current/manifest.json`、`artifacts/`、`config/backtest/campaigns/current|archive`、`config/backtest/universes/current|archive`、`docs/research/strategy/theme-momentum-definition.md` などは即時 rename 不可とみなすべきである。
- `tests/windows-run-night-batch-self-hosted.test.js` は `config/night_batch/bundle-foreground-reuse-config.json` と workflow 上の canonical path を検証しているため、runner / night batch 系の path rename は後回しにする必要がある。
- `python/night_batch.py` も `artifacts/`, `docs/research/current/`, `references/backtests/`, `docs/research/strategy/` を既定 path として持つため、物理移動を先にやると実装コストと破壊半径が大きい。
- 同スコープの既存 active plan はこの内容へ統合し、本ファイルを唯一の active plan として扱う。

## スコープ

### この plan で実施対象に含めること

- docs 情報設計の再整理
- SoT の明文化
- `latest` / `current` 用語の使い分けルール化
- 今後増える docs/config/artifact の置き場所整理
- 既存テスト・workflow と両立する migration order の設計
- 破壊的 rename を後ろ倒しにするための橋渡し導線設計

### この plan で直接は触らないが、後続フェーズで考慮すること

- `python/night_batch.py` の path/provenance 生成強化
- `scripts/docs/archive-stale-latest.mjs` の manifest 役割拡張
- runner ops / runbook の docs 新設

## 目標とする責務分離（最終像）

- `README.md`
  - repo の一次入口
  - 実運用の最短導線
  - 詳細 docs へのポインタ
- `docs/`
  - 人間向けの説明・運用・研究・履歴・計画
- `config/`
  - 実行される設定の正本
- `docs/references/`
  - 参照固定物・数値根拠・snapshot の保管
- `artifacts/`
  - run 出力・回収 artifact・runtime verification の保管
- `logs/sessions/`
  - 直近判断ログ
- `docs/exec-plans/`
  - 承認待ち/完了済み implementation plan

## Source of Truth（SoT）方針

| 領域 | SoT | 補助/派生レイヤー |
| --- | --- | --- |
| strategy lifecycle metadata | `config/backtest/strategy-catalog.json` | `docs/research/strategy/retired/`, strategy reference docs |
| live strategy set | `config/backtest/strategy-presets.json` | generated strategy docs |
| latest campaign selection | `config/backtest/campaigns/current/` | `docs/explain-forhuman.md`, `docs/research/current/README.md` |
| latest universe selection | `config/backtest/universes/current/` | `docs/explain-forhuman.md`, generated symbol docs |
| default night batch execution | `config/night_batch/bundle-foreground-reuse-config.json` + `.github/workflows/night-batch-self-hosted.yml` | runbooks / explain docs |
| latest handoff generation | `docs/research/current/manifest.json` + `docs/research/current/README.md` | archive / latest review docs |
| latest main backtest summary | `docs/research/current/main-backtest-current-summary.md`（生成結果） | `README.md`, explain docs |
| numeric backtest references | `references/backtests/` | summary / report / strategy docs |
| raw run outputs | `artifacts/` | summary / report / references |
| incident / postmortem archive | `docs/reports/` | README 上の要約・runbooks |

## `latest` / `current` 用語ルール

### 即時適用する文言ルール

- bare な `latest` / `current` は原則禁止し、必ず以下のどれかに言い換える。
  - **latest handoff generation**
  - **latest main backtest summary**
  - **default operational config**
  - **current active round**
  - **latest available artifact**
- `current` は時系列の曖昧語として使わず、状態を具体化する。
  - 例: `current campaign` → `default campaign in config/night_batch`
  - 例: `current results` → `latest available night-batch artifact`

### path rename は deferred にする理由

- `docs/research/current/`、`config/backtest/*/latest/` は既存テスト・生成・workflow の依存が強い。
- 先に path を変えるより、**文言を正して意味を固定**した方が安全で、変更効果も高い。

## 変更対象ファイル / ディレクトリ

### Phase 1 で作成予定

- `docs/INFORMATION_ARCHITECTURE.md`
  - repo 全体の情報設計・SoT・命名ルールの親文書
- `docs/research/README.md`
  - `latest / archive / results / strategy` の関係を説明する index
- `docs/references/README.md`
  - `backtests / pine / design-ref-llms.md` の入口整理
- `config/README.md`
  - `backtest / night_batch / .env` の責務整理

### Phase 1 で変更予定

- `README.md`
- `docs/DOCUMENTATION_SYSTEM.md`
- `docs/explain-forhuman.md`
- `docs/research/current/README.md`
- `docs/research/strategy/README.md`
- `docs/reports/README.md`
- `references/backtests/README.md`
- `references/pine/README.md`
- `tests/repo-layout.test.js`

### Phase 2 で作成予定

- `docs/runbooks/README.md`
- `docs/runbooks/runner-ops/README.md`
- `docs/runbooks/backtest-ops/README.md`
- `artifacts/README.md`
- `artifacts/campaigns/README.md`
- `artifacts/night-batch/README.md`
- `artifacts/runtime-verification/README.md`
- `config/backtest/README.md`
- `config/backtest/campaigns/README.md`
- `config/backtest/universes/README.md`
- `config/night_batch/README.md`

### Phase 2 で変更予定

- `README.md`
- `docs/DOCUMENTATION_SYSTEM.md`
- `docs/explain-forhuman.md`
- `docs/reports/README.md`
- `tests/repo-layout.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`（README / runbook 導線の期待が変わる場合のみ）

### Phase 3 で変更予定

- `docs/research/current/manifest.json`
- `scripts/docs/archive-stale-latest.mjs`
- `python/night_batch.py`
- `tests/archive-latest-policy.test.js`
- `tests/night-batch.test.js`
- `tests/repo-layout.test.js`
- `package.json`（新規 test file を追加する場合のみ）

### 移動（move）候補だが deferred とするもの

- `docs/reports/` 内の「生きた運用手順」を将来 `docs/runbooks/` へ寄せる
- 将来的に `artifacts/` を `docs/artifacts/` 系へ再編する案
- 将来的に `docs/research/current/` の handoff 専用名称へ rename する案
- 将来的に `logs/sessions/` を `docs/logs/` 系へ寄せる案

## 即時 rename / deferred rename の明示

### 即時にやってよいもの

- README / index / SoT table の追加
- 用語の統一
- subtree ごとの README 追加
- `docs/runbooks/` の新設（additive な追加のみ）
- `artifacts/` 配下の index README 追加
- `config/` 配下の index README 追加

### 即時にはやらないもの（deferred）

- `docs/research/current/` の rename
- `artifacts/` の rename / move
- `config/backtest/campaigns/current|archive` の rename
- `config/backtest/universes/current|archive` の rename
- `config/night_batch/bundle-foreground-reuse-config.json` の rename / move
- `docs/reports/` の rename
- `logs/sessions/` の rename / move
- `docs/exec-plans/` の rename / move
- `docs/research/strategy/theme-momentum-definition.md` の移動

## フェーズ別実装ステップ

### Phase 1: 用語と SoT の無破壊整理（docs 중심）

- [ ] `README.md`、`docs/DOCUMENTATION_SYSTEM.md`、`docs/explain-forhuman.md`、`docs/research/current/README.md` の `latest` / `current` 表現を棚卸しし、bare 表現を分類する
- [ ] `docs/INFORMATION_ARCHITECTURE.md` を新設し、repo 全体の責務分離・SoT・命名ルール・deferred rename 方針を定義する
- [ ] `docs/research/README.md`、`docs/references/README.md`、`config/README.md` を追加し、トップレベル index を補う
- [ ] `docs/reports/README.md` に「archive であり primary runbook ではない」ことをさらに明確化する
- [ ] `docs/research/strategy/README.md` に generated docs / stable reference / config SoT の境界を追記する
- [ ] RED: `tests/repo-layout.test.js` を先に更新し、新しい IA index と stable path 維持を fail で固定する
- [ ] GREEN: 最小限の docs 変更でテストを通す
- [ ] REFACTOR: README / DOCUMENTATION_SYSTEM / explain-forhuman の重複説明を減らし、役割ごとに責務を揃える

### Phase 2: 将来増分に備えた subtree index / runbook 導線追加

- [ ] `docs/runbooks/README.md` を作り、runner ops / backtest ops の living docs を受ける場所を定義する
- [ ] `docs/runbooks/runner-ops/README.md` を作り、Windows runner / Task Scheduler / bootstrap wrapper / workflow 補助導線の置き場を明示する
- [ ] `docs/runbooks/backtest-ops/README.md` を作り、night batch / campaign registration / artifact review の運用手順置き場を明示する
- [ ] `artifacts/README.md` と各 subtree README を追加し、`campaigns / night-batch / runtime-verification` の違いを明文化する
- [ ] `config/backtest/README.md`、`config/backtest/campaigns/README.md`、`config/backtest/universes/README.md`、`config/night_batch/README.md` を追加し、実行設定と説明 docs の境界を固定する
- [ ] `README.md` から新しい index / runbook へポインタを追加するが、既存 canonical path の説明は削らず要約を維持する
- [ ] RED: `tests/repo-layout.test.js` を更新し、新設 README 群の存在と期待文言を固定する
- [ ] 必要なら RED: `tests/windows-run-night-batch-self-hosted.test.js` を更新し、README から runbook への導線を検証する
- [ ] GREEN: additive な docs 追加だけで通す

### Phase 3: manifest / generation / provenance の強化

- [ ] `docs/research/current/manifest.json` の役割を keep-list だけでなく、latest generation の provenance を表せる方向に拡張するかを設計する
- [ ] `scripts/docs/archive-stale-latest.mjs` が manifest 拡張後も keep 判定を安全に行えるようにする
- [ ] `python/night_batch.py` 側で、latest summary / strategy docs / ranking artifact / catalog snapshot の説明責務と path 依存を整理する
- [ ] `latest handoff generation` と `latest main backtest summary` の関係を生成物側でも読めるようにする
- [ ] RED: `tests/archive-latest-policy.test.js` を更新し、manifest metadata 追加後も archive 挙動が壊れないことを fail で固定する
- [ ] RED: `tests/night-batch.test.js` を更新し、最新 summary / generated docs / artifact provenance の期待を fail で固定する
- [ ] GREEN: manifest / script / generator の最小実装で通す
- [ ] REFACTOR: path 定数・文言生成・provenance 記述の重複を減らす

### Phase 4: deferred path rename の実行可否を再評価

- [ ] Phase 1-3 完了後も bare `latest` が残っているかを棚卸しする
- [ ] `docs/research/current/` rename 案、`artifacts/` rename 案、`docs/reports` の archive-only 固定案のコスト/便益を比較する
- [ ] rename が不要なら docs policy のみで完了とし、rename を見送る
- [ ] rename が必要な場合のみ、alias README / compatibility shim / テスト更新 / 生成コード更新をまとめた別 exec-plan を切る

## TDD / 検証戦略（RED → GREEN → REFACTOR）

### RED

- 既存の repo policy test を先に壊して期待値を固定する
  - `tests/repo-layout.test.js`
  - `tests/archive-latest-policy.test.js`
  - `tests/windows-run-night-batch-self-hosted.test.js`
  - `tests/night-batch.test.js`（Phase 3 のみ）
- 新規 test file は必要最小限にとどめ、まずは既存 test を拡張する
- 既存 `package.json` の `test` script が手動列挙型なので、新規 test file を増やす場合だけ `package.json` を更新する

### GREEN

- docs 変更はまず additive・無破壊に入れる
- path rename を伴う変更は実施しない
- generator / manifest 強化は既存 path を温存したまま行う

### REFACTOR

- SoT table / glossary / docs 導線の重複を減らす
- README は一次入口に留め、詳細は subtree README / runbook に寄せる
- ただし runner policy のように既存テストが README 記載を要求している箇所は要約を残す

## 実行予定の既存テスト・検証コマンド

### Phase 1-2 の最小回帰

- `node --test tests/repo-layout.test.js tests/archive-latest-policy.test.js tests/windows-run-night-batch-self-hosted.test.js`

### Phase 3 で追加する回帰

- `node --test tests/night-batch.test.js tests/archive-latest-policy.test.js tests/repo-layout.test.js`
- 必要に応じて `python3 python/night_batch.py report --dry-run --us artifacts/us.json --jp artifacts/jp.json --out artifacts/report.md`
- 必要に応じて `python3 python/night_batch.py nightly --dry-run --host 127.0.0.1 --port 9223`

### 最終回帰

- `npm test`

## migration order

1. **用語の固定** — bare `latest/current` を文書上で解消する
2. **SoT の可視化** — `docs/INFORMATION_ARCHITECTURE.md` と subtree index を置く
3. **導線の分割** — README を入口に保ちつつ、runbooks / references / results index に流す
4. **artifact / latest policy の補強** — manifest と archive script の責務を強める
5. **generator 整理** — `python/night_batch.py` の説明責務を合わせる
6. **rename 必要性の再評価** — ここで初めて物理 rename を検討する
7. **必要時のみ別 plan で rename 実施** — main への push は rename の有無にかかわらず、各フェーズごとに小さく行う

## リスク

- `docs/research/current/` や `config/backtest/*/latest/` を早く rename すると、既存テスト・generator・workflow が広範囲に壊れる
- README に説明を寄せすぎると、再び巨大な一次文書になる
- `docs/runbooks/` を作っても README 側の要約を削りすぎると、既存テストと利用導線が崩れる
- SoT を過剰に増やすと、逆に「どれが正か」が増えてしまう
- `artifacts/` の肥大化問題を path rename だけで解決しようとすると、リスクの割に効果が薄い
- runner ops と実際の workflow / script の文言が将来 drift する可能性がある

## リスク低減策

- path rename は最後まで deferred にする
- docs の責務整理は additive な index / glossary / SoT table から始める
- README から詳細を完全除去せず、「要約 + 詳細導線」に留める
- runner ops / default config / latest summary は **path と文言の両方** をテストで保護する
- `manifest.json` 拡張時は `keep` 判定互換を壊さないように `tests/archive-latest-policy.test.js` を先に RED 化する
- rename が必要になった場合は、この plan とは別に rename 専用 exec-plan を切って破壊半径を限定する

## Out of Scope

- backtest ロジックや ranking 算出式の変更
- workflow の実行仕様そのものの変更
- `config/night_batch/bundle-foreground-reuse-config.json` の canonical path 変更
- `docs/research/strategy/theme-momentum-definition.md` の stable path 変更
- 既存 artifact の大規模削除や repo 外 storage への退避
- 過去 archive docs 全件の全面書き換え
- `docs/reports/` の historical report 全件移設

## 完了条件

- `README.md` / `docs/DOCUMENTATION_SYSTEM.md` / `docs/explain-forhuman.md` / `docs/research/current/README.md` で `latest/current` の意味が明示的に区別されている
- `docs/INFORMATION_ARCHITECTURE.md` と各 subtree README により、docs / config / artifacts / logs / plans / references の境界が説明できる
- SoT 表が path 単位で明記され、strategy / campaign / universe / latest summary / references / results の正本が追える
- 既存 canonical path は維持される
- 既存テストと必要な追加テストが通る
- deferred rename が「本当に必要かどうか」をフェーズ後半で判断できる材料が揃う

## 承認待ち

この plan は Step 1（PLAN）の成果物。ユーザー承認後に Step 2（IMPLEMENT）へ進む。
