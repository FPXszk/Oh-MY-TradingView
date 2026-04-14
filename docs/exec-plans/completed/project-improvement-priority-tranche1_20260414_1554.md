# Exec Plan: project-improvement-priority-tranche1_20260414_1554

## 1) 背景 / 目的

`docs/research/latest/project-improvement-review.md` にある改善案を、以下の観点で優先順位付けし、今回の依頼

> 「提案してくれた改善提案優先度をつけて高いものから順に実装していって」

に対して、**広げすぎない現実的な第1回実装計画**へ落とし込む。

優先順位付けの判断軸は以下とする。

1. **既存資産を活かして短いステップで価値を出せるか**
2. **運用事故防止効果が高いか**
3. **後続改善の前提になるか**

今回は **PLAN のみ** であり、実装・commit/push は開始しない。

## 2) 優先度順の改善項目一覧（高 → 低）

### P1. latest/archive promotion の manifest 化
**対象案**: 1

**優先理由**
- 既存の `scripts/docs/archive-stale-latest.mjs` に keep 判定を足す形で進められ、**差分が小さい**
- `latest` 配下の誤 archive / 誤残置を防げるため、**運用事故防止効果が高い**
- 後続の pointer check や summary 導線強化の前提として、**latest の正本定義を機械可読化**できる

**期待効果**
- `README.md + 人手指定` 依存から脱却し、latest 管理を deterministic にする

### P2. campaign / universe の latest pointer を machine-check する
**対象案**: 5

**優先理由**
- 既存の `tests/repo-layout.test.js` / `tests/preset-validation.test.js` の延長で実装でき、**低コスト**
- latest pointer 崩れ、live preset と campaign 参照の不整合、archive 重複などを早期検出でき、**事故防止効果が高い**
- manifest 化と組み合わせると、**構成ルールをテストで固定**できる

**期待効果**
- latest/campaign/universe/preset 間の整合性を repo テストで守れる

### P3. backtest ranking を毎回 artifact 化する
**対象案**: 2

**優先理由**
- `scripts/backtest/generate-rich-report.mjs` がすでに `--ranking-out` を受けられるため、**既存実装を活かしやすい**
- strongest set 更新の再現性が上がり、**次回判断を deterministic にできる**
- richer summary や workflow 導線強化の**前提成果物**になる

**期待効果**
- ranking JSON の生成が手作業/任意実行ではなく標準化される

### P4. smoke-prod 完了後の summary を richer にする
**対象案**: 3

**優先理由**
- P3 の ranking artifact が自動化されると、summary / workflow summary / artifact upload の導線を素直に強化できる
- handoff 品質は高まるが、P1〜P3よりは**事故防止より運用利便性寄り**
- 既存 workflow / PowerShell helper / `night_batch.py` の改修が必要で、P1〜P3より少し横断的

**期待効果**
- `main-backtest-latest-summary.md`、rich report、ranking artifact が一貫した導線で辿れる

### P5. live checkout 保護を workflow 側でも強める
**対象案**: 7

**優先理由**
- 運用事故防止の観点では重要
- ただし workflow / production 実行文脈 / 差分検知タイミングの設計が必要で、**第1回 tranche としてはやや重い**
- 先に manifest / pointer / artifact を固めた方が guard 条件も定義しやすい

**期待効果**
- 夜間実行中の意図しない config 差し替えを検知しやすくなる

### P6. strategy live set と retired set の差分を見える化する
**対象案**: 4

**優先理由**
- 有用だが、現時点では `retired-strategy-presets.json` が退避先として機能しており、**運用停止リスクは相対的に低い**
- retire reason / replacement family などは**メタデータ設計を伴う**
- まず ranking artifact を固定化してから着手した方が、説明根拠を artifact に寄せられる

**期待効果**
- なぜ live から外れたかの説明コストを下げる

### P7. results の肥大化対策を決める
**対象案**: 6

**優先理由**
- 長期的には重要だが、今回は**ポリシー設計寄り**で、短い実装ステップで即価値を出しにくい
- 直近の運用事故防止や handoff 品質向上には、上位項目の方が直接効く
- artifact 導線が固まってから保存戦略を決めた方が、削るべきもの/残すべきものを判断しやすい

**期待効果**
- repo サイズと永続成果物の整理方針を明確化できる

## 3) 今回の実装スコープ（第1トランシェ）

