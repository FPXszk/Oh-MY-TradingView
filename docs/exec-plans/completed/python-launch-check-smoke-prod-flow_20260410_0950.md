# Exec Plan: python-launch-check-smoke-prod-flow_20260410_0950

## 目的

`python/night_batch.py` に、以下の **単一路線の Python オーケストレーション**を追加・整理する。

1. startup check
2. 未起動なら現在の検証済み手段で launch
3. connectivity check
4. smoke backtest
5. production backtest（**smoke の次に 1 回だけ**）
6. result output

あわせて、現在の検証済み前提を docs に反映する。

- 起動確認は最初に行う
- TradingView が未起動なら  
  `C:\TradingView\TradingView.exe - ショートカット.lnk`  
  で起動できる
- 現在の既知正常経路は **Windows local `9222` / WSL `172.31.144.1:9223`**
- 直近の runtime 検証では shortcut launch が成功し、`backtest nvda-ma` の smoke も 1 回成功済み

## 先行計画との関係

- `docs/exec-plans/completed/shortcut-launch-one-backtest-smoke_20260410_0920.md` は **完了済みの事前検証計画**
- 本計画はその結果を前提に、**手動確認済みフローを Python 実装へ昇格**する
- `docs/exec-plans/active/` に同趣旨の active plan は現時点で存在しない

## 対象範囲

- startup check の明文化と実装
- 未起動時の shortcut launch 導線の実装
- launch 後の CDP / connectivity check
- smoke backtest → production backtest 1 回、の順序固定
- 実行結果の標準出力 / ログ / 終了コード / summary 整理
- README / command reference の運用前提更新
- 既存 `night_batch.py` テストの拡張

## 対象外

- bundle / campaign / nightly の大規模 full-run 再設計
- 複数銘柄・複数 preset・campaign orchestration への拡張
- dual-worker / parallel / shard / recovery 最適化
- Windows portproxy 自体の自動修復
- Apple login / onboarding 自動化
- shortcut ファイルそのものの再生成・修正
- production backtest の複数回実行や bundle / campaign 化
- 新規 lint / test framework 導入

## 変更対象ファイル

### 変更

- `README.md`
- `command.md`
- `python/night_batch.py`
- `tests/night-batch.test.js`

### 作成候補

- なしを基本とする  
  ただし `python/night_batch.py` が肥大化する場合のみ、既存構成に沿って Python 側補助モジュールを `python/` 配下へ小さく分離することを許容する

### 削除

- なし

### 備考

- `package.json` は **既存の test script で十分なら変更しない**
- 実行ログ / 結果は既存の `results/night-batch/` 配下運用を優先する

## 実装方針

### ドキュメント

- README に「まず起動確認、未起動なら shortcut launch、次に `9223` 疎通確認」という運用順を追加
- `command.md` に現時点の verified launch method と startup-first の手順を追加
- smoke のあとに production backtest を **1 回だけ**走らせる方針を明記
- 「production backtest」は bundle / campaign full-run ではないことを明記

### Python 実装

- `night_batch.py` に新しい単一路線コマンド、または既存サブコマンド拡張を追加し、以下を実装する
  - TradingView 起動状態確認
  - 未起動時 shortcut launch
  - launch 後の待機と connectivity check
  - smoke backtest 実行
  - production backtest 1 回実行
  - 結果 summary 出力
- 既存の `bundle` / `campaign` / `recover` / `report` / `nightly` 互換を壊さない
- エラー時は段階ごとに失敗箇所が分かる result shape / log を優先する
- Windows 依存の launch は、WSL 側で失敗理由を読める形で扱う

## TDD 計画

### RED

- `tests/night-batch.test.js` に以下の失敗テストを追加
  - startup check で既に到達可能なら launch しない
  - startup check 失敗時に launch path が呼ばれる
  - launch 後に connectivity check が再実行される
  - smoke 成功後に production backtest が **1 回だけ**実行される
  - smoke 失敗時は production backtest に進まない
  - result output に各段階の成否が含まれる
