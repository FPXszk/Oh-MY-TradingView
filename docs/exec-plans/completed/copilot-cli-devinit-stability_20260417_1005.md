# Copilot CLI 起動直後 `[server exited]` 調査・再発防止 exec-plan

## 目的

`just dev` / `./devinit.sh` で作成される tmux 開発セッションについて、既知の懸念点を小さく段階的に潰し、**Copilot CLI の起動安定性と既存セッション再利用の信頼性を上げる**。  
今回の対象は、以下の再発防止に限定する。

1. Copilot 起動直後の `C-t` 自動送信による UI / TTY 初期化競合の疑い
2. 実態と合っていない「スマホ表示向けモード」文言
3. `session_is_healthy()` が pane title の完全一致 (`copilot logs git keepalive`) を前提にしており、Copilot pane title が動的に変わると healthy session を不健全扱いする問題
4. 上記 3 点に付随する、最小限の起動ガードと回帰テスト不足

方針は **原因候補を一度に増やさず、既存 dev ワークフローを壊さない範囲で段階的に修正** する。

## スコープ

### 含む

- `devinit.sh` の Copilot 起動シーケンスの最小修正
- `C-t` 自動送信の削除、または必要性が証明された場合に限る厳格な条件付き化
- misleading な起動メッセージの修正
- dynamic pane title に耐える `session_is_healthy()` 判定への見直し
- `devinit.sh` 向けの最小回帰テスト追加
- 既存コマンドを使った手動確認と回帰確認
- 必要最小限の README 更新要否判断

### 含まない

- Copilot CLI 本体の改修
- tmux レイアウト全体の再設計
- 常駐監視・自動復旧デーモンの導入
- TradingView readiness / night-batch / crash recovery 系の別課題対応
- `devinit.sh` の大規模分割や全面リファクタ

## 変更対象ファイル

### 変更する

- `devinit.sh`
- `docs/exec-plans/active/copilot-cli-devinit-stability_20260417_1005.md`

### 新規作成する

- `tests/devinit.test.js`

### 条件付きで変更する

- `README.md`

## 実装方針

1. **`C-t` 自動送信を第一容疑として扱う**  
   Copilot 起動直後の `tmux send-keys ... C-t` は、Copilot CLI の UI / TTY 初期化と競合している可能性が最も高い。  
   原則は **自動送信をやめる** 方向で進め、どうしても必要な運用意図が示せる場合のみ縮退した条件付き実行を検討する。

2. **ログの意味を実態に合わせる**  
   「スマホ表示向けモード」は存在しない専用モードを示唆しており、障害解析のノイズになっている。  
   起動内容に即した説明へ修正し、誤解からくる切り分けミスを防ぐ。

3. **healthy 判定を title 依存から外す**  
   Copilot pane title は実運用で動的に変化するため、完全一致前提は壊れやすい。  
   window 名、pane 数、pane index ごとのプロセス種別や必要最小限の観測情報など、より安定した条件へ寄せる。

4. **変更は小さく、テストで固定する**  
   shell script の変更は副作用が読みづらいため、再発防止ポイントだけを押さえる小さなテストで固定する。

## TDD / 検証戦略（RED / GREEN / REFACTOR）

### RED

- `tests/devinit.test.js` を追加し、少なくとも以下を失敗で先に表現する
  - Copilot pane title が動的値でも healthy session とみなすべきケース
  - Copilot 起動直後に `C-t` を常時送らないべきケース
  - misleading な「スマホ表示向けモード」文言を許容しないケース
- 必要に応じて `devinit.sh` の一部関数をテストしやすい最小単位に整理する

### GREEN

- `devinit.sh` を最小修正して新規テストを通す
- `C-t` 自動送信を削除、または厳格な条件付きへ変更する
- pane title 完全一致依存を外し、dynamic title でも healthy 判定が通るようにする
- 起動メッセージを実態に合わせて修正する

### REFACTOR

- 判定ロジックを読みやすく小関数化し、重複を減らす
- shell 上の責務を明確化し、将来の title 変化やタイミング差分に強い形へ整える
- README 更新が必要なら最小限で反映する

## 検証コマンド

既存の repo コマンドだけを使う。

- `npm test`
- `./devinit.sh`
- `just dev`
- `just stop`

検証観点:

- `npm test` が通ること
- `./devinit.sh` で Copilot CLI が起動直後に不安定化しないこと
- `just dev` 再実行時に、dynamic pane title の healthy session を誤って kill / recreate しないこと
- `just stop` で後片付けできること

## リスク / 注意点

- `C-t` に過去の運用意図がある場合、単純削除で別の操作性が落ちる可能性がある
- tmux の pane 情報は環境差があるため、健全性判定を厳しくしすぎると再び誤判定の原因になる
- shell script テストは実 tmux 実行に寄せすぎると不安定になるため、テスト粒度を誤ると保守しづらい

## 既存 active plan との関係

- `docs/exec-plans/active/tradingview-crash-auto-recovery_20260417_0739.md` は TradingView crash recovery が対象であり、本件とは直接競合しない
- `docs/exec-plans/active/night-batch-readiness-stabilization_20260416_1706.md` は readiness gate の安定化が対象であり、本件とは直接競合しない

本計画は、**開発用 tmux 起動フローにおける Copilot CLI 起動安定化** に限定されており、既存 active plan と並行して進めても影響範囲は分離できる。

## 実装ステップ

- [ ] 現行 `devinit.sh` の責務を整理し、`C-t` 自動送信・起動文言・`session_is_healthy()` のどれを先に固定すべきか確定する
- [ ] `tests/devinit.test.js` を追加し、dynamic pane title を healthy とみなせない現状を RED で表現する
- [ ] `tests/devinit.test.js` を追加し、Copilot 起動直後の `C-t` 常時送信を許容しない期待を RED で表現する
- [ ] `tests/devinit.test.js` を追加し、「スマホ表示向けモード」文言を許容しない期待を RED で表現する
- [ ] `devinit.sh` から Copilot 起動直後の `C-t` 自動送信を削除、または必要性が示せる最小条件付きに縮退する
- [ ] `devinit.sh` の起動メッセージを実態に一致する表現へ修正する
- [ ] `session_is_healthy()` を static pane title 完全一致依存から外し、dynamic title に耐える最小判定へ置き換える
- [ ] 既存セッション再利用時に healthy session を誤って kill しないことを確認する
- [ ] `npm test` を通し、追加テストと既存回帰の両方を確認する
- [ ] `./devinit.sh` と `just dev` を使って手動確認し、起動安定性と再利用判定を確認する
- [ ] 必要な場合のみ `README.md` を最小更新し、挙動変更点を明示する
- [ ] 変更を小さな論理単位で見直し、不要な複雑化が入っていないことを確認する

## 完了条件

- Copilot 起動直後の `C-t` 常時送信が再発防止の観点で是正されている
- 「スマホ表示向けモード」文言が除去または実態に合う表現へ修正されている
- Copilot pane title が動的に変わっても `session_is_healthy()` が healthy session を誤判定しない
- `npm test`、`./devinit.sh`、`just dev`、`just stop` で期待どおり検証できる
- 修正が `devinit.sh` 周辺の小さな範囲に収まり、別問題へ拡張していない
