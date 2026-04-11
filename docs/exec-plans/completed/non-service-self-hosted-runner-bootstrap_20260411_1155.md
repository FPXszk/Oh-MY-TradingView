# Exec Plan: non-service-self-hosted-runner-bootstrap_20260411_1155

## 1. 背景 / 目的

Windows self-hosted runner について、過去の検討では service mode 前提の案があったが、現時点では **OS バージョン / 実行環境の制約により service mode を採用しない** 方針へ整理する必要がある。  
一方で repository 内の README / command.md / workflow 周辺には、その非 service 前提がまだ十分に明文化されておらず、将来の運用者が古い前提を参照して誤認する余地がある。

本計画は、以下を **PLAN 段階のみ**で定義する。

1. Windows self-hosted runner は **service mode を使わない** こと、その理由、現在の運用前提を文書化する  
2. repository 内の docs / workflow / wrapper / test が **「run.cmd 系の手動起動前提」** で整合しているか確認し、更新対象を確定する  
3. 後続実装として、runner を再度 `run.cmd` で起動するときに **prerequisite fix を先に自動実行する bootstrap 導線**を repo 管理下で追加できるよう、設計と検証観点を固める  
4. 実装後に docs 更新、session log 記録、commit / push まで進められるよう、作業境界を明確化する

---

## 2. 完了条件

- `README.md` と `command.md` に、**service mode 非採用**・その理由・現在の運用前提・bootstrap 導線の概要が明記される
- `.github/workflows/night-batch-self-hosted.yml` の前提が、**service 常駐ではなく online な self-hosted Windows runner がいること**だと説明でき、docs と矛盾しない
- `scripts/windows/` 配下の runner 起動導線について、**repo-scoped bootstrap → run.cmd 起動**の責務分割案が確定する
- `tests/windows-run-night-batch-self-hosted.test.js` の更新方針が定まり、bootstrap の先行実行・wrapper 責務分離・非 service 前提を検証対象として追加できる
- `docs/working-memory/session-logs/<slug>.md` に残す内容が定義される
- 後続 IMPLEMENT で使う既存検証コマンドが明示される

---

## 3. 変更・作成・確認対象ファイル

### 変更予定
- `README.md`
- `command.md`
- `scripts/windows/run-night-batch-self-hosted.cmd`
- `tests/windows-run-night-batch-self-hosted.test.js`
- `docs/working-memory/session-logs/<slug>.md`
- `docs/exec-plans/active/non-service-self-hosted-runner-bootstrap_20260411_1155.md`

### 新規作成候補
- `scripts/windows/bootstrap-self-hosted-runner.cmd`
- `scripts/windows/run-self-hosted-runner-with-bootstrap.cmd`

### 整合確認対象（必要なら最小修正）
- `.github/workflows/night-batch-self-hosted.yml`

### 参照のみ想定
- `package.json`

### 削除予定
- なし

---

## 4. スコープ

### In Scope
- Windows self-hosted runner の **非 service 方針**の明文化
- README / command.md / workflow / wrapper / test の **前提整合確認**
- repo 内で管理できる **bootstrap 導線**の設計
- `run.cmd` 再起動時に prerequisite fix を先に実行するための **wrapper 構成案**
- bootstrap / wrapper / docs のテスト戦略整理
- session log の記録方針整理
- 実装後の commit / push まで見据えた差分境界の整理

### Out of Scope
- self-hosted runner の Windows service 化
- queued 原因の再調査
- workflow_dispatch / rerun の実行観測
- GitHub Actions runner 配布物そのものの改変
- runner 配置ディレクトリ外の大規模な Windows 環境変更
- prerequisite fix 本体の大幅な新規実装
- GitHub / OS 設定変更そのもの

---

## 5. 既存 active plan との非重複方針

本計画は、既存 active plan と次のように責務を分離する。

- `investigate-night-batch-self-hosted-queued_20260410_2307.md`  
  → queued の原因調査が主題。本計画では queued 調査は扱わない。