- docs 要件に対応する文言差分も RED の受け皿として整理する

### GREEN

- 最小限の分岐追加でテストを通す
- shortcut launch・接続確認・2段階 backtest・結果出力の最短経路を実装する
- 既存サブコマンドの挙動を維持する

### REFACTOR

- stage ごとの責務を関数分割し、`night_batch.py` の見通しを改善する
- result shape / logging / timeout handling を整理する
- ドキュメントの重複記述を最小化し、README と `command.md` の責務を揃える

## Validation commands

### 既存自動テスト

```bash
node --test tests/night-batch.test.js
npm test
```

### 実装確認用 dry-run / 局所確認

```bash
python3 python/night_batch.py --help
python3 python/night_batch.py <new-flow-subcommand> --dry-run
```

### 既存接続確認

```bash
curl -sS http://172.31.144.1:9223/json/version
curl -sS http://172.31.144.1:9223/json/list
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js status
```

### 既存 backtest 確認

```bash
TV_CDP_HOST=172.31.144.1 TV_CDP_PORT=9223 node src/cli/index.js backtest nvda-ma
```

### 本番フロー確認

```bash
python3 python/night_batch.py <new-flow-subcommand>
```

## リスク

- shortcut launch は runtime では成功済みだが、Python からの起動で quoting / shell 差異が出る可能性
- `9222` は生きても `9223` 側到達が崩れると WSL フローが失敗する
- `status` 成功と backtest 成功は同値でないため、smoke 失敗時の停止条件が重要
- production backtest を 1 回に限定しても、TradingView UI 状態差分で不安定になる可能性
- テストでは Windows shortcut launch を直接叩けないため、起動処理の抽象化が不十分だとテストしにくい
- `night_batch.py` に機能を足しすぎると責務過多になる

## 成功条件

- docs に startup-first / shortcut launch / `9222`-`9223` 前提が反映される
- Python から desired flow を一貫実行できる
- smoke → production backtest 1 回、の順序が明確に保証される
- smoke 失敗時に production へ進まない
- 既存テストと新規テストが通る
- runtime で少なくとも 1 回、実フローの起動・疎通・smoke・production・result output を確認できる

## 実装ステップ

- [ ] `shortcut-launch-one-backtest-smoke_20260410_0920.md` の完了内容を前提として反映点を洗い出す
- [ ] `README.md` に verified launch method と startup-first 運用を追記する
- [ ] `command.md` に shortcut launch / startup check / connectivity check / smoke→production 1 回の手順を追記する
- [ ] `tests/night-batch.test.js` に新フローの RED テストを追加する
- [ ] `python/night_batch.py` に startup check 関数を追加する
- [ ] `python/night_batch.py` に未起動時 shortcut launch 処理を追加する
- [ ] `python/night_batch.py` に launch 後 connectivity check の再確認処理を追加する
- [ ] `python/night_batch.py` に smoke backtest 実行処理を追加する
- [ ] `python/night_batch.py` に production backtest 1 回実行処理を追加する
- [ ] `python/night_batch.py` に結果 summary / exit code / log 出力を整理する
- [ ] `node --test tests/night-batch.test.js` を通す
- [ ] `npm test` を実行して既存回帰がないことを確認する
- [ ] 実 runtime で新フローを 1 回実行し、startup / launch / connectivity / smoke / production / result output を確認する
- [ ] 実行ログと結果を確認し、必要なら REFACTOR で関数分割と出力整形を行う

## 完了時の期待成果

- 「TradingView が動いていなければ shortcut で起動し、その後に smoke と production 1 回を流す」という運用が docs と Python 実装の両方で一致する
- `night_batch.py` が bundle / campaign 用の既存用途とは別に、今回の **単発・実行確認向け high-level flow** を明確に提供できる
- 次の実装フェーズで迷わず着手できる具体的な変更単位・テスト単位・検証単位が揃う