### In Scope
第1トランシェでは以下 4 項目に絞る。

1. latest/archive promotion の manifest 化
2. campaign / universe latest pointer の machine-check 追加
3. ranking artifact の自動生成標準化
4. summary / workflow summary への ranking・rich report 導線追加

### この tranche を先にやる理由
- 既存コードをかなり再利用でき、**短いステップで価値を出しやすい**
- latest/pointer/ranking/report の**正本と導線を先に固める**ことで、後続の保護強化や retired metadata 設計がやりやすくなる
- 運用事故防止と handoff 品質向上を、**小さめの差分で同時に進められる**

### Out of Scope
- live checkout 保護強化
- live vs retired set の可視化拡張
- results 肥大化対策
- retired metadata 強化

### 後続送りにする理由
- **live checkout 保護強化**: workflow/runtime 設計の検討余地が大きく、第1回としては横断範囲が広い
- **retired metadata 強化**: ranking artifact の定常生成後の方が、説明根拠を artifact と結びやすい
- **results 肥大化対策**: 実装より先に保存ポリシー判断が必要で、今すぐの価値出しには直結しにくい

## 4) 変更・作成・削除対象ファイル候補

### 作成候補
- `docs/exec-plans/active/project-improvement-priority-tranche1_20260414_1554.md`
- `docs/research/latest/manifest.json`

### 更新候補
- `scripts/docs/archive-stale-latest.mjs`
- `python/night_batch.py`
- `scripts/windows/github-actions/find-night-batch-outputs.ps1`
- `scripts/windows/github-actions/append-night-batch-workflow-summary.ps1`
- `.github/workflows/night-batch-self-hosted.yml`
- `tests/archive-latest-policy.test.js`
- `tests/night-batch.test.js`
- `tests/repo-layout.test.js`
- `tests/windows-run-night-batch-self-hosted.test.js`

### 必要に応じて更新候補
- `docs/research/latest/README.md`
  - manifest 導入後の latest 運用ルール記述を最小限更新する場合のみ

### 参照のみ
- `docs/research/latest/project-improvement-review.md`
- `scripts/backtest/generate-rich-report.mjs`
- `config/backtest/campaigns/latest/*.json`
- `config/backtest/universes/latest/*.json`
- `config/backtest/strategy-presets.json`
- `docs/bad-strategy/retired-strategy-presets.json`
- `tests/preset-validation.test.js`

### 削除候補
- 原則なし

## 5) active exec-plan との衝突有無

### 判定
**衝突なし。**

### 根拠
- `docs/exec-plans/active/*.md` は現時点で空
- completed 側には関連する過去 plan (`restructure-docs-backtest-archives_20260414_1404.md` など) はあるが、active 競合はない

## 6) 実装内容と影響範囲

### 実装内容
- `docs/research/latest/manifest.json` を導入し、latest に残す research doc の keep-set を機械可読化する
- `archive-stale-latest.mjs` が manifest を読み、既存 `--research-keep` と併用しつつ deterministic に archive 判定できるようにする
- latest campaign / universe / live preset 間の pointer 整合性をテストで固定する
- `night_batch.py` の report / nightly / smoke-prod 系導線で ranking artifact の出力先を自動算出し、通常生成へ寄せる
- latest summary と GitHub Actions workflow summary から rich report / ranking artifact に辿れるように helper / workflow を更新する

### 影響範囲
- `docs/research/latest/` の latest 管理ルール
- archive helper の keep 判定
- campaign/latest / universe/latest / live preset の整合性チェック
- night batch の rich report / ranking artifact 出力規約
- GitHub Actions の step summary / artifact 導線

## 7) TDD / テスト戦略（RED → GREEN → REFACTOR）

### 方針
既存テスト群を拡張し、**運用ルールを先に失敗するテストで固定**してから実装する。追加ツールは導入せず、既存 `node --test` / `npm test` を使う。

### RED
- `tests/archive-latest-policy.test.js`
  - manifest 記載ファイルは latest に残る
  - manifest 未記載ファイルは archive へ移る
- `tests/repo-layout.test.js`
  - latest / archive の campaign・universe 重複がない
  - latest pointer が期待セットから逸脱しない
- `tests/night-batch.test.js`
  - ranking artifact が自動生成される
  - `main-backtest-latest-summary.md` に rich report / ranking artifact が載る
