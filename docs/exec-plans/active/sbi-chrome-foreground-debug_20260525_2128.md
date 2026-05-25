# sbi-chrome-foreground-debug_20260525_2128

## 概要

目的: SBI capture が止まる原因として疑わしい「Chrome ウィンドウ自体の前面化不足」を切り分け、**Windows 実機で前面化できる方法をまず単体で保証**したうえで SBI capture workflow に組み込む。

- 対象: `scripts/sbi/capture-portfolio-data.mjs`
- 追加候補: `scripts/windows/focus-chrome-window.ps1`
- テスト候補: `tests/sbi-capture-workflow.test.js`
- workflow 候補: `.github/workflows/portfolio-health-check.yml`

## 変更ファイル

- 追加: `docs/exec-plans/active/sbi-chrome-foreground-debug_20260525_2128.md`
- 追加候補: `scripts/windows/focus-chrome-window.ps1`
- 変更候補: `scripts/sbi/capture-portfolio-data.mjs`
- 変更候補: `tests/sbi-capture-workflow.test.js`
- 変更候補: `.github/workflows/portfolio-health-check.yml`

## 実装方針

- まず Windows 側で Chrome ウィンドウを前面化する専用 helper を用意し、`AppActivate` / `SetForegroundWindow` / 復元処理を含めて単体で実機確認する
- helper が効くことを確認できたら、SBI capture の interactive 操作直前で helper を呼び出す
- workflow から実行される実コード経路に組み込み、最後に `enable_sbi=true` の live run で再確認する
- SBI capture の既存 route / CSV / parsing ロジックは変えず、前面化経路だけを対象にする

## 範囲

### In scope

- Chrome 前面化 helper の追加と単体デバッグ
- SBI capture 実コードからの helper 呼び出し
- 必要最小限の workflow 接続
- 関連テスト更新
- live run による再検証

### Out of scope

- SBI CSV 判定ロジックの変更
- SBI route 選択や retry 設定値の見直し
- moomoo 側の処理変更

## 実装ステップ

- [ ] Windows 実機で使える Chrome 前面化手段を単体で確認する
- [ ] 前面化 helper を repo に追加する
- [ ] SBI capture から helper を呼ぶ最小接続を入れる
- [ ] 必要なら workflow 側へ明示的な接続を追加する
- [ ] テストを追加・更新する
- [ ] 実機 workflow を `enable_sbi=true` で再実行して確認する

## テスト戦略

- RED: helper 呼び出し契約をテストへ追加する
- GREEN: Windows helper と capture 接続を最小実装する
- VERIFY: helper 単体実行で前面化確認後、`Portfolio Health Check` を live run する

## 検証コマンド

- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/windows/focus-chrome-window.ps1`
- `npm run test:sbi-capture-workflow`
- `npm test`
- `gh workflow run portfolio-health-check.yml -f enable_sbi=true`

## リスク・注意点

- Windows の foreground 制御はセッション状態や最小化状態の影響を受ける
- CDP target activation と OS window activation は別物なので、片方だけ成功しても十分ではない
- workflow 実行中の self-hosted runner セッションに対して有効な方式でないと意味がないため、単体デバッグを省略しない

## 完了条件

- Windows 実機で Chrome ウィンドウの前面化が確認できる
- SBI capture の各操作前でその前面化経路が呼ばれる
- `enable_sbi=true` の live workflow が前面化込みで成功する
