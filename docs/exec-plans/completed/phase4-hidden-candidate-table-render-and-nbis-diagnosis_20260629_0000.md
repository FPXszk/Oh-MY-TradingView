# Phase4 Hidden Candidate 表示修正とNBIS診断計画

作成日時: 2026-06-29 00:00 JST

## 目的

Phase4 個別銘柄ランキング末尾に追加した Hidden Phase4 Candidate の `-` 行がMarkdown上で表として表示されるように修正する。あわせて、今回の米国株 daily screener 実行で NBIS がレポートに出ていない理由を、現在のスクリーニング結果に基づいて確認する。

## 前提・解釈

- 新しい Phase6 見出しは作らない。
- Phase4本体の順位・並び順・対象銘柄は変更しない。
- Hidden Phase4 Candidate は、Phase4表直下の注釈後に、Phase4と同じ列構成のMarkdown表として表示する。
- Markdown仕様上、注釈と空行を挟むと直前の表には連結できないため、候補部分には同じヘッダー行と区切り行を再掲する。
- NBIS診断はハードコードの救済実装ではなく、今回の実行結果でどの条件により表から外れたかを調べて説明する。

## 変更予定ファイル

- `scripts/screener/run-fundamental-screening.mjs`
  - Phase4表ヘッダー生成を小さなヘルパーに切り出し、Hidden候補側にも同じヘッダーを出す。
  - Hidden候補行の列構成は既存Phase4行と同一に保つ。
- `tests/daily-screener-report.test.js`
  - Hidden候補注釈後にPhase4と同じヘッダー・区切り行が出ることを検証する。
  - Phase6見出しが出ないこと、候補0件では注釈も候補表も出ないことを維持する。
- `docs/reports/screener/daily-ranking.md`
  - レポート再生成結果として確認・更新する。
- `docs/exec-plans/active/phase4-hidden-candidate-table-render-and-nbis-diagnosis_20260629_0000.md`
  - 実装完了時に `docs/exec-plans/completed/` へ移動する。

## 影響範囲

- 米国株 daily screener のPhase4末尾表示だけに影響する。
- Phase4本体、Phase5本体、候補抽出条件、Japan screener は変更しない。
- NBIS診断は説明用の確認であり、NBISを強制表示する変更はしない。

## 実装ステップ

- [x] 現在のPhase4 Hidden候補表示とNBISのレポート不在を確認する。
- [x] Hidden候補用にPhase4と同じMarkdown表ヘッダーを出す実装へ修正する。
- [x] daily screener reportテストを追加・更新する。
- [x] NBISが今回の実行結果でPhase4/Phase5/候補にいない理由を診断する。
- [x] `npm run test:unit` を実行して回帰を確認する。
- [x] `git diff --check` を実行して空白エラーを確認する。
- [x] `node scripts/screener/run-fundamental-screening.mjs` を実行して `docs/reports/screener/daily-ranking.md` を再生成する。
- [x] 生成レポートでHidden候補が表として表示されること、Phase5維持、Phase6不在を確認する。
- [x] 計画を `docs/exec-plans/completed/` へ移動し、実装変更を Conventional Commit でコミット・プッシュする。

## 検証コマンド

```powershell
npm run test:unit
git diff --check
node scripts/screener/run-fundamental-screening.mjs
```

## リスクと注意点

- 注釈を表内に入れると列数が崩れるため、注釈後に同一ヘッダーの追記表を置く。
- Hidden候補の抽出条件やPhase4本体のランキングには触れない。
- NBISは当日のTradingView scanner結果やPhase1/Phase5母集団に依存するため、過去に出ていた事実と今回出ない事実を混同しない。