- `tests/windows-run-night-batch-self-hosted.test.js`
  - `find-night-batch-outputs.ps1` が ranking / rich report を拾う
  - `append-night-batch-workflow-summary.ps1` が ranking / rich report 導線を出す
  - workflow がその outputs を受け渡す

### GREEN
- manifest 読み込みと keep-set 判定を実装する
- latest pointer machine-check を通す
- deterministic な ranking 出力 path 算出を追加する
- latest summary / workflow summary のリンク出力を追加する

### REFACTOR
- keep-set 解決ロジックの重複を整理する
- artifact path 算出ロジックの責務を分離する
- テスト fixture の重複を減らす
- helper script 間で output 名・path 名を揃える

## 8) 検証コマンド

```bash
git --no-pager diff --check

node --test tests/archive-latest-policy.test.js
node --test tests/repo-layout.test.js
node --test tests/night-batch.test.js
node --test tests/windows-run-night-batch-self-hosted.test.js

npm test
```

必要に応じて広めの確認:

```bash
npm run test:all
```

## 9) リスク / 確認ポイント

- **manifest と README の二重管理**
  - source of truth を manifest に寄せ、README は説明専用にするかを明確化する必要がある
- **ranking artifact の置き場所**
  - `docs/references/backtests/` と round artifact のどちらを正本にするか曖昧にしない
- **night_batch.py の path 算出**
  - dry-run / nightly / detached production-child / smoke-prod 完了導線で一貫して動くか要注意
- **workflow summary の肥大化**
  - step summary は本文貼り付けではなくリンク中心に保つ
- **Windows helper 契約**
  - 既存 `tests/windows-run-night-batch-self-hosted.test.js` の薄い wrapper 方針を壊さない
- **latest pointer test の過拘束**
  - 将来の campaign 更新で壊れすぎないよう、固定値検証範囲を慎重に決める

## 10) 実装ステップ

### Phase A: latest 正本定義の固定
- [ ] `docs/research/latest/manifest.json` のスキーマ案を定義する
- [ ] latest に残す research doc / pointer 系ファイルを manifest に明記する
- [ ] `scripts/docs/archive-stale-latest.mjs` が manifest を読めるようにする
- [ ] `tests/archive-latest-policy.test.js` に manifest ベースの RED テストを追加する
- [ ] 必要なら `docs/research/latest/README.md` の運用説明を最小更新する

### Phase B: latest pointer の machine-check
- [ ] `tests/repo-layout.test.js` に campaign latest / archive / universe latest / archive の整合性チェックを追加する
- [ ] live preset と latest campaign / universe の関係で最低限守るべき契約を明文化する
- [ ] 固定しすぎない形で latest pointer の検証ルールを追加する

### Phase C: ranking artifact の標準生成
- [ ] `tests/night-batch.test.js` に ranking artifact 自動生成の RED テストを追加する
- [ ] `python/night_batch.py` に ranking 出力 path の自動算出を追加する
- [ ] report / nightly / detached production-child / smoke-prod 完了導線で ranking 出力が揃うようにする
- [ ] latest summary に ranking artifact 導線を追加する

### Phase D: workflow summary / artifact 導線
- [ ] `tests/windows-run-night-batch-self-hosted.test.js` に output / summary 導線の RED テストを追加する
- [ ] `scripts/windows/github-actions/find-night-batch-outputs.ps1` に rich report / ranking artifact 出力を追加する
- [ ] `scripts/windows/github-actions/append-night-batch-workflow-summary.ps1` に report / ranking リンク出力を追加する
- [ ] `.github/workflows/night-batch-self-hosted.yml` の output 受け渡しを更新する
- [ ] 関連テストを GREEN にする

### Phase E: 総合確認
- [ ] tranche 対象の個別テストをすべて通す
- [ ] `npm test` を通して既存契約を壊していないことを確認する
- [ ] 変更範囲が tranche 逸脱していないことを見直す

## 11) 第2トランシェ以降の想定順

1. **live checkout 保護強化**
2. **live / retired 差分可視化 + retired metadata 強化**
3. **results 肥大化対策の方針決定と反映**

## 12) PLAN 完了条件

この exec-plan が承認されたら、第1回実装では以下を成功条件とする。

- latest keep 対象が manifest で定義される
- latest pointer の整合性がテストで守られる
- ranking artifact が定常生成される
- latest summary / workflow summary から rich report と ranking artifact に辿れる
- 既存 repo テストコマンドで検証できる状態になる
