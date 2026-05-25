# sbi-capture-foreground-before-each-action_20260525_2108

## 概要

目的: SBI portfolio capture で操作が止まりやすい問題に対して、**各操作の直前に対象 Chrome/SBI タブを毎回アクティブ化**するように変更する。

- 対象: `scripts/sbi/capture-portfolio-data.mjs`
- 変更意図: 実機で「自分で Chrome を前面化した瞬間に処理が進む」挙動を減らす
- 制約: SBI capture / parsing / workflow の既存ロジック自体は変えず、前面化ステップだけを追加する

## 変更ファイル

- 追加: `docs/exec-plans/active/sbi-capture-foreground-before-each-action_20260525_2108.md`
- 変更: `scripts/sbi/capture-portfolio-data.mjs`
- 変更: `tests/sbi-capture-workflow.test.js`

## 実装方針

- `activateTarget()` をベースに、CDP `Page.bringToFront()` と必要なら `window.focus()` を含む `ensureSbiTargetActive` helper を追加する
- click / navigate / csv download retry / fallback action の各操作前に helper を通す
- 既存の待機時間・retry 回数・ダウンロード判定ロジックは維持する
- summary / notes に activation 追加の最小ログを残し、実機観測時にどこまで進んだか追いやすくする

## 範囲

### In scope

- 操作直前のタブ前面化 helper 追加
- click / navigate / csv download / fallback 前の activation 差し込み
- 関連ユニットテスト更新

### Out of scope

- SBI workflow の timeout や retry 設定値見直し
- SBI capture ルート選択や CSV 判定ロジック変更
- workflow 手順の変更

## 実装ステップ

- [ ] 操作直前に差し込む最小ポイントを特定する
- [ ] `capture-portfolio-data.mjs` に target activation helper を追加する
- [ ] click / navigate / csv download / fallback 前へ activation を差し込む
- [ ] テストを追加・更新する
- [ ] 対象テストを実行して回帰確認する

## テスト戦略

- RED: SBI capture workflow test に「各操作前の activation 差し込み」契約を追加する
- GREEN: helper と呼び出しを最小実装し、既存テストを維持したまま新規契約を通す
- VERIFY: 必要なら後続で live run を行い、SBI enabled workflow の所要時間や進行性を比較する

## 検証コマンド

- `npm run test:sbi-capture-workflow`
- `npm test`

## リスク・注意点

- CDP target activation を増やしすぎると逆に操作が不安定になる可能性があるため、interactive な操作直前に限定する
- `Page.bringToFront()` は target 状態によって失敗しうるので best-effort にする
- 非同期 helper を複数関数へ差し込むため、既存 call signature の変更範囲を広げすぎないようにする

## 完了条件

- SBI capture 中の click / navigate / download 前に毎回 target activation が走る
- 既存 SBI capture テストが通る
- 新規契約テストで activation 差し込みが固定される
