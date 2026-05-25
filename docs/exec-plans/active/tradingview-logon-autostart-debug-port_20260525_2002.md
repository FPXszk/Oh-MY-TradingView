# tradingview-logon-autostart-debug-port_20260525_2002

## 概要

目的: self-hosted runner の Windows ログオン時 autostart launcher に TradingView Desktop 起動を追加し、night batch workflow の `Ensure TradingView is running` で使っている起動優先順を参考に、debug port 付きで即アクセス可能な状態へ寄せる。

- 対象: runner autostart launcher 生成処理、関連テスト、README 運用手順
- 前提: TradingView は Windows 側で `startup_check_port` の既定 `9222` を使う
- 既存責務: runner 起動は `bootstrap -> run.cmd` のまま維持し、OpenD best-effort 起動も残す

## 変更ファイル

- 追加: `docs/exec-plans/active/tradingview-logon-autostart-debug-port_20260525_2002.md`
- 変更: `scripts/windows/register-self-hosted-runner-autostart.cmd`
- 変更: `tests/windows-run-night-batch-self-hosted.test.js`
- 変更: `README.md`

## 実装方針

- autostart launcher の中で、OpenD 起動の後・runner wrapper 呼び出しの前に TradingView 起動ブロックを追加する
- TradingView 起動ブロックは workflow と同じ思想で、まず Windows local `127.0.0.1:9222/json/list` を確認し、TradingView chart target が見えるなら再起動しない
- 未起動時は `C:\TradingView\TradingView.exe - ショートカット.lnk` を既定候補として使い、見つからなければ同ディレクトリ内の `TradingView*.lnk` を探索し、それも無ければ `%LOCALAPPDATA%\TradingView\TradingView.exe --remote-debugging-port=9222` で直接起動する
- launcher は ASCII-only / CRLF 前提を崩さず、`schtasks` 向けの quoting 安全性を維持する
- workflow 側の起動責務は残すが、ログオン直後から CDP endpoint が立つようにしてアクセス待ち時間を減らす

## 範囲

### In scope

- ONLOGON launcher への TradingView best-effort autostart 追加
- debug port 付き direct exe fallback の追加
- 既存 runner autostart テストの拡張
- README の autostart / CDP 起動説明更新

### Out of scope

- `night-batch-self-hosted.yml` 自体の起動順変更
- OpenD / TradingView の自動ログインや UI 操作
- `startup_check_port` の config-driven 化
- Windows portproxy / firewall 設定変更

## 実装ステップ

- [ ] autostart launcher の TradingView 起動要件を workflow / README / 既存テストから整理する
- [ ] `register-self-hosted-runner-autostart.cmd` に TradingView readiness check と起動 fallback を追加する
- [ ] `tests/windows-run-night-batch-self-hosted.test.js` に TradingView autostart 契約を追加する
- [ ] README の autostart 説明を更新し、OpenD と TradingView の起動順・debug port を明記する
- [ ] 対象テストを実行して回帰を確認する

## テスト戦略

- RED: autostart script test に TradingView readiness check / fallback / debug port 引数の期待値を追加し、現状 fail させる
- GREEN: launcher 生成内容を最小変更で実装し、OpenD -> TradingView -> runner wrapper の順を固定する
- REFACTOR: launcher 内の quoting とログ文言を整えつつ、ASCII-only 制約と self-contained copy 方針を維持する

## 検証コマンド

- `node --test tests/windows-run-night-batch-self-hosted.test.js`
- `npm test`

## リスク・注意点

- `.cmd` 生成行の escape を崩すと `schtasks` 実行や launcher 自体が壊れる
- shortcut 経由起動では debug port 引数を追加できないため、shortcut が remote debugging 前提でない環境では direct exe fallback まで到達しない可能性がある
- ログオン時と workflow 実行時の両方で TradingView 起動判定が走るため、local `9222` readiness 判定は冪等である必要がある
- autostart launcher は live checkout 非依存コピーなので、repo 側更新後に再登録または再生成しないと古い launcher が残る

## 完了条件

- ログオン時 launcher が OpenD の後に TradingView local `9222` readiness を確認する
- TradingView 未起動時に shortcut または direct exe fallback で起動を試みる
- direct exe fallback では `--remote-debugging-port=9222` を付ける
- runner wrapper 呼び出し前に TradingView 起動処理が入ることをテストで固定する
- README に現在の autostart 挙動が反映される