- `rerun-night-batch-after-run-cmd_20260410_1714.md`  
  → `run.cmd` 後の rerun 観測が主題。本計画では rerun 実行は扱わない。

- `run-night-batch-self-hosted-workflow-dispatch_20260411_0025.md`  
  → workflow_dispatch の起動 / 実行確認が主題。本計画では dispatch 実行は扱わない。

**本計画の固有スコープ**は、以下に限定する。

- service mode 非採用方針の明文化
- docs / workflow / wrapper の前提整合
- repo-scoped bootstrap 導線の設計
- テスト / session log / commit 準備の計画化

これにより、既存 plan が扱う **運用観測・原因調査・再実行**とは重ならず、**方針整理と repo 側の後続実装準備**に限定できる。

---

## 6. 実装方針（計画レベル）

### 6.1 repo-scoped bootstrap の第一候補

`scripts/windows/` 配下に、runner 起動用の wrapper を追加し、以下の順序を repository 管理下で固定する。

1. prerequisite fix を実行する
2. prerequisite fix の成否を fail-fast で判定する
3. 成功時のみ、外部 runner ディレクトリ側の `run.cmd` 起動へ進む

想定候補:

- `scripts/windows/bootstrap-self-hosted-runner.cmd`  
  - prerequisite fix 専用
- `scripts/windows/run-self-hosted-runner-with-bootstrap.cmd`  
  - bootstrap 実行後に `run.cmd` を呼ぶ薄い起動 wrapper

### 6.2 既存 wrapper との責務分離

`scripts/windows/run-night-batch-self-hosted.cmd` は、現状どおり **night batch 実行 wrapper** として扱い、runner 起動責務とは分離する。  
これにより、以下の責務が分かれる。

- runner を online にする起動導線
- workflow job から night batch を流す導線

### 6.3 外部 runner ディレクトリとの接続方針

repo 外の runner 配置ディレクトリを完全に repository 配下へ取り込むことはしない。  
ただし、**一回限りの manual hookup** が unavoidable な場合は、以下の形で局所化する。

- runner 配置ディレクトリから `run.cmd` を直接叩く代わりに、repo 内 wrapper を呼ぶよう一度だけ切り替える
- その一回の導線変更手順を README / command.md に明記する
- 以後の prerequisite fix 更新は repository 側の script 更新で追従できる形に寄せる

### 6.4 docs / workflow の整合確認観点

- `.github/workflows/night-batch-self-hosted.yml` は `runs-on: [self-hosted, windows]` であり、**service であること自体は要求していない** 点を docs に揃える
- `actions/checkout` の `clean: false`、WSL workspace 前提、night batch wrapper 呼び出しが、**manual / run.cmd ベースの runner 運用**でも成立することを説明できる状態にする
- README は **運用方針と前提**、command.md は **手順とコマンド** を中心に役割分担する
- 過去の completed plan に含まれる service 化前提は、現行方針では採用しないことを必要最小限で明示する

---

## 7. RED / GREEN / REFACTOR テスト戦略

### RED
- `tests/windows-run-night-batch-self-hosted.test.js` を先に拡張し、以下を failure として固定する
  - bootstrap wrapper が存在しない、または prerequisite fix を runner 起動より先に呼ばない
  - docs に **service 非採用方針** が反映されていない
  - 既存 `run-night-batch-self-hosted.cmd` が runner 起動責務まで抱え込む構成になっている

### GREEN
- docs を最小限更新し、非 service 方針・manual 起動前提・bootstrap 導線・manual hookup 有無を明文化する
- `scripts/windows/` に bootstrap 系 wrapper を追加し、テストが期待する起動順を満たす
- 必要最小限で `.github/workflows/night-batch-self-hosted.yml` の説明整合を取る

### REFACTOR
- Windows wrapper 間の責務境界を整理する
- README / command.md の重複説明を削減する
- テストは全文一致ではなく、**起動順・呼び出し先・禁止前提**の意味単位で検証する

