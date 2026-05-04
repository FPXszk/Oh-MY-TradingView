# 古い構成前提テストの安定化計画

## 目的

`npm test` で恒常的に失敗している既存テストのうち、現在のリポジトリ構成や実行環境に合っていないものを修正し、**今の repo に対して意味のあるテストだけが残る状態**にする。

今回の主対象は以下。

- `tests/devinit.test.js`
- `tests/strategy-live-retired-diff.test.js`
- `tests/capture.test.js`
- `tests/night-batch.test.js`

## 前提整理

- `devinit` / `strategy-live-retired-diff` は、失敗内容から見て「古い固定値・古い repo 構成前提」に依存している可能性が高い
- `capture` / `night-batch` は、前回の `npm test` では `Promise resolution is still pending` で落ちており、環境依存・非同期完了待ち・長時間実行の扱いが原因候補
- ユーザー意図は「既存の恒常失敗がなくなるようにテストを直す」であり、実装コード本体の挙動を変えることが目的ではない
- 単純削除ではなく、**今の repo に対して何を保証すべきか**を残す方針で進める

## 変更・作成・削除するファイル

| ファイル | 操作 | 内容 |
|---|---|---|
| `tests/devinit.test.js` | MODIFY | 既存 `devinit.sh` の現行仕様に合わせて assertion を更新。固定レイアウト/旧 wrapper 前提を必要最小限に見直す |
| `tests/strategy-live-retired-diff.test.js` | MODIFY | live / retired 件数の固定値 assertion を現行 catalog に追随させる。必要なら固定値依存を弱める |
| `tests/capture.test.js` | MODIFY if needed | CDP 未接続 rejection テストや async 完了待ちの書き方を見直し、ハングしないようにする |
| `tests/night-batch.test.js` | MODIFY if needed | 長時間ハングやローカル HTTP fixture 周りの待機条件、skip 条件、child process close 待ちを見直す |
| `docs/exec-plans/active/stabilize-outdated-structure-tests_20260504_2029.md` | CREATE | 本計画 |

## 実装内容

### 1. `devinit` テストの現行仕様追随

- `devinit.sh` の現在の pane 起動・ヘルパースクリプト・health check 実装を確認する
- 「古い wrapper がないこと」や「pane 構成が壊れていないこと」のような、今でも意味がある保証だけ残す
- 逆に、現行仕様とズレた旧前提 assertion は削るか緩める

### 2. `strategy-live-retired-diff` の固定値依存見直し

- 失敗原因が catalog 件数のズレなら、以下いずれかに変える
  - 現行 catalog の実数に更新
  - 固定総数ではなく整合条件（`live + retired = total` など）に変更
- どこまで固定値を残すかは、catalog の変化に対して意味があるかで決める

### 3. `capture` / `night-batch` のハング系テスト安定化

- open handle / pending promise を生む箇所を確認
- 必要なら
  - timeout を明示
  - skip 条件を強化
  - child process / server close の待機を厳密化
  - 外部接続前提の rejection テストを pure unit に寄せる
- 「環境によってたまに失敗する」を放置せず、repo 内で再現可能な形に寄せる

## 実装ステップ

- [ ] `devinit.sh` と `tests/devinit.test.js` のズレを確認する
- [ ] `tests/devinit.test.js` を現行 repo 構成に合わせて修正する
- [ ] `tests/strategy-live-retired-diff.test.js` の固定値依存を見直す
- [ ] `tests/capture.test.js` の pending promise 原因を確認し、必要なら修正する
- [ ] `tests/night-batch.test.js` の pending promise 原因を確認し、必要なら修正する
- [ ] 対象 4 テストを個別実行して安定通過を確認する
- [ ] `npm test` を再実行して恒常失敗が消えたことを確認する
- [ ] 計画を `completed/` に移してコミット・プッシュする

## テスト戦略

### RED

- 現状の `npm test` で `devinit` / `strategy-live-retired-diff` / `capture` / `night-batch` が失敗または cancel する状態を基準にする

### GREEN

- 個別テストが安定して通る
- `npm test` 全体でも、今回対象の恒常失敗が解消する

### REFACTOR

- テスト修正が主目的。アプリ実装本体を変えるのは、テストだけでは安定化できないと確認できた場合に限定する

## 検証コマンド

```bash
node --test tests/devinit.test.js
node --test tests/strategy-live-retired-diff.test.js
node --test tests/capture.test.js
node --test tests/night-batch.test.js
npm test
```

## 影響範囲

- 影響あり
  - テストの期待値
  - CI / local test の安定性
- 影響なし想定
  - 日次スクリーナー
  - backtest の本番ロジック
  - CLI / MCP のユーザー向け挙動

## リスク

1. 恒常失敗と思っていたものの一部が、実は実装退行を示している可能性がある
2. 固定値を弱めすぎると、意味の薄いテストになる
3. `night-batch` 系はローカル環境差が大きく、skip 条件を強めるとカバレッジが落ちる

## スコープ外

- 新機能追加
- backtest / capture 実装の大規模リファクタ
- catalog データ自体の再設計

## 競合確認

- active plan は `repo-structure-align-and-archive-rules_20260424_2015.md` と `run-night-batch_20260429_2344.md`
- 今回のテスト安定化作業とは直接競合しない