### カバレッジ方針
- repository 既存コマンドの範囲で、`tests/windows-run-night-batch-self-hosted.test.js` を拡張して bootstrap / wrapper 変更点を重点的にカバーする
- 本計画では coverage ツール追加は行わず、IMPLEMENT で既存 test 実行結果を根拠に確認する

---

## 8. 実装後に実行する既存検証コマンド

```bash
node --test tests/windows-run-night-batch-self-hosted.test.js
npm test
git --no-pager diff -- README.md command.md .github/workflows/night-batch-self-hosted.yml scripts/windows tests/windows-run-night-batch-self-hosted.test.js docs/working-memory/session-logs
```

必要に応じて文言確認:

```bash
rg -n "service|run\\.cmd|bootstrap|self-hosted" README.md command.md .github/workflows/night-batch-self-hosted.yml scripts/windows tests/windows-run-night-batch-self-hosted.test.js
```

---

## 9. リスク / 制約

1. **repo 外導線の変更がゼロにはできない可能性**  
   - 対策: 外部 runner ディレクトリ側は一回限りの manual hookup に限定し、継続運用ロジックは repo 側へ寄せる

2. **README / command.md / workflow の説明がずれる可能性**  
   - 対策: README は方針、command.md は手順、と役割を固定する

3. **historical plan の service 化前提と混同される可能性**  
   - 対策: 現行方針として service 非採用を明記し、旧方針との差分を最小限で説明する

4. **テストが wrapper 文面に過度依存する可能性**  
   - 対策: 完全一致ではなく、起動順・呼び出し先・責務境界を確認するテストに寄せる

5. **workflow 側まで広げすぎると既存 active plan と衝突する可能性**  
   - 対策: 本計画では workflow の本質的挙動変更ではなく、前提整合の確認と最小修正に留める

---

## 10. チェックボックス形式のタスクリスト

- [ ] 既存 active plan を再確認し、本計画の非重複範囲を明記する
- [ ] README.md の self-hosted 節に追記する非 service 方針・理由・manual 起動前提の記載案を固める
- [ ] command.md の self-hosted 節に追記する bootstrap 先行手順・manual hookup 記載案を固める
- [ ] `.github/workflows/night-batch-self-hosted.yml` を確認し、service 非採用方針と矛盾しないことをレビューする
- [ ] `scripts/windows/run-night-batch-self-hosted.cmd` の責務を night batch 実行専用として維持する方針を確定する
- [ ] `scripts/windows/bootstrap-self-hosted-runner.cmd` の責務を prerequisite fix 専用として定義する
- [ ] `scripts/windows/run-self-hosted-runner-with-bootstrap.cmd` の責務を bootstrap 後の runner 起動専用として定義する
- [ ] 外部 runner ディレクトリ側で必要になりうる one-time manual hookup の範囲を明文化する
- [ ] `tests/windows-run-night-batch-self-hosted.test.js` に追加する RED ケースを設計する
- [ ] docs と scripts の最小変更順序を GREEN 観点で整理する
- [ ] wrapper / docs / test の重複や責務混在を REFACTOR 観点で整理する
- [ ] `docs/working-memory/session-logs/<slug>.md` に残す判断理由・変更範囲・未解決事項を定義する
- [ ] 実装後の既存検証コマンドと完了条件を再確認する
- [ ] 後続の commit / push に向けて、差分境界を docs・scripts・tests・session log に限定する

---

## 11. session log 記録方針

`docs/working-memory/session-logs/<slug>.md` には、少なくとも以下を残す。

- service mode 非採用の判断理由
- docs / workflow / scripts / tests の更新範囲
- repo-scoped bootstrap の採用案
- one-time manual hookup の要否
- IMPLEMENT / REVIEW / COMMIT で確認すべき残課題

---

## 12. 推奨 slug

`non-service-self-hosted-runner-bootstrap`
